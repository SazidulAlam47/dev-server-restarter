# Dev Server Restarter (Odoo & Terminal)

**Author:** Sazidul Alam  
**Publisher:** sazidul-alam  
**Version:** 1.0.0

A lightweight and productivity-focused extension that adds **Run (Blue)**, **Stop (Red, Ctrl+C)**, and **Restart (Green)** buttons directly to the **Editor Title Bar** (top-right of the editor) and Status Bar.

## Features

- **Editor Title Bar Integration**: Located right beside your editor tabs at the top right.
- **Smart Command Prompt with History**:
  - Remembers your previously typed commands.
  - Suggests history as you type.
  - Delete individual unwanted commands from history with a single click on the trash icon `$(trash)`.
- **Attached Mode Terminal**:
  - Automatically spins up a dedicated `Command Runner` terminal.
  - Executes long-running tasks, dev servers (`odoo-bin`, `python app.py`, `npm run dev`, etc.).
- **Dynamic State Buttons**:
  - When idle: Shows blue **Play (Run)** button.
  - When running: Turns into green **Restart** and red **Stop** buttons.
- **Stop (Ctrl+C)**: Gracefully sends `\x03` (SIGINT / Ctrl+C) to interrupt the running attached process.
- **Restart**: Gracefully stops the current attached process and immediately re-executes the command.
- **Cross-IDE Compatibility**: Works in Standard VS Code, Antigravity IDE, Cursor, Windsurf, VSCodium.

## Created By
**Sazidul Alam**
