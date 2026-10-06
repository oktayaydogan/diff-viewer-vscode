// Workspace file access, served by the VS Code extension host (see host.ts).
import { listFiles, readFile } from './host'

export interface ScannedFile {
  path: string
}

export async function scanPhpFiles(): Promise<ScannedFile[]> {
  return (await listFiles()).map((path) => ({ path }))
}

export { readFile }

// Accepts a bare filename, a relative path, or a full/absolute path (even from
// a different filesystem root, e.g. pasted from an editor). Tries the most
// specific match first (longest path suffix) and falls back to just the
// basename so a lone class/file name still resolves.
export async function findFileByPath(
  files: ScannedFile[],
  rawPath: string,
  rejectAmbiguous = false,
): Promise<{ path: string; code: string } | null> {
  const trimmed = rawPath.trim()
  if (!trimmed) return null

  const segments = trimmed
    .replace(/\\/g, '/')
    .replace(/^[A-Za-z]:/, '')
    .split('/')
    .filter(Boolean)
  if (segments.length === 0) return null

  const lastIndex = segments.length - 1
  segments[lastIndex] = segments[lastIndex].endsWith('.php')
    ? segments[lastIndex]
    : `${segments[lastIndex]}.php`

  for (let start = 0; start < segments.length; start++) {
    const suffix = segments.slice(start).join('/')
    const matches = files.filter(
      (f) => f.path === suffix || f.path.endsWith(`/${suffix}`),
    )
    if (rejectAmbiguous && matches.length > 1) {
      throw new Error(`Multiple files match "${rawPath}". Use a relative file path before ::.`)
    }
    const match = matches[0]
    if (match) {
      return { path: match.path, code: await readFile(match.path) }
    }
  }

  return null
}
