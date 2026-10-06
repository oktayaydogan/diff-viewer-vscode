import { useEffect, useRef, useState, type ClipboardEvent } from 'react'
import { DiffEditor, type MonacoDiffEditor } from '@monaco-editor/react'
import { findFileByPath, scanPhpFiles, type ScannedFile } from './lib/projectScan'
import { onPrefill, signalReady, type PrefillMessage } from './lib/host'
import { findFunctionInFiles } from './lib/phpExtract'
import { THEME_NAME, applyTheme, editorFont, watchTheme } from './lib/vscodeTheme'
import './App.css'

const LANGUAGES = [
  'javascript',
  'typescript',
  'php',
  'python',
  'java',
  'csharp',
  'cpp',
  'go',
  'rust',
  'ruby',
  'html',
  'css',
  'json',
  'plaintext',
]

type SymbolType = 'file' | 'function'

const DEFAULT_ORIGINAL = `function add(a, b) {
  return a + b;
}
`

const DEFAULT_MODIFIED = `function add(a, b) {
  // sum two numbers
  return a + b;
}
`

function App() {
  // Refs, not state: avoids feeding keystrokes back into the controlled original/modified props.
  const originalRef = useRef(DEFAULT_ORIGINAL)
  const modifiedRef = useRef(DEFAULT_MODIFIED)
  const diffEditorRef = useRef<MonacoDiffEditor | null>(null)
  const [inline, setInline] = useState(false)
  const [language, setLanguage] = useState('php')

  const [projectFiles, setProjectFiles] = useState<ScannedFile[]>([])
  const [scanning, setScanning] = useState(true)
  const [finding, setFinding] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [symbolType, setSymbolType] = useState<SymbolType>('function')
  const [origValue, setOrigValue] = useState('')
  const [newValue, setNewValue] = useState('')

  function handleSymbolPaste(event: ClipboardEvent<HTMLInputElement>) {
    const parts = event.clipboardData.getData('text/plain').split('->').map((part) => part.trim())
    if (parts.length !== 2 || !parts[0] || !parts[1]) return

    event.preventDefault()
    setOrigValue(parts[0])
    setNewValue(parts[1])
  }

  async function refreshFiles() {
    setScanning(true)
    try {
      const files = await scanPhpFiles()
      setProjectFiles(files)
      return files
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to list workspace files.')
      return []
    } finally {
      setScanning(false)
    }
  }

  async function resolveSymbol(files: ScannedFile[], type: SymbolType, value: string) {
    if (!value.trim()) return null
    return type === 'file'
      ? findFileByPath(files, value)
      : findFunctionInFiles(files, value, language === 'php')
  }

  async function handleFind(
    files = projectFiles,
    type = symbolType,
    oldValue = origValue,
    nextValue = newValue,
  ) {
    setError(null)
    if (files.length === 0) {
      setError('No PHP files found in the workspace.')
      return
    }

    setFinding(true)
    try {
      const [origResult, newResult] = await Promise.all([
        resolveSymbol(files, type, oldValue),
        resolveSymbol(files, type, nextValue),
      ])

      if (!origResult) {
        setError(`Could not find ${type} "${oldValue}" (old).`)
        return
      }
      if (!newResult) {
        setError(`Could not find ${type} "${nextValue}" (new).`)
        return
      }

      originalRef.current = origResult.code
      modifiedRef.current = newResult.code
      diffEditorRef.current?.getOriginalEditor().setValue(origResult.code)
      diffEditorRef.current?.getModifiedEditor().setValue(newResult.code)
      setLanguage('php')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find symbols.')
    } finally {
      setFinding(false)
    }
  }

  // Always points at the latest render so the long-lived prefill listener sees current state.
  const prefillRef = useRef<(message: PrefillMessage) => void>(() => {})
  prefillRef.current = (message) => {
    const oldValue = message.old ?? origValue
    const nextValue = message.new ?? newValue
    setSymbolType(message.symbolType)
    setOrigValue(oldValue)
    setNewValue(nextValue)
    // Compare right away once both sides are known; otherwise wait for the second selection.
    if (oldValue && nextValue) {
      void refreshFiles().then((files) =>
        handleFind(files, message.symbolType, oldValue, nextValue),
      )
    }
  }

  useEffect(() => {
    const dispose = onPrefill((message) => prefillRef.current(message))
    void refreshFiles().then(signalReady)
    return dispose
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [])

  return (
    <div className="app">
      <section className="toolbar">
        <span className="status">
          {scanning ? 'Scanning…' : `${projectFiles.length} PHP file(s) in workspace`}
        </span>

        <label className="field">
          Type
          <select
            value={symbolType}
            onChange={(e) => setSymbolType(e.target.value as SymbolType)}
          >
            <option value="function">Function</option>
            <option value="file">File</option>
          </select>
        </label>

        <label className="field grow">
          Old
          <input
            type="text"
            value={origValue}
            onChange={(e) => setOrigValue(e.target.value)}
            onPaste={handleSymbolPaste}
            placeholder={symbolType === 'file' ? 'path/to/File.php' : 'functionName'}
          />
        </label>

        <label className="field grow">
          New
          <input
            type="text"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            onPaste={handleSymbolPaste}
            placeholder={symbolType === 'file' ? 'path/to/File.php' : 'functionName'}
          />
        </label>

        <button type="button" onClick={() => handleFind()} disabled={finding}>
          {finding ? 'Finding…' : 'Compare'}
        </button>

        <span className="spacer" />

        <label className="field">
          Language
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>
                {lang}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <input
            type="checkbox"
            checked={inline}
            onChange={(e) => setInline(e.target.checked)}
          />
          Inline view
        </label>
      </section>

      {error && <div className="error-banner">{error}</div>}

      <main className="editor-wrap">
        <DiffEditor
          height="100%"
          language={language}
          original={originalRef.current}
          modified={modifiedRef.current}
          theme={THEME_NAME}
          beforeMount={applyTheme}
          options={{
            renderSideBySide: !inline,
            diffAlgorithm: 'advanced',
            originalEditable: true,
            automaticLayout: true,
            ...editorFont(),
          }}
          onMount={(editor, monaco) => {
            watchTheme(() => {
              applyTheme(monaco)
              editor.getOriginalEditor().updateOptions(editorFont())
              editor.getModifiedEditor().updateOptions(editorFont())
            })
            diffEditorRef.current = editor
            const originalEditor = editor.getOriginalEditor()
            const modifiedEditor = editor.getModifiedEditor()

            originalEditor.onDidChangeModelContent(() => {
              originalRef.current = originalEditor.getValue()
            })
            modifiedEditor.onDidChangeModelContent(() => {
              modifiedRef.current = modifiedEditor.getValue()
            })
          }}
        />
      </main>
    </div>
  )
}


export default App
