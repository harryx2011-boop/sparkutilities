# Windows Explorer integration

SparkUtilities can be invoked from the Windows right-click context menu in two ways.

## Option 1 — Install as a PWA (recommended, zero setup)

1. Open SparkUtilities in **Chrome** or **Edge**.
2. Click the install icon (⊕) in the address bar → **Install SparkUtilities**.

Once installed, right-click any supported file in File Explorer and choose
**Open with → SparkUtilities**. The file converter opens with the file
already queued and ready to convert.

Supported on Chrome 102+ and Edge 102+ via the
[File Handling API](https://developer.mozilla.org/en-US/docs/Web/Manifest/file_handlers).
No registry edits required, no native binary, no admin rights.

## Option 2 — Direct right-click entry (registry-based)

If you don't want to install the PWA, you can install a global
**"Convert with SparkUtilities"** entry on every file by running
`install-context-menu.reg`. Uninstall it later with
`uninstall-context-menu.reg`.

Right-clicking a file will open `https://sparkutilities.dev/file-converter`
in your default browser. The file is not auto-loaded in this mode — the
PWA install (Option 1) is required for automatic file forwarding.

Both options coexist; you can have both enabled at the same time.
