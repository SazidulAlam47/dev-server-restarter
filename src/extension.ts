import * as vscode from "vscode";

let runnerTerminal: vscode.Terminal | undefined;
let activeCommand: string = "";
let isRunning: boolean = false;
let isRestarting: boolean = false;
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
            isRestarting = false;
            const terminal = getOrCreateTerminal();

            // Send Ctrl+C (0x03) twice to gracefully but firmly terminate Python/Odoo workers
            terminal.sendText("\x03", false);
            setTimeout(() => {
                if (terminal.exitStatus === undefined) {
                    terminal.sendText("\x03", false);
                }
            }, 250);

            setRunningState(false);
            vscode.window.showInformationMessage(`Stopped: ${activeCommand}`);
        },
    );

    // 3. Restart Command (Ctrl+C -> Re-execute with WSL / Odoo support)
    const restartDisposable = vscode.commands.registerCommand(
        "terminalRunner.restart",
        () => {
            if (!activeCommand) {
                vscode.window.showWarningMessage(
                    "No previous command found to restart.",
                );
                return;
            }

            const config = vscode.workspace.getConfiguration("devServerRestarter");
            const delayMs = config.get<number>("restartDelayMs", 1000);

            isRestarting = true;
            setRunningState(true);

            const terminal = getOrCreateTerminal();

            // Send Ctrl+C twice (Odoo often asks 'Hit CTRL-C again to force quit')
            terminal.sendText("\x03", false);
            setTimeout(() => {
                if (terminal.exitStatus === undefined) {
                    terminal.sendText("\x03", false);
                }
            }, 250);

            // Wait for WSL bash prompt to be ready, then send command again
            setTimeout(() => {
                const activeTerm = getOrCreateTerminal();
                activeTerm.show(false);
                activeTerm.sendText(activeCommand, true);
                isRestarting = false;
                setRunningState(true);
                vscode.window.showInformationMessage(
                    `Restarted: ${activeCommand}`,
                );
            }, delayMs);
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
            if (
                closedTerminal === runnerTerminal ||
                closedTerminal.name === "Dev Server Restarter"
            ) {
                if (isRestarting) {
                    // Do not reset while in the middle of a restart cycle
                    return;
                }
                runnerTerminal = undefined;
                setRunningState(false);
            }
        },
    );

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
        statusBarItem.text = "$(play) Run Server";
        statusBarItem.command = "terminalRunner.run";
        statusBarItem.tooltip =
            "Run a server command (with history suggestions)";
    }
}

function truncate(str: string, maxLen: number): string {
    if (!str) return "";
    return str.length > maxLen ? str.slice(0, maxLen - 1) + "…" : str;
}

function getOrCreateTerminal(): vscode.Terminal {
    // 1. Check existing reference
    if (
        runnerTerminal &&
        vscode.window.terminals.includes(runnerTerminal) &&
        runnerTerminal.exitStatus === undefined
    ) {
        return runnerTerminal;
    }

    // 2. Look for any existing terminal named "Dev Server Restarter"
    const existing = vscode.window.terminals.find(
        (t) => t.name === "Dev Server Restarter" && t.exitStatus === undefined,
    );
    if (existing) {
        runnerTerminal = existing;
        return runnerTerminal;
    }

    // 3. Create fresh terminal if none found
    runnerTerminal = vscode.window.createTerminal({
        name: "Dev Server Restarter",
        iconPath: new vscode.ThemeIcon("server-process"),
    });
    return runnerTerminal;
}

function executeCommandInTerminal(
    context: vscode.ExtensionContext,
    command: string,
) {
    const terminal = getOrCreateTerminal();
    activeCommand = command;
    terminal.show(false);
    terminal.sendText(command, true);
    setRunningState(true);
}

async function promptForCommand(
    history: string[],
    context: vscode.ExtensionContext,
): Promise<string | undefined> {
    return new Promise((resolve) => {
        const quickPick = vscode.window.createQuickPick();
        quickPick.placeholder =
            "Type a server command (e.g. ./odoo/odoo-bin -c odoo.conf), or pick from history...";
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
