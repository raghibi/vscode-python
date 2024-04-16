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
} from 'vscode';
import { Disposable } from 'vscode-jsonrpc';
import { Commands, PVSC_EXTENSION_ID } from '../common/constants';
import { IInterpreterService } from '../interpreter/contracts';
import { createReplController, startRepl } from './replController';

let ourController: NotebookController | undefined;
let ourNotebookEditor: NotebookEditor | undefined;

// a.py in REPL.
// b.py run in REPL
// Uri to notebookEditor if we want separate REPL for each file.

// when you reload window, in REPL editor is it restored...
// cache binding uri to python..5

// figure out way to put markdown telling user kernel has been dead and need to pick again.

export function registerReplCommands(disposables: Disposable[], interpreterService: IInterpreterService): void {
    disposables.push(
        commands.registerCommand(Commands.Exec_In_REPL, async (uri: Uri) => {
            const interpreter = await interpreterService.getActiveInterpreter(uri);
            if (interpreter) {
                const interpreterPath = interpreter.path;
                // How do we get instance of interactive window from Python extension?
                if (!ourController) {
                    ourController = createReplController(interpreterPath);
                }

                // How to go from user clicking Run Python --> Run selection/line via Python REPL -> IW opening

                // TODO: Find interactive window, or open it

                // TODO: Add new cell to interactive window document

                // TODO: Set REPL server on interactive window. Make sure REPL server is running

                // TODO: execute the cell
            }
            // workspace.onDidOpenNotebookDocument;
            const ourResource = Uri.from({ scheme: 'untitled', path: 'repl.interactive' });
            const notebookDocument = await workspace.openNotebookDocument(ourResource);

            // We want to keep notebookEditor, whenever we want to run.
            if (!ourNotebookEditor) {
                ourNotebookEditor = await window.showNotebookDocument(notebookDocument, {
                    viewColumn: ViewColumn.Beside,
                });
            }
            // ourNotebookEditor = await window.showNotebookDocument(notebookDocument, {
            //     viewColumn: ViewColumn.Beside,
            // });

            ourController!.updateNotebookAffinity(notebookDocument, NotebookControllerAffinity.Default);
            // await commands.executeCommand(
            //     'interactive.open',
            //     // Keep focus on the owning file if there is one
            //     { viewColum: 1, preserveFocus: true },
            //     ourResource,
            //     ourController?.id,
            //     'Python REPL',
            // );

            await commands.executeCommand('notebook.selectKernel', {
                ourNotebookEditor,
                id: ourController?.id,
                extension: PVSC_EXTENSION_ID,
            });

            const notebookCellData = new NotebookCellData(NotebookCellKind.Code, 'x=5', 'python');
            // keep counter
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
