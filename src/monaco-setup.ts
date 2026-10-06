// Webview CSP forbids the CDN loader @monaco-editor/react uses by default, so Monaco ships in the bundle.
// The worker is inlined (blob:) because webviews cannot start workers from extension resource URLs.
// Only the core editor and basic tokenizers are bundled: the TS/CSS/JSON/HTML language services
// (multi-MB workers) are not needed for diffing.
import * as monaco from 'monaco-editor/editor/editor.api'
import 'monaco-editor/basic-languages/monaco.contribution'
import EditorWorker from 'monaco-editor/editor/editor.worker?worker&inline'
import { loader } from '@monaco-editor/react'

self.MonacoEnvironment = { getWorker: () => new EditorWorker() }
loader.config({ monaco })
