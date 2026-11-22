# Dev Server Restarter (Odoo & Terminal)

**Author:** Sazidul Alam  
**Publisher:** sazidul-alam  
**Version:** 1.2.0

A lightweight and productivity-focused extension that adds **Run (Blue)**, **Stop (Red, Ctrl+C)**, and **Restart (Green)** buttons directly to the **Editor Title Bar** (top-right of the editor) and Status Bar. Perfect for Odoo development, Python backends, Node.js servers, and WSL workflows.

## Features

- **Editor Title Bar Integration**: Located right beside your editor tabs at the top right for instant one-click access.
- **Real-Time Lifecycle & Manual Termination Detection**:
  - Automatically tracks running processes inside the `Dev Server Restarter` terminal.
  - If you manually kill the server using `Ctrl+C` inside the terminal, or if the server crashes/exits, the extension detects it instantly and converts the title bar buttons back to the **Play (Blue)** button.
- **Zero-Delay Event-Driven Restart**:
  - No more arbitrary or blind waiting timers! When you click **Restart**, the extension signals termination and dispatches the new command the exact millisecond the terminal prompt is ready.
  - If the server was already stopped, it starts immediately without waiting.
- **Smart Command Prompt with History**:
  - Remembers your previously executed commands across sessions.
  - Suggests history dynamically as you type.
  - **Load & Edit Command (`$(reply)`)**: Click the curved arrow icon on any history item to populate the input box, allowing you to modify flags/arguments before running without overwriting past history.
  - **History Cleanup (`$(trash)`)**: Delete individual unwanted commands from history with a single click.
- **WSL & Odoo Multi-Process Support**:
  - Handles multi-worker servers and background workers gracefully.
  - Double SIGINT (`Ctrl+C`) signaling ensures stubborn processes like Odoo terminate cleanly.
- **Smart Terminal Binding**:
  - Automatically re-binds to the existing `Dev Server Restarter` terminal, preventing duplicate terminal tabs.
- **Dynamic State Buttons**:
  - **Idle / Stopped**: Blue **Play (Run)** button.
  - **Running**: Green **Restart** and Red **Stop** buttons.
- **Cross-IDE Compatibility**: Works seamlessly in VS Code, Antigravity IDE, Cursor, Windsurf, and VSCodium.

## Configuration

| Setting | Type | Default | Description |
|---|---|---|---|
| `devServerRestarter.restartDelayMs` | `number` | `3000` | Safety fallback timeout in milliseconds to wait for shell prompt during restart if terminal shell integration is inactive. |

## Created By
**Sazidul Alam**
