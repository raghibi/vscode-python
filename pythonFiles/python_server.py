# import debugpy
# debugpy.connect(5678)
import sys
import json
import contextlib
import io
import traceback


def send_message(msg: str):
    length_msg = len(msg)
    sys.stdout.buffer.write(
        f"Content-Length: {length_msg}\r\n\r\n{msg}".encode(encoding="utf-8")
    )
    sys.stdout.buffer.flush()


def print_log(msg: str):
    send_message(json.dumps({"jsonrpc": "2.0", "method": "log", "params": msg}))


def send_response(response: dict, response_id: int):
    send_message(json.dumps({"jsonrpc": "2.0", "id": response_id, "result": response}))


def exec_function(user_input):
    try:
        compile(user_input, "<stdin>", "eval")
    except SyntaxError:
        return exec
    return eval


def execute(user_globals, request):
    str_output = CustomIO("<stdout>", encoding="utf-8")
    str_error = CustomIO("<stderr>", encoding="utf-8")

    with redirect_io("stdout", str_output):
        with redirect_io("stderr", str_error):
            str_input = CustomIO("<stdin>", encoding="utf-8", newline="\n")
            with redirect_io("stdin", str_input):
                user_output_globals = exec_user_input(
                    request["id"], request["params"], user_globals
                )
    send_response(str_output.get_value(), request["id"])
    return user_output_globals


def exec_user_input(request_id, user_input, user_globals):
    # have to do redirection
    user_input = user_input[0] if isinstance(user_input, list) else user_input
    user_globals = user_globals.copy()

    try:
        callable = exec_function(user_input)
        retval = callable(user_input, user_globals)
        if retval is not None:
            print(retval)
    except Exception as e:
        send_response(
            {
                "error": {
                    "code": -32603,
                    "message": str(e),
                    "data": traceback.format_exc(),
                },
                "id": request_id,
            }
        )
    return user_globals


class CustomIO(io.TextIOWrapper):
    """Custom stream object to replace stdio."""

    name = None

    def __init__(self, name, encoding="utf-8", newline=None):
        self._buffer = io.BytesIO()
        self._buffer.name = name
        super().__init__(self._buffer, encoding=encoding, newline=newline)

    def close(self):
        """Provide this close method which is used by some tools."""
        # This is intentionally empty.

    def get_value(self) -> str:
        """Returns value from the buffer as string."""
        self.seek(0)
        return self.read()


@contextlib.contextmanager
def redirect_io(stream: str, new_stream):
    """Redirect stdio streams to a custom stream."""
    old_stream = getattr(sys, stream)
    setattr(sys, stream, new_stream)
    yield
    setattr(sys, stream, old_stream)


def get_headers():
    headers = {}
    while line := sys.stdin.readline().strip():
        name, value = line.split(":", 1)
        headers[name] = value.strip()
    return headers


if __name__ == "__main__":
    user_globals = {}
    while not sys.stdin.closed:
        try:
            headers = get_headers()
            content_length = int(headers.get("Content-Length", 0))

            if content_length:
                request_json = json.loads(sys.stdin.read(content_length))
                if request_json["method"] == "execute":
                    user_globals = execute(user_globals, request_json)
                elif request_json["method"] == "exit":
                    sys.exit(0)

        except Exception as e:
            print_log(str(e))
