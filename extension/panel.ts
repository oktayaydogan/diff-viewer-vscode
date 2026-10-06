import { readFileSync } from 'node:fs'
import * as vscode from 'vscode'

// Same exclusions the browser version used (projectScan.ts).
const EXCLUDE = '{**/node_modules/**,**/vendor/**,**/.git/**,**/dist/**,**/build/**}'

export interface Prefill {
  symbolType: 'file' | 'function'
  old?: string
  new?: string
}

export class DiffViewerPanel {
  private static current: DiffViewerPanel | undefined

  private readonly files = new Map<string, vscode.Uri>()
  private ready = false
  private queued: Prefill | undefined

  // Opens (or reveals) the single panel and optionally prefills it.
  static show(context: vscode.ExtensionContext, prefill?: Prefill) {
    if (!DiffViewerPanel.current) {
      DiffViewerPanel.current = new DiffViewerPanel(context)
    } else {
      DiffViewerPanel.current.panel.reveal()
    }
    if (prefill) DiffViewerPanel.current.send(prefill)
  }

  private readonly panel: vscode.WebviewPanel

  private constructor(context: vscode.ExtensionContext) {
    const webviewRoot = vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview')
    this.panel = vscode.window.createWebviewPanel('diffViewer', 'Diff Viewer', vscode.ViewColumn.Active, {
      enableScripts: true,
      retainContextWhenHidden: true,
      localResourceRoots: [webviewRoot],
    })
    this.panel.webview.html = this.render(webviewRoot)
    this.panel.webview.onDidReceiveMessage((message) => this.onMessage(message), undefined, context.subscriptions)
    this.panel.onDidDispose(() => (DiffViewerPanel.current = undefined), undefined, context.subscriptions)
  }

  // The webview ignores prefills until it has loaded its file list; queue until 'ready'.
  private send(prefill: Prefill) {
    if (this.ready) void this.panel.webview.postMessage({ type: 'prefill', ...prefill })
    else this.queued = prefill
  }

  private async onMessage(message: { type: string; id?: number; path?: string }) {
    if (message.type === 'ready') {
      this.ready = true
      if (this.queued) this.send(this.queued)
      this.queued = undefined
      return
    }

    try {
      let result: unknown
      if (message.type === 'listFiles') result = await this.listFiles()
      else if (message.type === 'readFile') result = await this.readFile(message.path ?? '')
      else return
      void this.panel.webview.postMessage({ type: 'response', id: message.id, result })
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err)
      void this.panel.webview.postMessage({ type: 'response', id: message.id, error })
    }
  }

  private async listFiles(): Promise<string[]> {
    const uris = await vscode.workspace.findFiles('**/*.php', EXCLUDE)
    this.files.clear()
    for (const uri of uris) this.files.set(vscode.workspace.asRelativePath(uri), uri)
    return [...this.files.keys()].sort()
  }

  private async readFile(path: string): Promise<string> {
    const uri = this.files.get(path)
    if (!uri) throw new Error(`File not in workspace: ${path}`)
    // Prefer the open document so unsaved edits are compared too.
    const open = vscode.workspace.textDocuments.find((doc) => doc.uri.toString() === uri.toString())
    if (open) return open.getText()
    return new TextDecoder().decode(await vscode.workspace.fs.readFile(uri))
  }

  // Rewrites the Vite-built index.html: webview URIs for assets plus a CSP that matches Monaco's needs.
  private render(webviewRoot: vscode.Uri): string {
    const webview = this.panel.webview
    const csp = [
      "default-src 'none'",
      `style-src ${webview.cspSource} 'unsafe-inline'`,
      `script-src ${webview.cspSource}`,
      `font-src ${webview.cspSource}`,
      `img-src ${webview.cspSource} data:`,
      'worker-src blob:',
    ].join('; ')

    const indexPath = vscode.Uri.joinPath(webviewRoot, 'index.html').fsPath
    const html = readFileSync(indexPath, 'utf8')
    return html
      .replace(/(src|href)="\.?\/?(assets\/[^"]+)"/g, (_m, attr, rel) => {
        return `${attr}="${webview.asWebviewUri(vscode.Uri.joinPath(webviewRoot, rel))}"`
      })
      .replace(/ crossorigin/g, '')
      .replace(/<link rel="icon"[^>]*>\s*/, '')
      .replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />`)
  }
}
