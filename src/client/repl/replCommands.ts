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

            const notebookEditor = await window.showNotebookDocument(notebookDocument, {
                viewColumn: ViewColumn.Beside,
            });

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
                notebookEditor,
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

            const notebookCellExecution = ourController!.createNotebookCellExecution(
                notebookDocument.cellAt(cellCount),
            );
            notebookCellExecution.start(Date.now());
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
