// Type definitions for highlight.js language modules

declare module 'highlight.js/lib/languages/javascript';
declare module 'highlight.js/lib/languages/typescript';
declare module 'highlight.js/lib/languages/xml';
declare module 'highlight.js/lib/languages/css';
declare module 'highlight.js/lib/languages/python';
declare module 'highlight.js/lib/languages/java';
declare module 'highlight.js/lib/languages/php';
declare module 'highlight.js/lib/languages/ruby';
declare module 'highlight.js/lib/languages/json';
declare module 'highlight.js/lib/languages/bash';
declare module 'highlight.js/lib/languages/c';
declare module 'highlight.js/lib/languages/cpp';
declare module 'highlight.js/lib/languages/csharp';
declare module 'highlight.js/lib/languages/sql';

// Type definitions for lowlight
declare module 'lowlight/lib/core' {
  export const lowlight: {
    highlight: (language: string, code: string, options?: any) => any;
    registerLanguage: (name: string, syntax: any) => void;
    listLanguages: () => string[];
  };
}
