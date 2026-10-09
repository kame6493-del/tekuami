"""dist を静的に配る小さなサーバー(Windows の MIME 誤りを直す)。with serve('dist') as base: ..."""
import contextlib, functools, http.server, socketserver, threading

class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map,
                      '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
                      '.html': 'text/html', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json'}
    def log_message(self, *a):
        pass

class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True

@contextlib.contextmanager
def serve(root):
    srv = Server(('127.0.0.1', 0), functools.partial(Handler, directory=root))
    t = threading.Thread(target=srv.serve_forever, daemon=True)
    t.start()
    try:
        yield f'http://127.0.0.1:{srv.server_address[1]}'
    finally:
        srv.shutdown()
