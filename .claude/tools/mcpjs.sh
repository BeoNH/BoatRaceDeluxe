#!/bin/sh
# Chạy 1 file JavaScript qua MCP execute_javascript. Dùng: sh .claude/tools/mcpjs.sh <scene|editor> <file.js>
# File JS là thân hàm async; `return` giá trị để nhận kết quả (JSON).
DIR=$(dirname "$0")
ARGS=$(python -I -c "import json,sys;print(json.dumps({'context':sys.argv[1],'code':open(sys.argv[2],encoding='utf8').read()}))" "$1" "$2")
sh "$DIR/mcp.sh" execute_javascript "$ARGS" | python -I -c "
import sys, json
t = sys.stdin.read(); t = t[t.find('{'):]
try:
    r = json.loads(t)['result']
    print(json.dumps(r.get('structuredContent', r), ensure_ascii=False)[:4000])
except Exception:
    print(t[:2000])
"
