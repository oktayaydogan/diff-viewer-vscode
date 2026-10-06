# Contributing

Requires Node.js 22.12 or newer and npm.

```sh
npm install
npm run build      # type-check, build the webview (Vite) and the extension host (esbuild)
npm run package    # build + create diff-viewer-<version>.vsix
```

## Debugging

Open this folder in VS Code and press F5 (**Run Extension**). In the Extension Development Host, open a PHP workspace and use the context menus.

- `npm run dev` rebuilds the webview on change; run **Developer: Reload Webviews** in the host window.
- After changing `extension/`, run `npm run build:extension` and restart the debug session.

## Layout

- `extension/`: extension host (commands, webview panel, workspace file access).
- `src/`: the React webview. `src/lib/host.ts` is the postMessage bridge to the host; `src/lib/vscodeTheme.ts` maps VS Code theme colors onto Monaco.
- Monaco is bundled (`src/monaco-setup.ts`) because the webview CSP forbids the CDN loader.

## Releasing

1. Bump `version` in `package.json` and add a `CHANGELOG.md` entry.
2. `npm run package`, then upload the `.vsix` at https://marketplace.visualstudio.com/manage (or `vsce publish`).
3. Tag `vX.Y.Z` and create a GitHub release with the `.vsix` attached.
