# 標準出力だけを擬似端末（幅 80・高さ 24）につないで bash -c を走らせ、出た物をそのまま書き出す。
# 標準エラーは呼ぶ側がファイルへ向ける。record.ts から呼ぶ（CI の上だけ）。
#   python3 pty.py <書き出す先> <bash に渡す台本>
import fcntl, os, pty, struct, subprocess, sys, termios

out_path, script = sys.argv[1], sys.argv[2]
master, slave = pty.openpty()
fcntl.ioctl(slave, termios.TIOCSWINSZ, struct.pack("HHHH", 24, 80, 0, 0))
p = subprocess.Popen(["bash", "--norc", "--noprofile", "-c", script], stdin=subprocess.DEVNULL, stdout=slave, stderr=sys.stderr)
os.close(slave)
chunks = []
while True:
    try:
        b = os.read(master, 4096)
    except OSError:
        break
    if not b:
        break
    chunks.append(b)
p.wait()
with open(out_path, "wb") as f:
    f.write(b"".join(chunks))
sys.exit(0)
