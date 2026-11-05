#!/bin/sh
# Type-check qua Cocos MCP (run_script_diagnostics), chỉ in lỗi thuộc assets/ (bỏ noise d.ts của engine).
# Cần Cocos Creator đang mở project. Dùng: sh .claude/tools/tsc.sh
DIR=$(dirname "$0")
MCP_TIMEOUT=180 sh "$DIR/mcp.sh" run_script_diagnostics '{}' | python -I -c "
import sys, json
t = sys.stdin.read(); t = t[t.find('{'):]
try:
    d = json.loads(t)['result']['structuredContent']['data']
except Exception:
    print('MCP unavailable or bad response:', t[:300]); sys.exit(2)
errs = [x for x in d.get('diagnostics', []) if ('/' + x['file'].replace(chr(92), '/')).find('/assets/') >= 0 and 'ProgramData' not in x['file']]
for x in errs:
    print(f\"{x['file'].split('/assets/')[-1]}:{x['line']}:{x['column']} {x['code']} {x['message']}\")
print(f'{len(errs)} project error(s)')
sys.exit(1 if errs else 0)
"
