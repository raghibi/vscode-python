import {
    commands,
    NotebookController,
    Uri,
    workspace,
    window,
    NotebookControllerAffinity,
    ViewColumn,
    NotebookEdit,
    NotebookCellData,
    NotebookCellKind,
    WorkspaceEdit,
    NotebookEditor,
    Range,
    TextEditor,
    Position,
} from 'vscode';
import { Disposable } from 'vscode-jsonrpc';
import { Commands, PVSC_EXTENSION_ID } from '../common/constants';
import { IInterpreterService } from '../interpreter/contracts';
import { getMultiLineSelectionText, getSingleLineSelectionText } from '../terminals/codeExecution/helper';
import { createReplController } from './replController';

let ourController: NotebookController | undefined;
let ourNotebookEditor: NotebookEditor | undefined;

// a.py in REPL.
// b.py run in REPL
// Uri to notebookEditor if we want separate REPL for each file.

// when you reload window, in REPL editor is it restored...
// cache binding uri to python..5

// figure out way to put markdown telling user kernel has been dead and need to pick again.

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

export async function registerReplCommands(disposables: Disposable[], interpreterService: IInterpreterService): void {
    disposables.push(
        commands.registerCommand(Commands.Exec_In_REPL, async (uri: Uri) => {
            const interpreter = await interpreterService.getActiveInterpreter(uri);
            if (interpreter) {
                const interpreterPath = interpreter.path;
                // How do we get instance of interactive window from Python extension?
                if (!ourController) {
                    ourController = createReplController(interpreterPath);
                }
                const activeEditor = window.activeTextEditor as TextEditor;

                const code = await getSelectedTextToExecute(activeEditor);
            }

            const ourResource = Uri.from({ scheme: 'untitled', path: 'repl.interactive' });
            // How to go from user clicking Run Python --> Run selection/line via Python REPL -> IW opening
            const notebookDocument = await workspace.openNotebookDocument(ourResource);
            // We want to keep notebookEditor, whenever we want to run.
            // Find interactive window, or open it.
            if (!ourNotebookEditor) {
                ourNotebookEditor = await window.showNotebookDocument(notebookDocument, {
                    viewColumn: ViewColumn.Beside,
                });
            }

            ourController!.updateNotebookAffinity(notebookDocument, NotebookControllerAffinity.Default);
            // await commands.executeCommand(
            //     'interactive.open',
            //     // Keep focus on the owning file if there is one
            //     { viewColum: 1, preserveFocus: true },
            //     ourResource,
            //     ourController?.id,
            //     'Python REPL',
            // );

            // Auto-Select Python REPL Kernel
            await commands.executeCommand('notebook.selectKernel', {
                ourNotebookEditor,
                id: ourController?.id,
                extension: PVSC_EXTENSION_ID,
            });

            // Add new cell to interactive window document
            const notebookCellData = new NotebookCellData(NotebookCellKind.Code, 'x=5', 'python'); // this is manual atm but need to pass in user input here
            const { cellCount } = notebookDocument;
            const notebookEdit = NotebookEdit.insertCells(cellCount, [notebookCellData]);
            const workspaceEdit = new WorkspaceEdit();
            workspaceEdit.set(notebookDocument.uri, [notebookEdit]);
            workspace.applyEdit(workspaceEdit);

            // const notebookCellExecution = ourController!.createNotebookCellExecution(
            //     notebookDocument.cellAt(cellCount),
            // );
            // notebookCellExecution.start(Date.now());
            // notebookCellExecution.end(true);

            // Execute the cell
            commands.executeCommand('notebook.cell.execute', {
                ranges: [{ start: cellCount, end: cellCount + 1 }],
                document: ourResource,
            });

            // event fire our executeHandler we made for notebook controller

            // NEED TO TELL TO EXECUTE THE CELL WHICH WILL CALL MY HANDLER

            // args: [
            //     {
            //         name: 'showOptions',
            //         description: 'Show Options',
            //         schema: {
            //             type: 'object',
            //             properties: {
            //                 'viewColumn': {
            //                     type: 'number',
            //                     default: -1
            //                 },
            //                 'preserveFocus': {
            //                     type: 'boolean',
            //                     default: true
            //                 }
            //             },
            //         }
            //     },
            //     {
            //         name: 'resource',
            //         description: 'Interactive resource Uri',
            //         isOptional: true
            //     },
            //     {
            //         name: 'controllerId',
            //         description: 'Notebook controller Id',
            //         isOptional: true
            //     },
            //     {
            //         name: 'title',
            //         description: 'Notebook editor title',
            //         isOptional: true
            //     }
            // ]
        }),
    );
}

// debugger
// read code, use tools like hover, doc
// think through

// ask questions
// write down what you know
// write down what you don't know
// write down what you think you know
