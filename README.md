# Diff Viewer for PHP

Compare two PHP files, or two individual functions, side by side in an editable diff editor, straight from the VS Code Explorer. No copy-pasting between files.

> Based on [nurullahakin/diff-viewer](https://github.com/nurullahakin/diff-viewer) by Nurullah Akın. See [Credits](#credits).

## Usage

Open a workspace with PHP files, then use any of:

- **Explorer, right-click a `.php` file** → **Diff Viewer: Select as Old**, then right-click another file → **Diff Viewer: Compare with Selected Old**.
- **Explorer, select two `.php` files**, right-click → **Diff Viewer: Compare Selected Files**.
- **Editor, right-click inside a PHP function** → **Diff Viewer: Use Function at Cursor as Old** / **as New**. The panel compares as soon as both sides are set.
- **Command Palette** → **Diff Viewer: Open**, then fill the fields manually.

In the panel, choose **File** or **Function** from **Type**, enter the targets in **Old** and **New**, and click **Compare**. Use **Inline view** to switch between a combined diff and side-by-side editors.

Both sides are editable and the diff updates as you type. Edits only affect the comparison, never the files on disk. Unsaved changes in open editors are what gets compared. The panel follows your VS Code theme and editor font.

### Files

Enter a filename with or without `.php`, or a workspace-relative path:

```text
UserControllerTest
tests/Feature/UserControllerTest.php
```

Use a relative path when multiple files share a name; a bare filename picks the first match.

### Functions and methods

Enter a bare function name to search the workspace, or `File::function` to search one file:

```text
UserService::getDiff
app/Services/UserService.php::getDiff
```

The part before `::` is a file name, not a PHP class lookup. Qualify it with a relative path if several files share that name. Bare function names pick the first match.

### Paste both targets

Paste a pair into either **Old** or **New**:

```text
UserService::getDiff -> AccountService::getDiff
```

The left target goes into **Old** and the right one into **New**, whichever field receives the paste.

## Privacy

Files are read through the VS Code API on your machine. Nothing is uploaded and the panel works offline. Input values and edits are not saved between sessions.

## Limitations

- Only `.php` files are scanned, and only inside open workspace folders. Scanning skips `node_modules`, `vendor`, `.git`, `dist` and `build`.
- Function extraction uses simple name matching and brace counting, not a full PHP parser. Braces in strings or comments can produce incomplete snippets, and methods with the same name within one file are not distinguished.
- Files are not watched. Click **Compare** again to reload contents.

## Credits

The diff viewer itself (diff editor, file and function lookup, `A -> B` paste, diff colors) comes from [nurullahakin/diff-viewer](https://github.com/nurullahakin/diff-viewer) by Nurullah Akın. This extension wraps it in a VS Code webview and adds the extension host, context menus and theme integration. Licensed under [MIT](https://github.com/oktayaydogan/diff-viewer-vscode/blob/main/LICENSE).

Source and issues: https://github.com/oktayaydogan/diff-viewer-vscode
