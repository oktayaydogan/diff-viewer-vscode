import * as vscode from 'vscode'
import { DiffViewerPanel } from './panel'

// The file picked via "Select as Old", workspace-relative (same form the webview lists).
let selectedOld: string | undefined

function relativePath(uri: vscode.Uri): string | undefined {
  const folder = vscode.workspace.getWorkspaceFolder(uri)
  if (!folder) {
    void vscode.window.showWarningMessage('Diff Viewer: the file is not inside an open workspace folder.')
    return undefined
  }
  return vscode.workspace.asRelativePath(uri)
}

// Nearest `function name(` at or above the cursor; same naive matching as src/lib/phpExtract.ts.
function functionAtCursor(editor: vscode.TextEditor): string | undefined {
  for (let line = editor.selection.active.line; line >= 0; line--) {
    const match = /function\s+&?\s*(\w+)\s*\(/i.exec(editor.document.lineAt(line).text)
    if (match) return match[1]
  }
  return undefined
}

export function activate(context: vscode.ExtensionContext) {
  const setSelectedOld = (value: string | undefined) => {
    selectedOld = value
    void vscode.commands.executeCommand('setContext', 'diffViewer.hasSelection', value !== undefined)
  }

  const register = (id: string, handler: (...args: never[]) => unknown) =>
    context.subscriptions.push(vscode.commands.registerCommand(`diffViewer.${id}`, handler))

  register('open', () => DiffViewerPanel.show(context))

  register('selectOld', (uri: vscode.Uri) => {
    const path = relativePath(uri)
    if (!path) return
    setSelectedOld(path)
    void vscode.window.setStatusBarMessage(`Diff Viewer: ${path} selected as Old`, 4000)
  })

  register('compareWithSelected', (uri: vscode.Uri) => {
    const path = relativePath(uri)
    if (!path || !selectedOld) return
    DiffViewerPanel.show(context, { symbolType: 'file', old: selectedOld, new: path })
  })

  register('compareSelected', (_clicked: vscode.Uri, selection: vscode.Uri[]) => {
    if (selection?.length !== 2) {
      void vscode.window.showWarningMessage('Diff Viewer: select exactly two files to compare.')
      return
    }
    const [oldPath, newPath] = selection.map(relativePath)
    if (!oldPath || !newPath) return
    DiffViewerPanel.show(context, { symbolType: 'file', old: oldPath, new: newPath })
  })

  // Function mode: the panel keeps the other side, so run this once per side.
  const functionCommand = (side: 'old' | 'new') => () => {
    const editor = vscode.window.activeTextEditor
    const path = editor && relativePath(editor.document.uri)
    const name = editor && functionAtCursor(editor)
    if (!path || !name) {
      if (path) void vscode.window.showWarningMessage('Diff Viewer: no PHP function found at the cursor.')
      return
    }
    DiffViewerPanel.show(context, { symbolType: 'function', [side]: `${path}::${name}` })
  }
  register('functionAsOld', functionCommand('old'))
  register('functionAsNew', functionCommand('new'))
}

export function deactivate() {}
