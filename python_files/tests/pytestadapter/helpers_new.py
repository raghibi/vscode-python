# Generates a random name for a pipe, taking into account the platform specifics.
from ast import List
import os
import tempfile
import threading
from typing import IO
import uuid
import socket
import sys
from namedpipe import NPopen
import subprocess as sp
import win32pipe


def generate_random_pipe_name(prefix=""):
    # Generate a random suffix using UUID4, ensuring uniqueness.
    random_suffix = uuid.uuid4().hex[:10]
    # Default prefix if not provided.
    if not prefix:
        prefix = "python-ext-rpc"

    # For Windows, named pipes have a specific naming convention.
    if os.name == "nt":
        return f"\\\\.\\pipe\\{prefix}-{random_suffix}-sock"

    # For Unix-like systems, use either the XDG_RUNTIME_DIR or a temporary directory.
    xdg_runtime_dir = os.getenv("XDG_RUNTIME_DIR")
    if xdg_runtime_dir:
        return os.path.join(xdg_runtime_dir, f"{prefix}-{random_suffix}.sock")
    else:
        return os.path.join(tempfile.gettempdir(), f"{prefix}-{random_suffix}.sock")


# Create a server socket for the given pipe name.
class SingleConnectionPipeServer:
    def __init__(self, name):
        self.name = name
        self.is_windows = sys.platform == "win32"
        if self.is_windows:
            # Windows-specific setup for named pipe not shown here;
            # Named pipes in Python on Windows might require win32pipe or similar.
            with NPopen(mode="rt", name=name) as pipe:  # Added a `name` parameter
                print("pipe?", pipe)
                self.pipe = pipe
                # self.stream: IO | None = pipe.wait()

        else:
            # For Unix-like systems, use a Unix domain socket.
            self.socket = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            # Ensure the socket does not already exist
            try:
                os.unlink(self.name)
            except OSError:
                if os.path.exists(self.name):
                    raise

    def start(self):
        if self.is_windows:
            # Windows-specific named pipe server setup would go here.
            # print("pipe is here I think?", self.stream)
            pass
        else:
            # Bind the socket to the address and listen for incoming connections.
            self.socket.bind(self.name)
            self.socket.listen(1)
            print(f"Server listening on {self.name}")

            # Accept a single connection. remove for now to use the listener
            # self.handle_single_connection()

    def handle_single_connection(self):
        """Accept and handle a single connection."""
        try:
            # Accept a connection.
            connection, client_address = self.socket.accept()
            print(f"Client connected from {client_address}")

            # Enter a loop to read and respond to messages from the client.
            while True:
                data = connection.recv(1024)
                if data:
                    message = data.decode("utf-8")
                    print(f"Received: {message}")
                    # Echo the received data back to the client as an example response.
                    connection.sendall(data)
                else:
                    # No more data from the client, break the loop.
                    break
        finally:
            # Clean up the connection.
            connection.close()
            print("Client disconnected.")

            # After handling the single connection, the server stops listening.
            self.stop()

    def stop(self):
        # Clean up the server socket.
        self.socket.close()
        print("Server stopped.")
