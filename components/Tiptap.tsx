"use client";

import { useEditor, EditorContent, BubbleMenu, FloatingMenu } from '@tiptap/react';
import { EditorView } from '@tiptap/pm/view';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Highlight from '@tiptap/extension-highlight';
import React, { useEffect, useState, useMemo, useCallback } from "react";
// import { generateHTML } from '@tiptap/core'


import { Plus } from 'lucide-react';
import { useSearchParams } from 'next/navigation';



// Error boundary component
class EditorErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 border-2 border-red-500 rounded">
          <p>Something went wrong with the editor. Please refresh the page.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

interface TiptapProps {
  content?: string;
  onChange?: (content: string) => void;
}

const Tiptap = ({ content = '', onChange }: TiptapProps) => {
  const searchParams = useSearchParams();
  const title = searchParams.get('title') || 'Default Title';
  const category = searchParams.get('category') || 'Default Category';
  const [showInsertMenu, setShowInsertMenu] = useState(false);

  // Memoize editor configuration
  const editorConfig = useMemo(() => ({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
          HTMLAttributes: {
            class: 'prose-headings:font-bold prose-h1:text-3xl prose-h1:mt-6 prose-h1:mb-4 prose-h2:text-2xl prose-h2:mt-5 prose-h2:mb-3 prose-h3:text-xl prose-h3:mt-4 prose-h3:mb-2 prose-h4:text-lg prose-h4:mt-3 prose-h4:mb-2 prose-h5:text-base prose-h5:mt-3 prose-h5:mb-1 prose-h6:text-sm prose-h6:mt-3 prose-h6:mb-1',
          },
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: true,
          HTMLAttributes: {
            class: 'list-disc ml-2',
          },
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: true,
          HTMLAttributes: {
            class: 'list-decimal ml-2',
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: 'pl-4 border-l-4 border-gray-500 italic my-4 bg-gray-100 p-2 rounded-r',
          },
        },
        horizontalRule: false,
        codeBlock: {
            // keepAttributes:true,
          HTMLAttributes: {
            class: 'bg-gray-700 border-4 border-black shadow-[8px_8px_0px_0px_black] text-white p-4 rounded-md font-mono overflow-auto',
          },
        },
        code: {
        //    keepAttributes:true,
          HTMLAttributes: {
            class: 'bg-gray-800 text-white px-1 rounded font-mono',
          },
        },
      }),
      Underline,
      Link.configure({ openOnClick: true }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto',
        },
      }),
      Highlight,
     
    ],
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[200px]',
      },
      handleDrop: () => false, // Disable drag and drop to prevent memory leaks
      handlePaste: (view: EditorView, event: ClipboardEvent) => {
        // Handle only text content on paste
        const text = event.clipboardData?.getData('text/plain');
        if (text) {
          view.dispatch(view.state.tr.insertText(text));
          return true;
        }
        return false;
      },
    },
    content: content || `<div>${title} - ${category}</div>`,
    immediatelyRender:false,
  }), [title, category, content]);

  const editor = useEditor(editorConfig);

  // Memoize content update handler
  const handleUpdate = useCallback(
    (updatedContent: string) => {
      if (onChange) {
        onChange(updatedContent);
      }
    },
    [onChange]
  );

  // Update content when title or category changes
  useEffect(() => {
    if (editor && (title || category)) {
      const newContent = content || `<p>${title} - ${category}</p>`;
      if (editor.getHTML() !== newContent) {
        editor.commands.setContent(newContent);
      }
    }
  }, [title, category, editor, content]);

  // Update parent when content changes
  useEffect(() => {
    if (!editor || !onChange) return;

    const updateContent = () => {
      const html = editor.getHTML();
    //   console.log(editor.getJSON())


    //   const htmlOutput = generateHTML(editor.getJSON(), [StarterKit])
    //   console.log('Generated HTML:', htmlOutput) // Output the HTML
      handleUpdate(html);
    };

    editor.on('update', updateContent);
    return () => {
      editor.off('update', updateContent);
    };
  }, [editor, handleUpdate, onChange]);

  // Memoize insert handler
  const handleInsert = useCallback((type: string) => {
    if (!editor) return;

    switch (type) {
      case 'codeBlock': {
        const language = prompt('Enter the language for syntax highlighting (e.g., javascript, python):', 'javascript');
        if (language) {
          editor.chain().focus().toggleCodeBlock({ language }).run();
        }
        break;
      }
      case 'image': {
        const imageUrl = prompt('Enter the image URL:');
        if (imageUrl) {
          editor.chain().focus().setImage({ src: imageUrl }).run();
        }
        break;
      }
      default:
        break;
    }
    setShowInsertMenu(false);
  }, [editor]);



  return (
    <EditorErrorBoundary>
      <div className="relative">
        {editor && (
          <BubbleMenu
            editor={editor}
            tippyOptions={{
              duration: 100,
              placement: 'top',
              offset: [0, 10],
              zIndex: 999,
              appendTo: () => document.body, // Render in body to avoid clipping
            }}
            shouldShow={({ state }) => {
              const { selection } = state;
              const { empty } = selection;
              // Show bubble menu if there's a non-empty selection or if a table is selected
              return !empty || editor.isActive('table');
            }}
          >
            <div className="flex flex-wrap gap-2 bg-[#e0e0e0] border-2 border-black shadow-[4px_4px_0px_0px_black] p-2 rounded-none">
              {/* Existing formatting buttons */}
              <button
                onClick={() => editor.chain().focus().toggleBold().run()}
                className={`px-2 py-1 border-2 border-black shadow-[2px_2px_0px_0px_black] text-black ${editor.isActive('bold') ? 'bg-[#808080] text-white' : 'bg-[#c0c0c0]'}`}
              >
                Bold
              </button>
              <button
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className={`px-2 py-1 border-2 border-black shadow-[2px_2px_0px_0px_black] text-black ${editor.isActive('italic') ? 'bg-[#808080] text-white' : 'bg-[#c0c0c0]'}`}
              >
                Italic
              </button>
              <button
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className={`px-2 py-1 border-2 border-black shadow-[2px_2px_0px_0px_black] text-black ${editor.isActive('underline') ? 'bg-[#808080] text-white' : 'bg-[#c0c0c0]'}`}
              >
                Underline
              </button>
              <button
                onClick={() => editor.chain().focus().setParagraph().run()}
                className={`px-2 py-1 border-2 border-black shadow-[2px_2px_0px_0px_black] text-black ${editor.isActive('paragraph') ? 'bg-[#808080] text-white' : 'bg-[#c0c0c0]'}`}
              >
                Paragraph
              </button>
              <button
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className={`px-2 py-1 border-2 border-black shadow-[2px_2px_0px_0px_black] text-black ${editor.isActive('bulletList') ? 'bg-[#808080] text-white' : 'bg-[#c0c0c0]'}`}
              >
                Bullet List
              </button>
              <button
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className={`px-2 py-1 border-2 border-black shadow-[2px_2px_0px_0px_black] text-black ${editor.isActive('orderedList') ? 'bg-[#808080] text-white' : 'bg-[#c0c0c0]'}`}
              >
                Ordered List
              </button>
              <button
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                className={`px-2 py-1 border-2 border-black shadow-[2px_2px_0px_0px_black] text-black ${editor.isActive('blockquote') ? 'bg-[#808080] text-white' : 'bg-[#c0c0c0]'}`}
              >
                Blockquote
              </button>
              <button
                onClick={() => editor.chain().focus().toggleCode().run()}
                className={`px-2 py-1 border-2 border-black shadow-[2px_2px_0px_0px_black] text-black ${editor.isActive('code') ? 'bg-[#808080] text-white' : 'bg-[#c0c0c0]'}`}
              >
                Inline Code
              </button>
              <button
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                className={`px-2 py-1 border-2 border-black shadow-[2px_2px_0px_0px_black] text-black ${editor.isActive('codeBlock') ? 'bg-[#808080] text-white' : 'bg-[#c0c0c0]'}`}
              >
                Code Block
              </button>
            </div>
          </BubbleMenu>
        )}
        {editor && (
          <BubbleMenu
            editor={editor}
            tippyOptions={{
              duration: 100,
              placement: 'top',
              offset: [0, 10],
              zIndex: 999,
              appendTo: () => document.body, // Ensure it renders outside container
            }}
            shouldShow={({ editor }) => editor.isActive('image')}
          >
            <div className="flex flex-wrap gap-2 bg-gray-200 border border-gray-400 shadow-md p-2 rounded-md">
              <button
                onClick={() => {
                  const newWidth = prompt('Enter new width (e.g., 300px or 50%):', '300px');
                  if (newWidth) {
                    editor.chain().focus().updateAttributes('image', { style: `width: ${newWidth};` }).run();
                  }
                }}
                className="px-2 py-1 border border-gray-400 shadow-sm text-black bg-gray-300 hover:bg-gray-400"
              >
                Resize Width
              </button>
              <button
                onClick={() => {
                  const newHeight = prompt('Enter new height (e.g., 200px or auto):', 'auto');
                  if (newHeight) {
                    editor.chain().focus().updateAttributes('image', { style: `height: ${newHeight};` }).run();
                  }
                }}
                className="px-2 py-1 border border-gray-400 shadow-sm text-black bg-gray-300 hover:bg-gray-400"
              >
                Resize Height
              </button>
              <button
                onClick={() => editor.chain().focus().deleteSelection().run()}
                className="px-2 py-1 border border-gray-400 shadow-sm text-black bg-red-300 hover:bg-red-400"
              >
                Remove Image
              </button>
            </div>
          </BubbleMenu>
        )}
        {editor && (
          <FloatingMenu
            editor={editor}
            tippyOptions={{
              duration: 100,
              placement: 'left',
              offset: [-50, 0],
              zIndex: 9999,
              appendTo: () => document.body, // Render in body to avoid clipping
            }}
            shouldShow={({ state }) => {
              const { selection } = state;
              const { empty, $anchor } = selection;
              const isEmptyTextBlock = $anchor.parent.type.name === 'paragraph' && $anchor.parent.content.size === 0;
              return empty && isEmptyTextBlock;
            }}
          >
            <div className="bg-[#e0e0e0] border-2 border-black shadow-[4px_4px_0px_0px_black] mt-[100px] rounded-none p-1 min-w-[auto]">
              <button
                className="w-8 h-8 flex items-center justify-center bg-[#c0c0c0] border-2 border-black shadow-[2px_2px_0px_0px_black] text-black hover:bg-[#a0a0a0]"
                onClick={() => setShowInsertMenu(!showInsertMenu)}
                aria-label="Toggle insert menu"
              >
                <Plus className="w-5 h-5" />
              </button>
              {showInsertMenu && (
                <div className="absolute left-0 top-full mt-2 bg-[#e0e0e0] border-2 border-black shadow-[4px_4px_0px_0px_black] rounded-none z-50 w-[200px]">
                  <div className="grid grid-cols-1 gap-1">
                    <button
                      className="flex items-center gap-2 px-4 py-2 text-sm text-black hover:bg-[#c0c0c0]"
                      onClick={() => {
                        editor.chain().focus().toggleHeading({ level: 1 }).run();
                        setShowInsertMenu(false);
                      }}
                    >
                      <span className="font-bold">H1</span>
                      <span>Heading 1</span>
                    </button>
                    <button
                      className="flex items-center gap-2 px-4 py-2 text-sm text-black hover:bg-[#c0c0c0]"
                      onClick={() => {
                        editor.chain().focus().toggleHeading({ level: 2 }).run();
                        setShowInsertMenu(false);
                      }}
                    >
                      <span className="font-bold">H2</span>
                      <span>Heading 2</span>
                    </button>
                    <button
                      className="flex items-center gap-2 px-4 py-2 text-sm text-black hover:bg-[#c0c0c0]"
                      onClick={() => {
                        editor.chain().focus().toggleBulletList().run();
                        setShowInsertMenu(false);
                      }}
                    >
                      <span className="font-bold">•</span>
                      <span>Bullet List</span>
                    </button>
                    <button
                      className="flex items-center gap-2 px-4 py-2 text-sm text-black hover:bg-[#c0c0c0]"
                      onClick={() => {
                        editor.chain().focus().toggleOrderedList().run();
                        setShowInsertMenu(false);
                      }}
                    >
                      <span className="font-bold">1.</span>
                      <span>Ordered List</span>
                    </button>
                    <button
                      className="flex items-center gap-2 px-4 py-2 text-sm text-black hover:bg-[#c0c0c0]"
                      onClick={() => handleInsert('image')}
                    >
                      <span className="font-bold">🖼️</span>
                      <span>Insert Image</span>
                    </button>
                    
                  </div>
                </div>
              )}
            </div>
          </FloatingMenu>
        )}
        <EditorContent
          editor={editor}
          className="bg-[#f5f5dc] text-black p-4 border-4 border-black shadow-[8px_8px_0px_0px_black] font-mono overflow-visible"
        />
      </div>
    </EditorErrorBoundary>
  );
};

export default Tiptap;