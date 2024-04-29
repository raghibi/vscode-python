import {
    EventEmitter,
    NotebookCellData,
    NotebookCellKind,
    NotebookController,
    NotebookControllerAffinity,
    NotebookEdit,
    TextEditor,
    Uri,
    ViewColumn,
    WorkspaceEdit,
    commands,
    notebooks,
    window,
    workspace,
    type NotebookEditor,
    type Pseudoterminal,
    type Terminal
} from 'vscode';
import { Disposable } from 'vscode-jsonrpc';
import { Commands, PVSC_EXTENSION_ID } from '../common/constants';
import { IInterpreterService } from '../interpreter/contracts';
import { getMultiLineSelectionText, getSingleLineSelectionText } from '../terminals/codeExecution/helper';
import { createReplController } from './replController';

let notebookController: NotebookController | undefined;
// TODO: Could notebook editor be hidden so we can leverage LSP?
let notebookEditor: NotebookEditor | undefined;

let terminal: Terminal;
let pty: Pseudoterminal;
const writeEmitter = new EventEmitter<string>();
const closeEmitter = new EventEmitter<number | undefined>();

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

export async function registerReplCommands(
    disposables: Disposable[],
    interpreterService: IInterpreterService,
): Promise<void> {
    disposables.push(
        commands.registerCommand(Commands.Exec_In_REPL, async (uri: Uri) => {
            const interpreter = await interpreterService.getActiveInterpreter(uri);
            if (interpreter) {
                const interpreterPath = interpreter.path;
                // How do we get instance of interactive window from Python extension?
                if (!notebookController) {
                    notebookController = createReplController(interpreterPath);
                }
                const activeEditor = window.activeTextEditor as TextEditor;

                const code = await getSelectedTextToExecute(activeEditor) ?? '';
                const ourResource = Uri.from({ scheme: 'untitled', path: 'repl.interactive' });
                // How to go from user clicking Run Python --> Run selection/line via Python REPL -> IW opening
                const notebookDocument = await workspace.openNotebookDocument(ourResource);

                // We want to keep notebookEditor, whenever we want to run.
                // Find interactive window, or open it.
                if (!notebookEditor) {
                    notebookEditor = await window.showNotebookDocument(notebookDocument, {
                        viewColumn: ViewColumn.Beside,
                    });
                }

                notebookController!.updateNotebookAffinity(notebookDocument, NotebookControllerAffinity.Default);

                // Auto-Select Python REPL Kernel
                await commands.executeCommand('notebook.selectKernel', {
                    notebookEditor,
                    id: notebookController?.id,
                    extension: PVSC_EXTENSION_ID,
                });

                const notebookCellData = new NotebookCellData(NotebookCellKind.Code, code as string, 'python');
                const { cellCount } = notebookDocument;
                // Add new cell to interactive window document
                const notebookEdit = NotebookEdit.insertCells(cellCount, [notebookCellData]);
                const workspaceEdit = new WorkspaceEdit();
                workspaceEdit.set(notebookDocument.uri, [notebookEdit]);
                workspace.applyEdit(workspaceEdit);


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

                workspace.onDidChangeNotebookDocument(e => {
                    const textOutputs = (e.cellChanges
                        .map(x => x.outputs?.map(y => y.items))
                        .flat()
                        .flat()
                        .filter(x => x?.mime === 'text/plain')
                        .filter(x => !!x?.data));

                    const result = textOutputs[0]!.data.toString();
                    if (!result) {
                        return;
                    }
                    // TODO: This ends up writing the result multiple times?
                    writeEmitter.fire(`${result}\r\n${vsc('D', 0)}`);
                    writeEmitter.fire(prompt());

                });

                // Execute the cell
                writeEmitter.fire(`${code}\r\n${vsc('E', code)}${vsc('C')}`);
                commands.executeCommand('notebook.cell.execute', {
                    ranges: [{ start: cellCount, end: cellCount + 1 }],
                    document: ourResource,
                });
            }
        }),
    );
}



// let server: PythonServer;
// let terminal: Terminal;
// let pty: Pseudoterminal;
// const writeEmitter = new EventEmitter<string>();
// const closeEmitter = new EventEmitter<number | undefined>();

// export async function registerReplCommands(
//     disposables: Disposable[],
//     interpreterService: IInterpreterService,
// ): Promise<void> {
//     disposables.push(
//         commands.registerCommand(Commands.Exec_In_REPL, async (uri: Uri) => {
//             const interpreter = await interpreterService.getActiveInterpreter(uri);
//             if (interpreter) {
//                 const interpreterPath = interpreter.path;
//                 if (!server) {
//                     server = createPythonServer([interpreterPath]);
//                 }

//                 const activeEditor = window.activeTextEditor as TextEditor;
//                 const code = await getSelectedTextToExecute(activeEditor) ?? '';

//                 await new Promise<void>((resolve) => {
//                     if (terminal) {
//                         resolve();
//                         return;
//                     }
//                     pty = {
//                         onDidWrite: writeEmitter.event,
//                         onDidClose: closeEmitter.event,
//                         open: () => {
//                             writeEmitter.fire(prompt());
//                             resolve()
//                         },
//                         close: () => console.log('close'),
//                         handleInput(data) {
//                             // TODO: Impl execution of input

//                             // Trigger intellisense with fake results
//                             const completions = [
//                                 { CompletionText: 'def', ListItemText: 'def', ResultType: 3, ToolTip: 'def' },
//                                 { CompletionText: 'del', ListItemText: 'del', ResultType: 3, ToolTip: 'del' },
//                                 { CompletionText: 'delattr', ListItemText: 'delattr', ResultType: 3, ToolTip: 'delattr' },
//                                 { CompletionText: 'dir', ListItemText: 'dir', ResultType: 6, ToolTip: 'dir' },
//                                 { CompletionText: 'divmod', ListItemText: 'divmod', ResultType: 6, ToolTip: 'divmod' },
//                                 { CompletionText: 'DeprecationWarning', ListItemText: 'DeprecationWarning', ResultType: 6, ToolTip: 'DeprecationWarning' },
//                                 { CompletionText: '__dict__', ListItemText: '__dict__', ResultType: 9, ToolTip: '__dict__' },
//                                 { CompletionText: '__doc__', ListItemText: '__doc__', ResultType: 9, ToolTip: '__doc__' },
//                                 { CompletionText: 'ZeroDivisionError', ListItemText: 'ZeroDivisionError', ResultType: 3, ToolTip: 'ZeroDivisionError' },
//                                 { CompletionText: 'PendingDeprecationWarning', ListItemText: 'PendingDeprecationWarning', ResultType: 3, ToolTip: 'PendingDeprecationWarning' },
//                                 { CompletionText: 'UnicodeDecodeError', ListItemText: 'UnicodeDecodeError', ResultType: 3, ToolTip: 'UnicodeDecodeError' },
//                             ];
//                             writeEmitter.fire(`${data}${vsc('Completions', 0, 1, 1, JSON.stringify(completions))}`)
//                         },
//                     };
//                     terminal = window.createTerminal({ name: 'Python REPL', pty });
//                 });
//                 terminal.show();

//                 writeEmitter.fire(`${code}\r\n${vsc('E', code)}${vsc('C')}`);
//                 const result = await server.execute(code);
//                 writeEmitter.fire(`${result}\r\n${vsc('D', 0)}`);
//                 writeEmitter.fire(prompt());
//             }
//         }),
//     );
// }

function prompt(): string {
    return `${vsc('A')}>>> ${vsc('B')}`;
}

function vsc(...params: (string | number)[]): string {
    return `\x1b]633;${params.join(';')}\x07`;
}
