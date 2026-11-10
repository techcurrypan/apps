# 作り物の網の web の機械（tools-real/worlds/net.json の site）。記録のときだけ CI の機械で動かす。
#   python3 -I web.py <net.json> <待ち受けるアドレス> <今の時刻を書いたファイル>
# 応答は net.json の通り。Date は記録の行の時刻（record.ts が行ごとにファイルへ書く）。模擬（src/lib/tools/shell/net.ts）も同じ物を読む。
import email.utils, json, socket, sys

world = json.load(open(sys.argv[1], encoding="utf-8"))
site = world["net"]["site"]
addr = sys.argv[2]
now_file = sys.argv[3]


def response(method, path, headers):
    page = site["pages"].get(path, site["pages"]["*"])
    status, reason = page["status"], page["reason"]
    head = [("Server", site["server"]), ("Date", email.utils.formatdate(int(open(now_file).read().strip()), usegmt=True))]
    extra = list(map(tuple, page["headers"]))
    body = page["body"].encode("utf-8")
    etag = page.get("etag")
    if etag and headers.get("if-none-match") == etag:
        status, reason = 304, "Not Modified"
        extra = [h for h in extra if h[0] in ("Cache-Control", "ETag")]
        body = b""
    head += extra
    if status != 304:
        head.append(("Content-Length", str(len(body))))
    lines = [f"HTTP/1.1 {status} {reason}"] + [f"{k}: {v}" for k, v in head]
    data = ("\r\n".join(lines) + "\r\n\r\n").encode("ascii")
    return data + (b"" if method == "HEAD" else body)


srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
srv.bind((addr, 80))
srv.listen(16)
while True:
    conn, _ = srv.accept()
    with conn:
        buf = b""
        while b"\r\n\r\n" not in buf:
            chunk = conn.recv(4096)
            if not chunk:
                break
            buf += chunk
        if not buf:
            continue
        head = buf.split(b"\r\n\r\n", 1)[0].decode("latin-1").split("\r\n")
        method, path, _ = head[0].split(" ", 2)
        hs = {}
        for line in head[1:]:
            k, _, v = line.partition(":")
            hs[k.strip().lower()] = v.strip()
        conn.sendall(response(method, path, hs))
