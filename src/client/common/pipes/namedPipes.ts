// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import * as crypto from 'crypto';
import * as net from 'net';
import * as os from 'os';
import * as path from 'path';
import * as rpc from 'vscode-jsonrpc/node';
import { traceVerbose } from '../../logging';

export interface NamesPipeConnected {
    onConnected(): Promise<[rpc.MessageReader, rpc.MessageWriter]>;
}

export function createNamedPipeServer(pipeName: string): Promise<NamesPipeConnected> {
    traceVerbose(`Creating named pipe server on ${pipeName}`);
    let connectResolve: (value: [rpc.MessageReader, rpc.MessageWriter]) => void;
    const connected = new Promise<[rpc.MessageReader, rpc.MessageWriter]>((resolve, _reject) => {
        connectResolve = resolve;
    });
    return new Promise((resolve, reject) => {
        const server = net.createServer((socket) => {
            server.close();
            connectResolve([
                new rpc.SocketMessageReader(socket, 'utf-8'),
                new rpc.SocketMessageWriter(socket, 'utf-8'),
            ]);
        });
        server.on('error', reject);
        server.listen(pipeName, () => {
            server.removeListener('error', reject);
            resolve({
                onConnected: () => connected,
            });
        });
    });
}

const { XDG_RUNTIME_DIR } = process.env;
export function generateRandomPipeName(prefix: string): string {
    // length of 10 picked because of the name length restriction for sockets
    const randomSuffix = crypto.randomBytes(10).toString('hex');
    if (prefix.length === 0) {
        prefix = 'python-ext-rpc';
    }

    if (process.platform === 'win32') {
        return `\\\\.\\pipe\\${prefix}-${randomSuffix}-sock`;
    }

    let result;
    if (XDG_RUNTIME_DIR) {
        result = path.join(XDG_RUNTIME_DIR, `${prefix}-${randomSuffix}.sock`);
    } else {
        result = path.join(os.tmpdir(), `${prefix}-${randomSuffix}.sock`);
    }

    return result;
}
