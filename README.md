# Dev Server Restarter (Odoo & Terminal)

**Author:** Sazidul Alam  
**Publisher:** sazidul-alam  
**Version:** 1.1.0

A lightweight and productivity-focused extension that adds **Run (Blue)**, **Stop (Red, Ctrl+C)**, and **Restart (Green)** buttons directly to the **Editor Title Bar** (top-right of the editor) and Status Bar. Perfect for Odoo development, Python backends, Node.js servers, and WSL workflows.

## Features

- **Editor Title Bar Integration**: Located right beside your editor tabs at the top right for instant one-click access.
- **Smart Command Prompt with History**:
  - Remembers your previously executed commands across sessions.
  - Suggests history dynamically as you type.
  - **Load & Edit Command (`$(reply)`)**: Click the arrow icon on any history item to populate the input box, allowing you to modify flags/arguments before running without overwriting past history.
  - **History Cleanup (`$(trash)`)**: Delete individual unwanted commands from history with a single click.
- **WSL & Odoo Optimized Execution**:
  - Handles multi-process servers and background workers gracefully.
  - Double SIGINT (`Ctrl+C`) signaling ensures stubborn processes like Odoo terminate cleanly.
  - Configurable restart delay (`devServerRestarter.restartDelayMs`) prevents keystroke loss while bash prompts initialize.
- **Smart Terminal Binding**:
  - Automatically attaches to the existing `Dev Server Restarter` terminal, preventing annoying duplicate terminal tabs.
- **Dynamic State Buttons**:
  - **Idle**: Blue **Play (Run)** button.
  - **Running**: Green **Restart** and Red **Stop** buttons.
- **Cross-IDE Compatibility**: Works seamlessly in VS Code, Antigravity IDE, Cursor, Windsurf, and VSCodium.

## Configuration

| Setting | Type | Default | Description |
|---|---|---|---|
| `devServerRestarter.restartDelayMs` | `number` | `1000` | Delay in milliseconds between stopping the server (Ctrl+C) and sending the restart command. Recommended 1000ms-1500ms for WSL, Odoo, and Python servers. |

## Created By
**Sazidul Alam**
