# 作り物の網の手元の機械で、待ち受けるだけの口を開ける（ss -tuln で見るため。tools-real/worlds/net.json の listen）。
#   python3 -I listen.py <net.json>
import json, signal, socket, sys

world = json.load(open(sys.argv[1], encoding="utf-8"))
socks = []
for l in world["net"]["listen"]:
    kind = socket.SOCK_STREAM if l["proto"] == "tcp" else socket.SOCK_DGRAM
    s = socket.socket(socket.AF_INET, kind)
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    s.bind((l["addr"], l["port"]))
    if kind == socket.SOCK_STREAM:
        s.listen(int(l.get("backlog", 4096)))
    socks.append(s)
signal.pause()
