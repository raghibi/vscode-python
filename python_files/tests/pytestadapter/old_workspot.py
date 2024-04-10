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


# def process_rpc_json(data: List[str]) -> List[Dict[str, Any]]:
#     """Process the JSON data which comes from the server which runs the pytest discovery."""
#     json_messages = []
#     delimiter = '{"jsonrpc": "2.0",'
#     for i in data:
#         if delimiter not in i.lower():
#             raise ValueError("Header does not contain jsonrpc")
#         elif i.count(delimiter) > 1:
#             raise ValueError("too many jsons, must split")
#             # split_data = i.split(delimiter)
#         else:
#             try:
#                 j = json.loads(i)
#                 if "params" in j:
#                     json_messages.append(j.get("params"))
#                 else:
#                     raise ValueError("No params in json")
#             except json.JSONDecodeError:
#                 print("json decode error")
#                 print("attempting to decode", i)
#                 raise
#     return json_messages
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

