import {
    EventEmitter,
    TextEditor,
    Uri,
    commands,
    window,
    type Pseudoterminal,
    type Terminal
} from 'vscode';
import { Disposable } from 'vscode-jsonrpc';
import { Commands } from '../common/constants';
import { IInterpreterService } from '../interpreter/contracts';
import { getMultiLineSelectionText, getSingleLineSelectionText } from '../terminals/codeExecution/helper';
import { createPythonServer, type PythonServer } from './pythonServer';

// let notebookController: NotebookController | undefined;
// let notebookEditor: NotebookEditor | undefined;

// TODO: Need to figure out making separate REPL for each file:
// a.py in REPL.
// b.py run in REPL
// MAPPING Uri to notebookEditor if we want separate REPL for each file.
// Currently: Everything gets sent into one single REPL.

// TODO: when you reload window, is the REPL still binded to same Python file?
// cache binding uri to to REPL instance or notebookEditor.

// TODO: figure out way to put markdown telling user kernel has been dead and need to pick again.

async function getSelectedTextToExecute(textEditor: TextEditor): Promise<string | undefined> {
    if (!textEditor) {
        return undefined;
    }

    const { selection } = textEditor;
    let code: string;

    if (selection.isEmpty) {
        code = textEditor.document.lineAt(selection.start.line).text;
    } else if (selection.isSingleLine) {
        code = getSingleLineSelectionText(textEditor);
    } else {
        code = getMultiLineSelectionText(textEditor);
    }

    return code;
}

let server: PythonServer;
let terminal: Terminal;
let pty: Pseudoterminal;
const writeEmitter = new EventEmitter<string>();
const closeEmitter = new EventEmitter<number | undefined>();

export async function registerReplCommands(
    disposables: Disposable[],
    interpreterService: IInterpreterService,
): Promise<void> {
    disposables.push(
        commands.registerCommand(Commands.Exec_In_REPL, async (uri: Uri) => {
            const interpreter = await interpreterService.getActiveInterpreter(uri);
            if (interpreter) {
                const interpreterPath = interpreter.path;
                if (!server) {
                    server = createPythonServer([interpreterPath]);
                }

                const activeEditor = window.activeTextEditor as TextEditor;
                const code = await getSelectedTextToExecute(activeEditor) ?? '';

                await new Promise<void>((resolve) => {
                    if (terminal) {
                        resolve();
                        return;
                    }
                    pty = {
                        onDidWrite: writeEmitter.event,
                        onDidClose: closeEmitter.event,
                        open: () => {
                            writeEmitter.fire(prompt());
                            resolve()
                        },
                        close: () => console.log('close'),
                        handleInput(data) {
                            // TODO: Impl execution of input

                            // Trigger intellisense with fake results
                            const completions = [
                                { CompletionText: 'def', ListItemText: 'def', ResultType: 3, ToolTip: 'def' },
                                { CompletionText: 'del', ListItemText: 'del', ResultType: 3, ToolTip: 'del' },
                                { CompletionText: 'delattr', ListItemText: 'delattr', ResultType: 3, ToolTip: 'delattr' },
                                { CompletionText: 'dir', ListItemText: 'dir', ResultType: 6, ToolTip: 'dir' },
                                { CompletionText: 'divmod', ListItemText: 'divmod', ResultType: 6, ToolTip: 'divmod' },
                                { CompletionText: 'DeprecationWarning', ListItemText: 'DeprecationWarning', ResultType: 6, ToolTip: 'DeprecationWarning' },
                                { CompletionText: '__dict__', ListItemText: '__dict__', ResultType: 9, ToolTip: '__dict__' },
                                { CompletionText: '__doc__', ListItemText: '__doc__', ResultType: 9, ToolTip: '__doc__' },
                                { CompletionText: 'ZeroDivisionError', ListItemText: 'ZeroDivisionError', ResultType: 3, ToolTip: 'ZeroDivisionError' },
                                { CompletionText: 'PendingDeprecationWarning', ListItemText: 'PendingDeprecationWarning', ResultType: 3, ToolTip: 'PendingDeprecationWarning' },
                                { CompletionText: 'UnicodeDecodeError', ListItemText: 'UnicodeDecodeError', ResultType: 3, ToolTip: 'UnicodeDecodeError' },
                            ];
                            writeEmitter.fire(`${data}${vsc('Completions', 0, 1, 1, JSON.stringify(completions))}`)
                        },
                    };
                    terminal = window.createTerminal({ name: 'Python REPL', pty });
                });
                terminal.show();

                writeEmitter.fire(`${code}\r\n${vsc('E', code)}${vsc('C')}`);
                const result = await server.execute(code);
                writeEmitter.fire(`${result}\r\n${vsc('D', 0)}`);
                writeEmitter.fire(prompt());
            }
        }),
    );
}

function prompt(): string {
    return `${vsc('A')}>>> ${vsc('B')}`;
}

function vsc(...params: (string | number)[]): string {
    return `\x1b]633;${params.join(';')}\x07`;
}
