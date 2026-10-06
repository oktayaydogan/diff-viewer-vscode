# Diff Viewer

Compare two files or functions from a local PHP project without copying their contents by hand. Right-click files in the VS Code Explorer (or enter targets by hand) and see their differences in an editable Monaco diff editor.
## Install And Run

This is a VS Code extension (VS Code 1.90 or newer). Requires Node.js 22.12 or newer and npm to build.
```sh
npm install
npm run package   # builds and creates diff-viewer-<version>.vsix
code --install-extension diff-viewer-0.1.0.vsix
```
To debug, open this folder in VS Code and press F5 (Run Extension). `npm run dev` rebuilds the webview on change; rerun `npm run build:extension` after changing `extension/`.

## Compare Code

Open a workspace with PHP files, then use any of:

- **Explorer, right-click a `.php` file** → **Diff Viewer: Select as Old**, then right-click another file → **Diff Viewer: Compare with Selected Old**.
- **Explorer, select two `.php` files**, right-click → **Diff Viewer: Compare Selected Files**.
- **Editor, right-click inside a PHP function** → **Use Function at Cursor as Old** / **as New**. The panel compares as soon as both sides are set.
- **Command Palette** → **Diff Viewer: Open**, then fill the fields manually:
  1. Choose **File** or **Function** from the shared **Type** selector.
  2. Enter the targets in **Old** and **New**.
  3. Click **Compare**.

Use **Inline view** to switch between a combined diff and side-by-side editors. Both editor inputs are editable, and differences update as you type. Edits affect only the comparison, not the files on disk. Unsaved changes in open editors are what gets compared.
### Files

Enter a filename with or without `.php`, or a project-relative path:
```text
VerificationsControllerDeleteTest
tests/Verification/VerificationsControllerDeleteTest.php
```
An absolute path copied from your editor is also matched against paths in the selected project; it does not grant access to files outside that folder. Use a relative path when multiple files share a name. Bare filenames select the first matching file.
### Functions And Methods

Keep **Language** set to **php**. Enter a bare function name to search the project, or use `File::function` to search a specific file:
```text
CarryPinSyncService::getDiff
WupexSyncService::getDiff
```
The part before `::` is a filename, not a PHP class lookup. If several files share that name, qualify it with a relative path:
```text
models/Procurement/API/CarryPin/CarryPinSyncService.php::getDiff
```
Bare function names select the first match. File-qualified searches reject ambiguous filenames. Extracted functions include a PHP opening tag for syntax highlighting.
### Paste Both Targets

Paste a pair into either **Old** or **New**:
```text
CarryPinSyncService::getDiff -> WupexSyncService::getDiff
```
The left target goes into **Old** and the right target into **New**, regardless of which field receives the paste. Surrounding whitespace is trimmed.
## Local File Access

The extension reads workspace files through the VS Code API. Nothing is uploaded, and Monaco is bundled, so the panel works offline. Listing files does not read their contents; comparing files reads the selected ones. Searching for a function can read many PHP files until it finds a match; `File::function` reads only the resolved file.
The tool does not save input values or edits between sessions.

## Current Limits

- Project scanning supports `.php` files only. The language selector changes highlighting, not which files are scanned.
- Scanning skips `node_modules`, `vendor`, `.git`, `dist`, and `build`. Inaccessible directories may be skipped.
- Function extraction uses simple name matching and brace counting, not a full PHP parser. Braces in strings or comments can produce incomplete snippets; multiple methods with the same name within one file are not distinguished.
- Only files inside open workspace folders can be compared.
- The standalone browser app (`npm run dev` in a browser) is no longer supported.
- Files are not watched for changes. The file list refreshes on each comparison; click **Compare** again to reload contents.
