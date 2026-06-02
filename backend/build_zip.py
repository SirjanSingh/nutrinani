import os, zipfile

root = os.path.dirname(os.path.abspath(__file__))
out = os.path.join(root, "function-vertex.zip")
if os.path.exists(out):
    os.remove(out)

include_files = ["index.js", "gcp-wif-config.json"]

with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for f in include_files:
        z.write(os.path.join(root, f), f)
    nm = os.path.join(root, "node_modules")
    for dirpath, _dirs, files in os.walk(nm):
        for name in files:
            full = os.path.join(dirpath, name)
            arc = os.path.relpath(full, root)
            z.write(full, arc)

with zipfile.ZipFile(out) as z:
    names = z.namelist()
    print("entries:", len(names))
    print("has index.js:", "index.js" in names)
    print("has gcp-wif-config.json:", "gcp-wif-config.json" in names)
    print("has google-auth-library:", any(n.startswith("node_modules/google-auth-library/") for n in names))
    print("backslash entries:", sum(1 for n in names if "\\" in n))
    print("size bytes:", os.path.getsize(out))
