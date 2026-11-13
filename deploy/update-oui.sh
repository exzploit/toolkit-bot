#!/usr/bin/env bash
# Rebuild webapp/data/oui.txt (the offline MAC vendor table) from the public IEEE registry.
# The registry changes slowly; running this a couple of times a year is plenty.
# Usage: deploy/update-oui.sh   (then commit the changed file)
set -euo pipefail
cd "$(dirname "$0")/.."
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
curl -fsSL -o "$tmp/oui.csv"   https://standards-oui.ieee.org/oui/oui.csv
curl -fsSL -o "$tmp/mam.csv"   https://standards-oui.ieee.org/oui28/mam.csv
curl -fsSL -o "$tmp/oui36.csv" https://standards-oui.ieee.org/oui36/oui36.csv
python3 - "$tmp" <<'PY'
import csv, sys
d, out = sys.argv[1], {}
for f, reg, ln in (("oui.csv", "MA-L", 6), ("mam.csv", "MA-M", 7), ("oui36.csv", "MA-S", 9)):
    for r in list(csv.reader(open(f"{d}/{f}", encoding="utf-8")))[1:]:
        if r[0] != reg or len(r[1]) != ln:
            continue
        name = " ".join(r[2].split())
        out[r[1].upper()] = "Private" if name.lower().startswith("private") else name
head = "# MAC prefix | vendor. IEEE public registry (MA-L 6 hex, MA-M 7 hex, MA-S 9 hex digits). Refresh: deploy/update-oui.sh\n"
open("webapp/data/oui.txt", "w", encoding="utf-8").write(head + "".join(f"{k}|{v}\n" for k, v in sorted(out.items())))
print(len(out), "prefixes written")
PY
