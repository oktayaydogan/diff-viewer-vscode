// Bridge to the VS Code extension host. The webview cannot touch the workspace itself,
// so file listing and reading are requests answered by extension/panel.ts.

declare function acquireVsCodeApi(): { postMessage(message: unknown): void }

export interface PrefillMessage {
  type: 'prefill'
  symbolType: 'file' | 'function'
  old?: string
  new?: string
}

const vscode = acquireVsCodeApi()
const pending = new Map<number, { resolve: (value: unknown) => void; reject: (error: Error) => void }>()
const prefillListeners = new Set<(message: PrefillMessage) => void>()
let nextId = 0

window.addEventListener('message', (event: MessageEvent) => {
  const message = event.data
  if (message?.type === 'response') {
    const request = pending.get(message.id)
    if (!request) return
    pending.delete(message.id)
    if (message.error) request.reject(new Error(message.error))
    else request.resolve(message.result)
  } else if (message?.type === 'prefill') {
    prefillListeners.forEach((listener) => listener(message))
  }
})

function request<T>(type: string, payload?: object): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const id = nextId++
    pending.set(id, { resolve: resolve as (value: unknown) => void, reject })
    vscode.postMessage({ type, id, ...payload })
  })
}

export const listFiles = () => request<string[]>('listFiles')
export const readFile = (path: string) => request<string>('readFile', { path })

// Tells the host the UI can receive prefill messages (sent once the file list is loaded).
export const signalReady = () => vscode.postMessage({ type: 'ready' })

export function onPrefill(listener: (message: PrefillMessage) => void): () => void {
  prefillListeners.add(listener)
  return () => prefillListeners.delete(listener)
}
