# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License.

import asyncio
import io
import json
import os
import pathlib
import socket
import subprocess
import sys
import threading
from typing import Any, Dict, List, Optional, Tuple


script_dir = pathlib.Path(__file__).parent.parent.parent
script_dir_child = pathlib.Path(__file__).parent.parent
sys.path.append(os.fspath(script_dir))
sys.path.append(os.fspath(script_dir_child))
sys.path.append(os.fspath(script_dir / "lib" / "python"))
print("sys add path", script_dir)
TEST_DATA_PATH = pathlib.Path(__file__).parent / ".data"
# from testing_tools.socket_manager import PipeManager
from tests.pytestadapter.helpers_new import (
    SingleConnectionPipeServer,
    generate_random_pipe_name,
)


# class PipeManager:
#     def __init__(self, name):
#         self.name = name

#     def __enter__(self):
#         return self.connect()

#     def __exit__(self, *_):
#         self.close()

#     def connect(self):
#         if sys.platform == "win32":
#             self._writer = open(self.name, "wt", encoding="utf-8")
#         else:
#             self._socket = _SOCKET(socket.AF_UNIX, socket.SOCK_STREAM)
#         self._socket.connect(self.name)
#         return self

#     def close(self):
#         if sys.platform == "win32":
#             self._writer.close()
#         else:
#             # add exception catch
#             self._socket.close()

#     def write(self, data: str):
#         # must include the carriage-return defined (as \r\n) for unix systems
#         request = f"""content-length: {len(data)}\r\ncontent-type: application/json\r\n\r\n{data}"""
#         if sys.platform == "win32":
#             self._writer.write(request)
#             self._writer.flush()
#         else:
#             self._socket.send(request.encode("utf-8"))
#             # does this also need a flush on the socket?

#     def read(self, bufsize=1024):
#         """Read data from the socket.

#         Args:
#             bufsize (int): Number of bytes to read from the socket.

#         Returns:
#             data (bytes): Data received from the socket.
#         """
#         if sys.platform == "win32":
#             return self._reader.read(bufsize)
#         else:
#             data = b""
#             while True:
#                 part = self._socket.recv(bufsize)
#                 data += part
#                 if len(part) < bufsize:
#                     # No more data, or less than bufsize data received
#                     break
#             return data


class PipeManager:
    def __init__(self, name):
        self.name = name

    def __enter__(self):
        return self.listen()

    def __exit__(self, *_):
        self.close()

    def listen(self):
        # find library that creates named pipes for windows

        if sys.platform == "win32":
            # create a pipe
            # create a reader, writer stream from the pipe
            # no return (just set _reader and _writer)

            pipe_name = r"\\.\pipe\mypipe"

            # pipe = win32pipe.CreateNamedPipe(
            #     pipe_name,
            #     win32pipe.PIPE_ACCESS_DUPLEX,
            #     win32pipe.PIPE_TYPE_MESSAGE
            #     | win32pipe.PIPE_READMODE_MESSAGE
            #     | win32pipe.PIPE_WAIT,
            #     1,
            #     65536,
            #     65536,
            #     0,
            #     None,
            # )

            # if pipe == -1:
            #     print("Failed to create named pipe, in test helper file. Exiting.")
            # else:
            #     print(f"Named pipe {pipe_name} created")

            # win32pipe.ConnectNamedPipe(pipe, None)
            # self._reader = NamedPipeReader(pipe)
            # self._writer = NamedPipeWriter(pipe)

        else:
            server = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            server.listen(self.name)  # self.name = named pipe
            (
                _sock,
                _,
            ) = (
                server.accept()
            )  # occurs when client connects, returns a socket (_sock) which will be used for this specific
            # client and server connection
            self._socket = _sock
        return self

    def close(self):
        if sys.platform == "win32":
            self._writer.close()
            # close the streams and the pipe
        else:
            # add exception catch
            self._socket.close()

    def write(self, data: str):
        # must include the carriage-return defined (as \r\n) for unix systems
        request = f"""content-length: {len(data)}\r\ncontent-type: application/json\r\n\r\n{data}"""
        if sys.platform == "win32":
            # this should work
            self._writer.write(request)
            self._writer.flush()
        else:
            self._socket.send(request.encode("utf-8"))
            # does this also need a flush on the socket?

    def read(self, bufsize=1024):
        """Read data from the socket.

        Args:
            bufsize (int): Number of bytes to read from the socket.

        Returns:
            data (bytes): Data received from the socket.
        """
        if sys.platform == "win32":
            # this should work
            return self._reader.read(bufsize)
        else:
            data = b""
            while True:
                part = self._socket.recv(bufsize)
                data += part
                if len(part) < bufsize:
                    # No more data, or less than bufsize data received
                    break
            return data


def get_absolute_test_id(test_id: str, testPath: pathlib.Path) -> str:
    split_id = test_id.split("::")[1:]
    absolute_test_id = "::".join([str(testPath), *split_id])
    print("absolute path", absolute_test_id)
    return absolute_test_id


async def create_pipe(test_run_pipe: str) -> socket.socket:
    __pipe = PipeManager(test_run_pipe)
    return __pipe


CONTENT_LENGTH: str = "Content-Length:"


# def process_rpc_message(data: str) -> Tuple[Dict[str, Any], str]:
#     """Process the JSON data which comes from the server which runs the pytest discovery."""
#     str_stream: io.StringIO = io.StringIO(data)

#     length: int = 124 * 140

#     while True:
#         line: str = str_stream.readline()
#         if "jsonrpc" not in line.lower():
#             raise ValueError("Header does not contain jsonrpc")
#         else:
#             break

#     while True:
#         line: str = str_stream.readline()
#         if not line or line.isspace():
#             break

#     raw_json: str = str_stream.read(length)
#     return json.loads(raw_json), str_stream.read()


def process_rpc_json(data: List[str]) -> List[Dict[str, Any]]:
    """Process the JSON data which comes from the server which runs the pytest discovery."""
    json_messages = []
    delimiter = '{"jsonrpc": "2.0",'
    for i in data:
        if delimiter not in i.lower():
            raise ValueError("Header does not contain jsonrpc")
        elif i.count(delimiter) > 1:
            raise ValueError("too many jsons, must split")
            # split_data = i.split(delimiter)
        else:
            try:
                j = json.loads(i)
                if "params" in j:
                    json_messages.append(j.get("params"))
                else:
                    raise ValueError("No params in json")
            except json.JSONDecodeError:
                print("json decode error")
                print("attempting to decode", i)
                raise
    return json_messages


def _listen_on_pipe_new(listener, result: List[str], completed: threading.Event):
    """Listen on the named pipe or Unix domain socket for JSON data from the server.
    Created as a separate function for clarity in threading context.
    """
    # Accept a connection. Note: For named pipes, the accept method might be different.
    connection, _ = listener.socket.accept()
    listener.socket.settimeout(1)

    while True:
        # Reading from connection
        data = connection.recv(
            1024 * 1024
        )  # You might replace this with connection.read() based on your abstraction
        if not data:
            if completed.is_set():
                break  # Exit loop if completed event is set
            else:
                try:
                    # Attempt to accept another connection if the current one closes unexpectedly
                    connection, _ = listener.socket.accept()
                except socket.timeout:
                    # On timeout, append all collected data to result and return
                    # result.append("".join(all_data))
                    return
        else:
            result.append(data.decode("utf-8"))
    # result  # .append("".join(all_data))


def runner(args: List[str]) -> Optional[List[Dict[str, Any]]]:
    """Run the pytest discovery and return the JSON data from the server."""
    return runner_with_cwd(args, TEST_DATA_PATH)


def runner_with_cwd(
    args: List[str], path: pathlib.Path
) -> Optional[List[Dict[str, Any]]]:
    """Run the pytest discovery and return the JSON data from the server."""
    process_args: List[str] = [
        sys.executable,
        "-m",
        "pytest",
        "-p",
        "vscode_pytest",
        "-s",
    ] + args

    # create a pipe with the pipe manager
    # when I create it will listen
    # Example usage
    # Replace '/tmp/example.sock' with a Windows-compatible path for named pipes if on Windows.
    pipe_name = generate_random_pipe_name("pytest-discovery-test")
    print("pipe name generated", pipe_name)
    server = SingleConnectionPipeServer(pipe_name)
    server.start()

    env = os.environ.copy()
    env.update(
        {
            "TEST_RUN_PIPE": pipe_name,
            "PYTHONPATH": os.fspath(pathlib.Path(__file__).parent.parent.parent),
        }
    )
    completed = threading.Event()

    result = []
    t1: threading.Thread = threading.Thread(
        target=_listen_on_pipe_new, args=(server, result, completed)
    )
    t1.start()

    t2 = threading.Thread(
        target=_run_test_code,
        args=(process_args, env, path, completed),
    )
    t2.start()

    t1.join()
    t2.join()

    return process_rpc_json(result) if result else None


def _listen_on_pipe(
    listener: socket.socket, result: List[str], completed: threading.Event
):
    """Listen on the pipe for the JSON data from the server."""
    with listener as reader:
        # Read data from the pipe
        data = reader.read()
        print(data)


def _run_test_code(
    proc_args: List[str], proc_env, proc_cwd: str, completed: threading.Event
):
    result = subprocess.run(proc_args, env=proc_env, cwd=proc_cwd)
    completed.set()
    return result


def find_test_line_number(test_name: str, test_file_path) -> str:
    """Function which finds the correct line number for a test by looking for the "test_marker--[test_name]" string.

    The test_name is split on the "[" character to remove the parameterization information.

    Args:
    test_name: The name of the test to find the line number for, will be unique per file.
    test_file_path: The path to the test file where the test is located.
    """
    test_file_unique_id: str = "test_marker--" + test_name.split("[")[0]
    with open(test_file_path) as f:
        for i, line in enumerate(f):
            if test_file_unique_id in line:
                return str(i + 1)
    error_str: str = f"Test {test_name!r} not found on any line in {test_file_path}"
    raise ValueError(error_str)
