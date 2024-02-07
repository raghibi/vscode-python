import * as rpc from 'vscode-jsonrpc/node';
import * as net from 'net';
import { ConnectedServerObj } from '../../../client/common/pipes/namedPipes';

export function createListenServer(
    pipeName: string,
    onConnectionCallback: (value: [rpc.MessageReader, rpc.MessageWriter]) => void,
): Promise<ConnectedServerObj> {
    return new Promise((_, reject) => {
        const server = net.createServer((socket) => {
            socket.on('close', () => {
                server.close();
                // upon connection create a reader and writer and pass it to the callback
                onConnectionCallback([
                    new rpc.SocketMessageReader(socket, 'utf-8'),
                    new rpc.SocketMessageWriter(socket, 'utf-8'),
                ]);
            });
        });

        server.listen(pipeName, () => {
            // this function is called when the server is listening
            server.removeListener('error', reject);
            console.log('tail end');
        });
    });
}

export function createServerListener2(
    pipeName: string,
    onConnectionCallback: (value: [rpc.MessageReader, rpc.MessageWriter]) => void,
): Promise<ConnectedServerObj> {
    console.log(`Creating named pipe server on ${pipeName}`);

    let connectionCount = 0;
    return new Promise((resolve, reject) => {
        // create a server, resolves and returns server on listen
        const server = net.createServer((socket) => {
            // this lambda function is called whenever a client connects to the server
            connectionCount += 1;
            console.log('new client is connected to the socket, connectionCount: ', connectionCount, pipeName);
            socket.on('close', () => {
                // close event is emitted by client to the server
                connectionCount -= 1;
                console.log('client emitted close event, connectionCount: ', connectionCount);
                if (connectionCount <= 0) {
                    // if all clients are closed, close the server
                    console.log('connection count is <= 0, closing the server: ', pipeName);
                    server.close();
                }
            });

            // upon connection create a reader and writer and pass it to the callback
            onConnectionCallback([
                new rpc.SocketMessageReader(socket, 'utf-8'),
                new rpc.SocketMessageWriter(socket, 'utf-8'),
            ]);
        });
        const closedServerPromise = new Promise<void>((resolveOnServerClose) => {
            // get executed on connection close and resolves
            // implementation of the promise is the arrow function
            server.on('close', resolveOnServerClose);
        });
        server.on('error', reject);

        server.listen(pipeName, () => {
            // this function is called when the server is listening
            server.removeListener('error', reject);
            const connectedServer = {
                // when onClosed event is called, so is closed function
                // goes backwards up the chain, when resolve2 is called, so is onClosed that means server.onClosed() on the other end can work
                // event C
                serverOnClosePromise: () => closedServerPromise,
            };
            resolve(connectedServer);
        });
    });
}

export async function startListenServer(val: string, pipeName: string): Promise<string> {
    // uses callback so the on connect action occurs after the pipe is created
    await createServerListener2(pipeName, ([_reader, writer]) => {
        console.log('Test Ids named pipe connected');
        writer
            .write({
                jsonrpc: '2.0',
                params: val,
            } as rpc.Message)
            .then(() => {
                writer.end();
            })
            .catch((ex) => {
                console.log('Failed to write test ids to named pipe', ex);
            });
    });
    return pipeName;
}
