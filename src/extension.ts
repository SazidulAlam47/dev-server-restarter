import * as vscode from "vscode";

let runnerTerminal: vscode.Terminal | undefined;
let activeCommand: string = "";
let isRunning: boolean = false;
let statusBarItem: vscode.StatusBarItem;

const HISTORY_KEY = "terminalRunner.commandHistory";
const MAX_HISTORY = 50;

export function activate(context: vscode.ExtensionContext) {
    // Initialize context state
    setRunningState(false);

    // Create status bar item for quick visibility
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100,
    );
    statusBarItem.command = "terminalRunner.run";
    statusBarItem.tooltip = "Dev Server Restarter";
    updateStatusBar();
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    // 1. Run Command
    const runDisposable = vscode.commands.registerCommand(
        "terminalRunner.run",
        async () => {
            const history: string[] = context.globalState.get<string[]>(
                HISTORY_KEY,
                [],
            );
            const command = await promptForCommand(history, context);
            if (!command || !command.trim()) {
                return;
            }

            const trimmed = command.trim();
            saveCommandToHistory(context, trimmed);
            executeCommandInTerminal(context, trimmed);
        },
    );

    // 2. Stop Command (Ctrl+C)
    const stopDisposable = vscode.commands.registerCommand(
        "terminalRunner.stop",
        () => {
            if (!runnerTerminal) {
                vscode.window.showInformationMessage(
                    "No active terminal process is running.",
                );
                setRunningState(false);
                return;
            }

            // Send ASCII ETX (0x03), equivalent to pressing Ctrl+C in terminal
            runnerTerminal.sendText("\x03", false);
            setRunningState(false);
            vscode.window.showInformationMessage(`Stopped: ${activeCommand}`);
        },
    );

    // 3. Restart Command (Ctrl+C -> Re-execute)
    const restartDisposable = vscode.commands.registerCommand(
        "terminalRunner.restart",
        () => {
            if (!activeCommand) {
                vscode.window.showWarningMessage(
                    "No previous command found to restart.",
                );
                return;
            }

            if (runnerTerminal) {
                // First stop any current process
                runnerTerminal.sendText("\x03", false);
            }

            // Wait a short moment for shell prompt to be ready, then send command again
            setTimeout(() => {
                executeCommandInTerminal(context, activeCommand);
                vscode.window.showInformationMessage(
                    `Restarted: ${activeCommand}`,
                );
            }, 400);
        },
    );

    // 4. Clear History
    const clearHistoryDisposable = vscode.commands.registerCommand(
        "terminalRunner.clearHistory",
        async () => {
            await context.globalState.update(HISTORY_KEY, []);
            vscode.window.showInformationMessage(
                "Dev Server Restarter command history cleared.",
            );
        },
    );

    // Watch for terminal close
    const closeDisposable = vscode.window.onDidCloseTerminal(
        (closedTerminal) => {
            if (runnerTerminal && closedTerminal === runnerTerminal) {
                runnerTerminal = undefined;
                setRunningState(false);
            }
        },
    );

    // Optional shell execution end detection (VS Code 1.93+)
    if ("onDidEndTerminalShellExecution" in (vscode.window as any)) {
        const shellEndDisposable = (
            vscode.window as any
        ).onDidEndTerminalShellExecution((e: any) => {
            if (runnerTerminal && e.terminal === runnerTerminal) {
                setRunningState(false);
            }
        });
        context.subscriptions.push(shellEndDisposable);
    }

    context.subscriptions.push(
        runDisposable,
        stopDisposable,
        restartDisposable,
        clearHistoryDisposable,
        closeDisposable,
    );
}

function setRunningState(running: boolean) {
    isRunning = running;
    vscode.commands.executeCommand(
        "setContext",
        "terminalRunner.isRunning",
        running,
    );
    updateStatusBar();
}

function updateStatusBar() {
    if (!statusBarItem) {
        return;
    }
    if (isRunning) {
        statusBarItem.text = `$(sync~spin) Running: ${truncate(activeCommand, 20)}`;
        statusBarItem.command = "terminalRunner.stop";
        statusBarItem.tooltip = `Running: "${activeCommand}"\nClick to Stop (or use Title Bar buttons)`;
    } else {
        statusBarItem.text = "$(play) Run Command";
        statusBarItem.command = "terminalRunner.run";
        statusBarItem.tooltip =
            "Run a terminal command (with history suggestions)";
    }
}

function truncate(str: string, maxLen: number): string {
    if (!str) return "";
    return str.length > maxLen ? str.slice(0, maxLen - 1) + "…" : str;
}

function executeCommandInTerminal(
    context: vscode.ExtensionContext,
    command: string,
) {
    // Ensure we have a valid terminal instance
    if (!runnerTerminal || runnerTerminal.exitStatus !== undefined) {
        runnerTerminal = vscode.window.createTerminal({
            name: "Dev Server Restarter",
            iconPath: new vscode.ThemeIcon("server-process"),
        });
    }

    activeCommand = command;
    runnerTerminal.show(false);
    runnerTerminal.sendText(command, true);
    setRunningState(true);
}

async function promptForCommand(
    history: string[],
    context: vscode.ExtensionContext,
): Promise<string | undefined> {
    return new Promise((resolve) => {
        const quickPick = vscode.window.createQuickPick();
        quickPick.placeholder =
            "Type a server command (e.g. odoo-bin, npm run dev), or pick from history...";
        quickPick.title = "Dev Server Restarter: Run Command";
        quickPick.matchOnDescription = true;

        const buildItems = (inputVal: string): vscode.QuickPickItem[] => {
            const items: vscode.QuickPickItem[] = [];
            const trimmed = inputVal.trim();

            if (trimmed) {
                const exactMatch = history.some(
                    (h) => h.toLowerCase() === trimmed.toLowerCase(),
                );
                if (!exactMatch) {
                    items.push({
                        label: trimmed,
                        description: "$(terminal) Run new command",
                        alwaysShow: true,
                    });
                }
            }

            for (const h of history) {
                items.push({
                    label: h,
                    description: "$(history) Previous command",
                    buttons: [
                        {
                            iconPath: new vscode.ThemeIcon("reply"),
                            tooltip: "Insert into input box",
                        },
                        {
                            iconPath: new vscode.ThemeIcon("trash"),
                            tooltip: "Delete from history",
                        },
                    ],
                });
            }

            return items;
        };

        quickPick.items = buildItems("");

        quickPick.onDidChangeValue((val) => {
            quickPick.items = buildItems(val);
        });

        quickPick.onDidTriggerItemButton(async (e) => {
            const iconId = (e.button.iconPath as vscode.ThemeIcon).id;
            if (iconId === "reply") {
                // Populate input box so user can modify and run
                quickPick.value = e.item.label;
                quickPick.items = buildItems(quickPick.value);
            } else if (iconId === "trash") {
                // Trash button clicked to delete item from history
                const itemToDelete = e.item.label;
                const updated = history.filter((h) => h !== itemToDelete);
                await context.globalState.update(HISTORY_KEY, updated);
                history.length = 0;
                history.push(...updated);
                quickPick.items = buildItems(quickPick.value);
            }
        });

        quickPick.onDidAccept(() => {
            const selected = quickPick.selectedItems[0];
            const result = selected ? selected.label : quickPick.value;
            quickPick.hide();
            resolve(result);
        });

        quickPick.onDidHide(() => {
            quickPick.dispose();
            resolve(undefined);
        });

        quickPick.show();
    });
}

function saveCommandToHistory(
    context: vscode.ExtensionContext,
    command: string,
) {
    let history: string[] = context.globalState.get<string[]>(HISTORY_KEY, []);
    // Move command to the top, removing previous occurrences
    history = [command, ...history.filter((h) => h !== command)];
    if (history.length > MAX_HISTORY) {
        history = history.slice(0, MAX_HISTORY);
    }
    context.globalState.update(HISTORY_KEY, history);
}

export function deactivate() {
    setRunningState(false);
}
