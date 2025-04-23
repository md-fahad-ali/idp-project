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
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight } from 'lowlight';
import 'highlight.js/styles/atom-one-dark.css';
import js from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import java from 'highlight.js/lib/languages/java';
import css from 'highlight.js/lib/languages/css';
import html from 'highlight.js/lib/languages/xml';
import typescript from 'highlight.js/lib/languages/typescript';
import json from 'highlight.js/lib/languages/json';
import bash from 'highlight.js/lib/languages/bash';

// Create a custom lowlight instance
const lowlight = createLowlight(common);

// Only register languages on the client side
if (typeof window !== 'undefined') {
  // Register languages
  lowlight.register('javascript', js);
  lowlight.register('js', js);
  lowlight.register('python', python);
  lowlight.register('py', python);
  lowlight.register('java', java);
  lowlight.register('css', css);
  lowlight.register('html', html);
  lowlight.register('typescript', typescript);
  lowlight.register('ts', typescript);
  lowlight.register('json', json);
  lowlight.register('bash', bash);
  lowlight.register('sh', bash);
}

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
  const [imageWidth, setImageWidth] = useState(300);
  const [imageHeight, setImageHeight] = useState(200);

  // Memoize editor configuration
  const editorConfig = useMemo(() => ({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
          HTMLAttributes: {
            class: 'prose-headings:font-bold prose-h1:text-3xl prose-h1:mt-6 prose-h1:mb-4 prose-h2:text-2xl prose-h2:mt-5 prose-h2:mb-3 prose-h3:text-xl prose-h3:mt-4 prose-h3:mb-2 prose-h4:text-lg prose-h4:mt-3 prose-h4:mb-2 prose-h5:text-base prose-h5:mt-3 prose-h5:mb-1 prose-h6:text-sm prose-h6:mt-3 prose-h6:mb-1 text-black',
          },
        },
        bulletList: {
          keepMarks: true,
          keepAttributes: true,
          HTMLAttributes: {
            class: 'list-disc ml-2 text-black',
          },
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: true,
          HTMLAttributes: {
            class: 'list-decimal ml-2 text-black',
          },
        },
        blockquote: {
          HTMLAttributes: {
            class: 'pl-4 border-l-4 border-gray-500 italic my-4 bg-gray-200 text-black p-2 rounded-r',
          },
        },
        horizontalRule: false,
        codeBlock: false,
        code: {
          HTMLAttributes: {
            class: 'bg-gray-800 text-white px-1 rounded font-mono',
          },
        },
        paragraph: {
          HTMLAttributes: {
            class: 'text-black my-2',
          },
        },
      }),
      CodeBlockLowlight.configure({
        lowlight,
        defaultLanguage: 'javascript',
        HTMLAttributes: {
          class: 'bg-gray-900 border-4 border-black shadow-[8px_8px_0px_0px_black] text-white p-4 rounded-md font-mono overflow-auto my-4 not-prose',
        },
      }),
      Underline,
      Link.configure({ 
        openOnClick: true,
        HTMLAttributes: {
          class: 'text-blue-600 underline',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto',
        },
      }),
      Highlight,
    ],
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[200px] text-black bg-[#e9e9e9] p-4 rounded',
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
    content: content || `<div class="text-black">${title} - ${category}</div>`,
    immediatelyRender: false,
  }), [title, category, content]);

  // Initialize editor first
  const editor = useEditor(editorConfig);

  // When an image is selected, get its current dimensions
  useEffect(() => {
    if (!editor) return;
    
    if (editor.isActive('image')) {
      const imageAttrs = editor.getAttributes('image');
      if (imageAttrs.style) {
        // Extract width and height from style attribute if available
        const widthMatch = imageAttrs.style.match(/width:\s*(\d+)px/);
        const heightMatch = imageAttrs.style.match(/height:\s*(\d+)px/);
        
        if (widthMatch && widthMatch[1]) {
          setImageWidth(parseInt(widthMatch[1]));
        }
        if (heightMatch && heightMatch[1]) {
          setImageHeight(parseInt(heightMatch[1]));
        }
      }
    }
  }, [editor]);

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
        const languages = [
          'javascript',
          'python',
          'java',
          'css',
          'html',
          'typescript',
          'json',
          'bash',
          'plaintext'
        ];
        
        // Create language options for the dialog
        const languageOptions = languages.map(lang => 
          `<option value="${lang}"${lang === 'javascript' ? ' selected' : ''}>${lang}</option>`
        ).join('');
        
        // Create custom dialog for language selection
        const dialog = document.createElement('div');
        dialog.innerHTML = `
          <div class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
            <div class="bg-[#294268] border-4 border-black rounded-lg p-6 shadow-[8px_8px_0px_0px_#000000] w-96">
              <h3 class="text-xl font-bold text-[#E6F1FF] mb-4 font-mono">Insert Code Block</h3>
              <div class="mb-4">
                <label class="block text-sm font-medium text-[#8892B0] mb-2">
                  Select Language
                </label>
                <select id="language-select" class="w-full p-2 bg-[#2A3A4A] text-[#E6F1FF] border-2 border-black rounded">
                  ${languageOptions}
                </select>
              </div>
              <div class="flex space-x-4">
                <button id="dialog-cancel" class="flex-1 p-2 text-white bg-[#666666] border-2 border-black rounded-md shadow-[2px_2px_0px_0px_#000000]">
                  Cancel
                </button>
                <button id="dialog-confirm" class="flex-1 p-2 text-white bg-[#9D4EDD] border-2 border-black rounded-md shadow-[2px_2px_0px_0px_#000000]">
                  Insert
                </button>
              </div>
            </div>
          </div>
        `;
        
        document.body.appendChild(dialog);
        
        const selectElement = dialog.querySelector('#language-select') as HTMLSelectElement;
        const cancelButton = dialog.querySelector('#dialog-cancel');
        const confirmButton = dialog.querySelector('#dialog-confirm');
        
        cancelButton?.addEventListener('click', () => {
          document.body.removeChild(dialog);
        });
        
        confirmButton?.addEventListener('click', () => {
          const language = selectElement?.value || 'javascript';
          editor.chain().focus().toggleCodeBlock({ language }).run();
          document.body.removeChild(dialog);
        });
        
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
      <div className="relative border-2 border-black rounded-md overflow-hidden bg-[#e9e9e9] text-black">
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
              appendTo: () => document.body,
            }}
            shouldShow={({ editor }) => editor.isActive('image')}
          >
            <div className="flex flex-col gap-2 bg-[#e0e0e0] border-2 border-black shadow-[4px_4px_0px_0px_black] p-4 rounded-none min-w-[300px]">
              <h3 className="text-sm font-bold mb-2">Resize Image</h3>
              
              <div className="mb-2">
                <div className="flex justify-between mb-1">
                  <span>Width: {imageWidth}px</span>
                  <button 
                    onClick={() => {
                      editor.chain().focus().updateAttributes('image', { 
                        style: `width: 100%; height: auto;` 
                      }).run();
                      setImageWidth(100);
                    }}
                    className="text-xs bg-[#c0c0c0] px-1 border border-black"
                  >
                    Full Width
                  </button>
                </div>
                <input
                  type="range"
                  min="50"
                  max="800"
                  value={imageWidth}
                  onChange={(e) => {
                    const newWidth = parseInt(e.target.value);
                    setImageWidth(newWidth);
                    editor.chain().focus().updateAttributes('image', { 
                      style: `width: ${newWidth}px; height: ${imageHeight}px` 
                    }).run();
                  }}
                  className="w-full bg-[#a0a0a0] appearance-none h-2 rounded-none"
                />
              </div>
              
              <div className="mb-2">
                <div className="flex justify-between mb-1">
                  <span>Height: {imageHeight}px</span>
                  <button 
                    onClick={() => {
                      editor.chain().focus().updateAttributes('image', { 
                        style: `width: ${imageWidth}px; height: auto;` 
                      }).run();
                      setImageHeight(0);
                    }}
                    className="text-xs bg-[#c0c0c0] px-1 border border-black"
                  >
                    Auto Height
                  </button>
                </div>
                <input
                  type="range"
                  min="50"
                  max="600"
                  value={imageHeight}
                  onChange={(e) => {
                    const newHeight = parseInt(e.target.value);
                    setImageHeight(newHeight);
                    editor.chain().focus().updateAttributes('image', { 
                      style: `width: ${imageWidth}px; height: ${newHeight}px` 
                    }).run();
                  }}
                  className="w-full bg-[#a0a0a0] appearance-none h-2 rounded-none"
                />
              </div>
              
              <div className="flex justify-between gap-2">
                <button
                  onClick={() => {
                    editor.chain().focus().updateAttributes('image', { 
                      style: `width: ${imageWidth}px; height: ${imageHeight}px` 
                    }).run();
                  }}
                  className="flex-1 px-2 py-1 border-2 border-black shadow-[2px_2px_0px_0px_black] text-black bg-[#c0c0c0] hover:bg-[#a0a0a0]"
                >
                  Apply
                </button>
                <button
                  onClick={() => editor.chain().focus().deleteSelection().run()}
                  className="flex-1 px-2 py-1 border-2 border-black shadow-[2px_2px_0px_0px_black] text-black bg-[#ff9999] hover:bg-[#ff7777]"
                >
                  Remove
                </button>
              </div>
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
                <div className="absolute left-0 top-full mt-2 bg-[#656363] border-2 border-black shadow-[4px_4px_0px_0px_black] rounded-none z-50 w-[200px]">
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
        <div className="sticky top-0 z-10 flex justify-between items-center p-2 border-b border-[#b0b0b0] bg-[#d1d1d1]">
          <div className="flex space-x-1">
            {/* ...existing toolbar buttons... */}
          </div>
        </div>
        
        <div className="prose prose-sm max-w-none text-black p-4 pb-20">
          <EditorContent editor={editor} className="text-black" />
        </div>
      </div>
    </EditorErrorBoundary>
  );
};

export default Tiptap;