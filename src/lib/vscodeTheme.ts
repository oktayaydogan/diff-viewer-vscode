import type { Monaco } from '@monaco-editor/react'
import { hsla } from './color'

export const THEME_NAME = 'diff-viewer'

// Monaco theme colors only accept hex, but VS Code exposes theme colors as arbitrary CSS values.
function toHex(cssColor: string): string | undefined {
  if (!cssColor) return undefined
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return undefined
  ctx.clearRect(0, 0, 1, 1)
  ctx.fillStyle = cssColor
  ctx.fillRect(0, 0, 1, 1)
  const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
  return '#' + [r, g, b, a].map((v) => v.toString(16).padStart(2, '0')).join('')
}

function themeBase(): 'vs' | 'vs-dark' | 'hc-black' | 'hc-light' {
  const classes = document.body.classList
  if (classes.contains('vscode-high-contrast-light')) return 'hc-light'
  if (classes.contains('vscode-high-contrast')) return 'hc-black'
  if (classes.contains('vscode-light')) return 'vs'
  return 'vs-dark'
}

// Editor chrome comes from the active VS Code theme (Monaco key -> VS Code CSS variable).
const FROM_VSCODE: Record<string, string> = {
  'editor.background': '--vscode-editor-background',
  'editor.foreground': '--vscode-editor-foreground',
  'editorLineNumber.foreground': '--vscode-editorLineNumber-foreground',
  'editorLineNumber.activeForeground': '--vscode-editorLineNumber-activeForeground',
  'editorCursor.foreground': '--vscode-editorCursor-foreground',
  'editorWidget.background': '--vscode-editorWidget-background',
  'diffEditor.diagonalFill': '--vscode-diffEditor-diagonalFill',
}

export function applyTheme(monaco: Monaco) {
  const styles = getComputedStyle(document.documentElement)
  const colors: Record<string, string> = {
    // Diff colors are ours, not the theme's. Edit these to restyle diff highlighting.
    'diffEditor.insertedLineBackground': hsla(60, 100, 50, 0.05),
    'diffEditor.removedLineBackground': hsla(0, 100, 50, 0.15),
    'diffEditor.insertedTextBackground': hsla(120, 100, 50, 0.15),
    'diffEditor.removedTextBackground': hsla(0, 100, 50, 0.25),
    'editor.selectionBackground': '#ffff003c',
  }
  for (const [key, variable] of Object.entries(FROM_VSCODE)) {
    const hex = toHex(styles.getPropertyValue(variable).trim())
    if (hex) colors[key] = hex
  }
  monaco.editor.defineTheme(THEME_NAME, { base: themeBase(), inherit: true, rules: [], colors })
  monaco.editor.setTheme(THEME_NAME)
}

// Same font as VS Code's own editors.
export function editorFont() {
  const styles = getComputedStyle(document.documentElement)
  return {
    fontFamily: styles.getPropertyValue('--vscode-editor-font-family').trim() || undefined,
    fontSize: parseFloat(styles.getPropertyValue('--vscode-editor-font-size')) || undefined,
    fontWeight: styles.getPropertyValue('--vscode-editor-font-weight').trim() || undefined,
  }
}

// VS Code rewrites <html style> and <body class> when the theme or editor font changes.
export function watchTheme(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })
  observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })
  return () => observer.disconnect()
}
