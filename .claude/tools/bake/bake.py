import json, os, re, sys, urllib.request
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
PORT = os.environ.get('MCP_PORT', '21458')
CACHE = os.path.join(HERE, '.cache', 'uuids.json')


def call_js(ctx, code):
    body = {'jsonrpc': '2.0', 'id': 1, 'method': 'tools/call',
            'params': {'name': 'execute_javascript', 'arguments': {'context': ctx, 'code': code}}}
    req = urllib.request.Request('http://127.0.0.1:%s/mcp' % PORT, json.dumps(body).encode('utf8'),
                                 {'Content-Type': 'application/json', 'Accept': 'application/json,text/event-stream'})
    t = urllib.request.urlopen(req, timeout=180).read().decode('utf8')
    r = json.loads(t[t.find('{'):])['result']
    sc = r.get('structuredContent', {})
    if r.get('isError') or not sc.get('ok', True):
        sys.exit('MCP error (%s): %s' % (ctx, sc.get('summary') or t[:500]))
    d = sc['data']
    if ctx == 'scene':
        if not d.get('ok', True):
            sys.exit('scene error: %s' % d)
        return d.get('result')
    return d


def main():
    if len(sys.argv) < 2:
        sys.exit('usage: bake.sh <spec.js> [Name]')
    spec_path = sys.argv[1]
    name = sys.argv[2] if len(sys.argv) > 2 else os.path.splitext(os.path.basename(spec_path))[0]
    spec = open(spec_path, encoding='utf8').read()
    # 1) SPRITE_DEFS -> json
    defs = {}  # SpriteDefs.ts is optional: specs can use sprite(..., {file: 'x', fw, fh}) without it
    defs_path = os.path.join(ROOT, 'assets/scripts/data/SpriteDefs.ts')
    if os.path.exists(defs_path):
        ts = open(defs_path, encoding='utf8').read()
        m = re.search(r'SPRITE_DEFS\s*:[^=]*=\s*(\{.*\})\s*;', ts, re.S)
        if not m:
            sys.exit('SpriteDefs.ts: SPRITE_DEFS literal not found')
        defs = json.loads(re.sub(r',(\s*[}\]])', r'\1', m.group(1)))
    files = sorted({f['file'] for d in defs.values() for f in d['frames']})
    spec_files = set(re.findall(r"file:\s*'(\w+)'", spec))  # sprite(..., {file: 'x'}) dùng texture trực tiếp
    files = sorted(set(files) | spec_files)
    # 2) spriteFrame uuid cache (query asset-db for missing)
    cache = json.load(open(CACHE)) if os.path.exists(CACHE) else {}
    missing = [f for f in files if f not in cache]
    if missing:
        js = ("const out={};for(const f of %s){const i=await Editor.Message.request('asset-db','query-asset-info',"
              "'db://assets/resources/textures/'+f+'.png');const s=i&&i.subAssets&&Object.values(i.subAssets).find(x=>x.type==='cc.SpriteFrame');"
              "if(s)out[f]=s.uuid;}return out;" % json.dumps(missing))
        cache.update(call_js('editor', js))
        os.makedirs(os.path.dirname(CACHE), exist_ok=True)
        json.dump(cache, open(CACHE, 'w'), indent=1)
    lost = [f for f in files if f not in cache]
    if lost:
        print('warn: no texture for (unused-safe, lib throws if a spec uses them):', lost)
    files = [f for f in files if f in cache]
    mtl = call_js('editor', "const i=await Editor.Message.request('asset-db','query-asset-info','db://assets/materials/additive.mtl');return i&&i.uuid;")
    if not mtl and 'additive' in spec:
        sys.exit('spec uses additive but db://assets/materials/additive.mtl is missing')
    # 3) scene stage: build temp tree under Canvas
    tmp = '__bake_' + name
    lib = open(os.path.join(HERE, 'lib.js'), encoding='utf8').read()
    # whole thing in an IIFE: the scene context shares top-level scope between runs
    code = ("return await (async()=>{\n"
            "const DEFS=%s;const UUIDS=%s;const MTL_ADDITIVE=%s;\n%s\n"
            "const canvas=cc.director.getScene().getChildByName('Canvas');\n"
            "for(const c of canvas.children.slice()) if(c.name.startsWith('__bake_')) c.destroy();\n"
            "await lib.init();\n"
            "const root=lib.group(canvas,%s,{w:800,h:450,ax:0,ay:1});\n"
            "const out=await (async(sprite,label,group)=>{\n%s\n})(lib.sprite,lib.label,lib.group);\n"
            "return (out&&out.uuid)||root.uuid;\n"
            "})();") % (json.dumps(defs), json.dumps({k: cache[k] for k in files}), json.dumps(mtl),
                                    lib, json.dumps(tmp), spec)
    if os.environ.get('BAKE_DUMP'):
        open(os.path.join(HERE, '.cache', 'last.js'), 'w', encoding='utf8').write(code)
    uuid = call_js('scene', code)
    # 4) editor stage: bakePrefab (delete old, create-prefab, remove temp node)
    url = 'db://assets/prefabs/%s.prefab' % name
    js = ("const R=(...a)=>Editor.Message.request(...a);const U=%s,N=%s;"
          "if(!(await R('asset-db','query-asset-info','db://assets/prefabs')))await R('asset-db','create-asset','db://assets/prefabs',null);"
          "if(await R('asset-db','query-asset-info',U))await R('asset-db','delete-asset',U);"
          "await R('scene','set-property',{uuid:N,path:'name',dump:{type:'string',value:%s}});"
          "const id=await R('scene','create-prefab',N,U);"
          "const t=await R('scene','query-node-tree');const cv=(t.children||[]).find(c=>c.name==='Canvas');"
          "for(const c of (cv?cv.children:[]))if(c.uuid===N||c.name===%s||c.name==='(Missing Node)'||c.name.startsWith('__bake_'))await R('scene','remove-node',{uuid:c.uuid});"
          "return id;") % (json.dumps(url), json.dumps(uuid), json.dumps(name), json.dumps(name))
    print('baked', url, call_js('editor', js))


main()
