"""Small Tripo API client with a spend log.

Usage:
  python tripo_client.py balance
  python tripo_client.py model <image.png> <name>      image to 3D model
  python tripo_client.py status <task_id>
  python tripo_client.py wait <task_id> <name> [label]  poll, then download the result
  python tripo_client.py task '<json>' <name> <label>   any task body, logged
"""
import json, os, sys, time, datetime, urllib.request

API = "https://api.tripo3d.ai/v2/openapi"
KEY = os.environ["TRIPO_API_KEY"]
HERE = os.path.dirname(os.path.abspath(__file__))
LOG = os.path.join(HERE, "spend-log.md")
RESERVE = 170  # credits kept for retries, see GAME-PLAN.md


def req(method, path, body=None, headers=None, raw=None):
    h = {"Authorization": f"Bearer {KEY}"}
    if headers:
        h.update(headers)
    data = raw
    if body is not None:
        data = json.dumps(body).encode()
        h["Content-Type"] = "application/json"
    r = urllib.request.Request(API + path, data=data, method=method, headers=h)
    with urllib.request.urlopen(r, timeout=120) as resp:
        out = json.loads(resp.read())
    if out.get("code") != 0:
        raise SystemExit(f"Tripo error: {out}")
    return out["data"]


def balance():
    return req("GET", "/user/balance")["balance"]


def log(line):
    new = not os.path.exists(LOG)
    with open(LOG, "a") as f:
        if new:
            f.write("# Tripo spend log\n\n| Time (UTC) | Name | Step | Task | Balance before | Balance after | Cost |\n|---|---|---|---|---|---|---|\n")
        f.write(line + "\n")


def upload(path):
    boundary = "----tripo" + str(int(time.time()))
    with open(path, "rb") as f:
        content = f.read()
    body = (f"--{boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"{os.path.basename(path)}\"\r\n"
            f"Content-Type: image/png\r\n\r\n").encode() + content + f"\r\n--{boundary}--\r\n".encode()
    d = req("POST", "/upload", headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}, raw=body)
    return d["image_token"]


def start(body, name, label):
    before = balance()
    if before < RESERVE:
        raise SystemExit(f"Balance {before} is below the reserve of {RESERVE}. Ask before spending.")
    tid = req("POST", "/task", body)["task_id"]
    now = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M")
    log(f"| {now} | {name} | {label} | `{tid}` | {before} | pending | pending |")
    print(tid)
    return tid, before


def wait(tid, name, label=""):
    while True:
        d = req("GET", f"/task/{tid}")
        st = d.get("status")
        print(st, d.get("progress"), flush=True)
        if st in ("success", "failed", "cancelled", "banned", "expired", "unknown"):
            break
        time.sleep(10)
    after = balance()
    # fill in the pending row for this task
    if os.path.exists(LOG):
        lines = open(LOG).read().splitlines()
        for i, l in enumerate(lines):
            if f"`{tid}`" in l and "pending" in l:
                cells = [c.strip() for c in l.strip("|").split("|")]
                before = int(cells[4])
                cells[5] = str(after)
                # the task's own figure is exact even when several tasks overlap
                cells[6] = str(d.get("consumed_credit", before - after))
                lines[i] = "| " + " | ".join(cells) + " |"
        open(LOG, "w").write("\n".join(lines) + "\n")
    json.dump(d, open(os.path.join(HERE, "raw", f"{name}-{label or 'task'}.json"), "w"), indent=2)
    if st != "success":
        raise SystemExit(f"Task ended with status {st}")
    out = d.get("output", {})
    for key in ("pbr_model", "model", "base_model"):
        url = out.get(key)
        if url:
            dest = os.path.join(HERE, "raw", f"{name}-{label or 'task'}.glb")
            urllib.request.urlretrieve(url, dest)
            print("saved", dest, os.path.getsize(dest))
            break
    return d


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "balance":
        print(balance())
    elif cmd == "model":
        img, name = sys.argv[2], sys.argv[3]
        tok = upload(img)
        start({"type": "image_to_model", "file": {"type": "png", "file_token": tok},
               "texture": True, "pbr": True}, name, "model")
    elif cmd == "task":
        start(json.loads(sys.argv[2]), sys.argv[3], sys.argv[4])
    elif cmd == "status":
        print(json.dumps(req("GET", f"/task/{sys.argv[2]}"), indent=2))
    elif cmd == "wait":
        wait(sys.argv[2], sys.argv[3], sys.argv[4] if len(sys.argv) > 4 else "")
