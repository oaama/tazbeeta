#!/usr/bin/env python3
"""Turn a Tazbeeta backup JSON into SQL for the D1 docs table.
Usage: python3 restore.py backup.json > restore.sql
Then: npx wrangler d1 execute <DB> --remote --file restore.sql
(restore into a fresh or empty database; it replaces rows with the same key)."""
import json, sys
b = json.load(open(sys.argv[1]))
q = lambda s: "'" + s.replace("'", "''") + "'"
print("CREATE TABLE IF NOT EXISTS docs (c TEXT NOT NULL, id TEXT NOT NULL, doc TEXT NOT NULL, PRIMARY KEY (c, id));")
for r in b["docs"]:
    print("INSERT OR REPLACE INTO docs (c, id, doc) VALUES (%s, %s, %s);" % (q(r["c"]), q(r["id"]), q(json.dumps(r["doc"], ensure_ascii=False, separators=(",", ":")))))
