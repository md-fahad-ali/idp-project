import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight'
import * as lowlight from 'lowlight'
import 'highlight.js/styles/github-dark.css' // Choose your preferred theme

export const CustomCodeBlock = CodeBlockLowlight.configure({
  lowlight
})
