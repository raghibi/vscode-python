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

export function createNamedPipeServer(pipeName: string): Promise<[rpc.MessageReader, rpc.MessageWriter]> {
    traceVerbose(`Creating named pipe server on ${pipeName}`);
    return new Promise<[rpc.MessageReader, rpc.MessageWriter]>((resolve, reject) => {
        const server = net.createServer((socket) => {
            server.close();
            traceVerbose(`Named pipe server connected on ${pipeName}`);
            resolve([new rpc.SocketMessageReader(socket), new rpc.SocketMessageWriter(socket)]);
        });
        server.on('error', reject);
        server.listen(pipeName, () => {
            server.removeListener('error', reject);
            traceVerbose(`Named pipe server listening on ${pipeName}`);
        });
    });
}

const { XDG_RUNTIME_DIR } = process.env;
export function generateRandomPipeName(prefix: string): string {
    const randomSuffix = crypto.randomBytes(21).toString('hex');
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
