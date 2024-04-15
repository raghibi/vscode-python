import { commands, Uri } from 'vscode';
import { Disposable } from 'vscode-jsonrpc';
import { Commands } from '../common/constants';
import { IInterpreterService } from '../interpreter/contracts';
import { startRepl } from './replController';

export function registerReplCommands(disposables: Disposable[], interpreterService: IInterpreterService): void {
    disposables.push(
        commands.registerCommand(Commands.Exec_In_REPL, async (uri: Uri) => {
            const interpreter = await interpreterService.getActiveInterpreter(uri);
            if (interpreter) {
                const interpreterPath = interpreter.path;
                // How do we get instance of interactive window from Python extension?
                // How to go from user clicking Run Python --> Run selection/line via Python REPL -> IW opening

                // TODO: Find interactive window, or open it

                // TODO: Add new cell to interactive window document

                // TODO: Set REPL server on interactive window. Make sure REPL server is running

                // TODO: execute the cell
            }
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
