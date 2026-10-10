"""Teste dos controles mobile em vários tamanhos de Android (toque real via CDP, inclusive multitoque)."""
import asyncio, os, json
from playwright.async_api import async_playwright
URL = os.environ.get('URL', 'http://localhost:8765/index.html')
OUT = os.environ.get('OUT', '/home/claude/evd/tools/shots/mobile/')
os.makedirs(OUT, exist_ok=True)

CONFIGS = [
    # nome, largura, altura (CSS px = dp), densidade, área segura lateral simulada
    ('android-pequeno-640x360', 640, 360, 2, 0),
    ('galaxy-s8-740x360', 740, 360, 3, 0),
    ('android-20x9-800x360', 800, 360, 3, 0),
    ('android-20x9-com-notch-800x360', 800, 360, 3, 32),
    ('pixel-5-851x393', 851, 393, 2.75, 0),
    ('galaxy-s20-ultra-915x412', 915, 412, 3.5, 0),
    ('tablet-android-1280x800', 1280, 800, 2, 0),
    ('vertical-360x800-depois-gira', 360, 800, 3, 0),
    ('vertical-412x915-depois-gira', 412, 915, 2.6, 0),
    ('pc-1366x768-mouse', 1366, 768, 1, 0),
]
SEL = {'pular': '[data-press=jump]', 'esquerda': '[data-hold=left]', 'direita': '[data-hold=right]', 'def': '[data-hold=block]', 'soco': '#btn-punch', 'chute': '#btn-kick'}
results = []
def is_phone(w, h): return min(w, h) <= 520
def ok(name, cond, info=''):
    results.append(bool(cond)); print(('PASS ' if cond else 'FAIL ') + name + (' — ' + str(info) if info != '' else ''))

async def run(p, name, w, h, dpr, safe):
    b = await p.chromium.launch()
    ctx = await b.new_context(viewport={'width': w, 'height': h}, device_scale_factor=dpr, is_mobile=not name.startswith('pc'), has_touch=True)
    pg = await ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'ERR_TUNNEL' not in m.text and 'fonts.g' not in m.text else None)
    await pg.goto(URL); await pg.wait_for_timeout(1500)
    if safe:
        await pg.evaluate(f"document.documentElement.style.setProperty('--safe-l','{safe}px'); document.documentElement.style.setProperty('--safe-r','{safe}px')")
    await pg.evaluate("EVD.Scenes.go('battle',{p1:'rubro',cpu:'coronel'})")
    VIS = """(()=>{const v=e=>{if(!e)return false;const r=e.getBoundingClientRect();return r.width>0&&r.height>0&&getComputedStyle(e).visibility!=='hidden'};
      return {needRotate:document.documentElement.classList.contains('need-rotate'), overlay:v(document.querySelector('.rotate-overlay')),
      msg:(document.getElementById('rotate-msg')||{}).textContent, arena:v(document.getElementById('arena')), hud:v(document.getElementById('hud-p0')),
      skills:v(document.getElementById('skills')), soco:v(document.getElementById('btn-punch')), pad:v(document.querySelector('[data-hold=left]')),
      phase:EVD.Battle.current&&EVD.Battle.current.phase, timer:EVD.Battle.current&&EVD.Battle.current.timer, t:EVD.Battle.current&&EVD.Battle.current.time}})()"""
    if h > w:
        await pg.wait_for_timeout(1200)
        a = await pg.evaluate(VIS); await pg.wait_for_timeout(700); a2 = await pg.evaluate(VIS)
        await pg.screenshot(path=OUT + name + '-vertical.png')
        ok(f'[{name}] vertical: só a tela "Gire seu celular" aparece', a['needRotate'] and a['overlay'] and a['msg'] == 'Gire seu celular para jogar' and not any([a['arena'], a['hud'], a['skills'], a['soco'], a['pad']]), a)
        ok(f'[{name}] vertical: luta congelada (nada avança escondido)', a['t'] == a2['t'] and a['phase'] == a2['phase'], [a['t'], a2['t']])
        w, h = h, w
        await pg.set_viewport_size({'width': w, 'height': h}); await pg.wait_for_timeout(400)
        a = await pg.evaluate(VIS)
        ok(f'[{name}] girou para horizontal: jogo volta sozinho', not a['needRotate'] and not a['overlay'] and a['arena'] and a['hud'] and a['skills'] and a['soco'] and a['pad'], a)
        name = name.replace('vertical', 'girado')
    await pg.wait_for_function("EVD.Battle.current && EVD.Battle.current.phase==='fight'", timeout=8000)
    await pg.wait_for_timeout(200)
    reset = "(()=>{const B=EVD.Battle.current; B.ai.enabled=false; const p=B.player; p.x=420; B.cpu.x=1100; p.vx=0; p.y=0; p.vy=0; p.action=null; p.hitstun=0; p.stun=0; p.state='idle'; p.buffer=[]; B.timer=99;})()"
    await pg.evaluate(reset)
    m = await pg.evaluate("""(sel)=>{const r=e=>{const b=e.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width,h:b.height,r:b.right,b:b.bottom}};
      const out={vw:innerWidth,vh:innerHeight,stage:r(document.getElementById('stage-box')),skills:r(document.getElementById('skills')),btn:{},hit:{},skillBtns:[...document.querySelectorAll('#skills .skill')].map(r)};
      for(const k in sel){const e=document.querySelector(sel[k]); out.btn[k]=r(e); const c=out.btn[k]; const t=document.elementFromPoint(c.x+c.w/2,c.y+c.h/2); out.hit[k]=!!t&&(t===e||e.contains(t));}
      out.scroll=document.documentElement.scrollWidth>innerWidth+1||document.documentElement.scrollHeight>innerHeight+1; return out;}""", SEL)
    S = m['stage']
    def inside(r): return r['x'] >= -0.5 and r['y'] >= -0.5 and r['r'] <= m['vw'] + 0.5 and r['b'] <= m['vh'] + 0.5
    def overlap(a, c): return a['x'] < c['r'] - 0.5 and a['r'] > c['x'] + 0.5 and a['y'] < c['b'] - 0.5 and a['b'] > c['y'] + 0.5
    vis = all(inside(m['btn'][k]) and m['hit'][k] for k in SEL)
    ok(f'[{name}] 6 botões visíveis e tocáveis', vis, {k: m['hit'][k] for k in SEL})
    hs = {k: round(m['btn'][k]['h']) for k in SEL}
    ws = {k: round(m['btn'][k]['w']) for k in SEL}
    ok(f'[{name}] botões com área de toque confortável (44–90 dp), SOCO = CHUTE', all(44 <= hs[k] <= 90 for k in SEL) and hs['soco'] == hs['chute'] and ws['soco'] == ws['chute'] and ws['soco'] >= 100, {'alturas': hs, 'larguras': ws})
    L = await pg.evaluate("""(()=>{const c=EVD.Scenes.current.camera, B=EVD.Battle.current, r=s=>document.querySelector(s).getBoundingClientRect();
      const hud=Math.max(...['#hud-p0 .pport','#hud-p0 .pinfo','#hud-p1 .pport','#hud-p1 .pinfo'].map(q=>r(q).bottom));
      const heads=B.fighters.map(f=>c.gy - 250*1.32*c.k);
      const ctrlTop=Math.min(r('#controls .pad').top, r('#controls .skills').top, r('#controls .basics').top);
      const cards=[...document.querySelectorAll('#skills .skill')].map(e=>e.getBoundingClientRect());
      const names=[...document.querySelectorAll('#skills .sn')].map(e=>({t:e.textContent, clip:e.scrollHeight>e.clientHeight+1, fs:parseFloat(getComputedStyle(e).fontSize)}));
      const pad=r('#controls .pad'), atk=r('#controls .basics'), sk=r('#controls .skills');
      return {W:innerWidth, H:innerHeight, k:c.k, gy:c.gy, hud, head:heads[0], ctrlTop, fighterPx:250*1.32*c.k,
        cardW:cards.map(x=>Math.round(x.width)), cardH:cards.map(x=>Math.round(x.height)), names,
        padRight:pad.right, atkLeft:atk.left, skL:sk.left, skR:sk.right, view:[c.view.x0,c.view.x1], canvas:[r('#arena').width, r('#arena').height]};})()""")
    ok(f'[{name}] arena ocupa a tela inteira (canvas = tela)', abs(L['canvas'][0] - L['W']) < 1 and abs(L['canvas'][1] - L['H']) < 1 and L['view'][0] <= 1 and L['view'][1] >= 1279, {'canvas': L['canvas'], 'mundo_visivel': [round(v) for v in L['view']]})
    ok(f'[{name}] pés acima dos comandos e cabeças abaixo do HUD', L['gy'] <= L['ctrlTop'] + 1 and L['head'] >= L['hud'] - 12, {'chao': round(L['gy']), 'topo_comandos': round(L['ctrlTop']), 'cabeca': round(L['head']), 'hud': round(L['hud']), 'lutador_px': round(L['fighterPx'])})
    ok(f'[{name}] movimento à esquerda, SOCO/CHUTE à direita, habilidades no meio sem encostar', L['padRight'] <= L['skL'] + 1 and L['skR'] <= L['atkLeft'] + 1 and L['atkLeft'] > L['W'] / 2, [round(L['padRight']), round(L['skL']), round(L['skR']), round(L['atkLeft'])])
    ok(f'[{name}] cartões de habilidade uniformes e nomes inteiros (fonte ≥ 11px)', len(set(L['cardW'])) == 1 and len(set(L['cardH'])) == 1 and not any(n['clip'] for n in L['names']) and min(n['fs'] for n in L['names']) >= 11, {'larg': L['cardW'][0], 'alt': L['cardH'][0], 'cortados': [n['t'] for n in L['names'] if n['clip']]})
    ok(f'[{name}] página não rola', not m['scroll'])

    cdp = await ctx.new_cdp_session(pg)
    def ctr(k): c = m['btn'][k]; return {'x': c['x'] + c['w'] / 2, 'y': c['y'] + c['h'] / 2}
    async def touch(kind, pts): await cdp.send('Input.dispatchTouchEvent', {'type': kind, 'touchPoints': pts})
    async def P(expr): return await pg.evaluate(expr)

    # ◀ e ▶ segurados
    for k, sign, hold in [('esquerda', -1, 'left'), ('direita', 1, 'right')]:
        await pg.evaluate(reset); x0 = await P("EVD.Battle.current.player.x")
        await touch('touchStart', [dict(ctr(k), id=1)]); await pg.wait_for_timeout(350)
        held = await P(f"EVD.Input.held('{hold}')"); x1 = await P("EVD.Battle.current.player.x")
        await touch('touchEnd', []); await pg.wait_for_timeout(60)
        rel = await P(f"EVD.Input.held('{hold}')")
        ok(f'[{name}] {k} (segurar) move o lutador', held and (x1 - x0) * sign > 40 and not rel, [round(x0), round(x1)])
    # pular
    await pg.evaluate(reset)
    await touch('touchStart', [dict(ctr('pular'), id=1)]); await pg.wait_for_timeout(140); y = await P("EVD.Battle.current.player.y"); await touch('touchEnd', [])
    ok(f'[{name}] pular', y < -20, round(y))
    await pg.wait_for_timeout(900)
    # defesa
    await pg.evaluate(reset)
    await touch('touchStart', [dict(ctr('def'), id=1)]); await pg.wait_for_timeout(150); st = await P("EVD.Battle.current.player.state"); await touch('touchEnd', []); await pg.wait_for_timeout(80)
    st2 = await P("EVD.Battle.current.player.state")
    ok(f'[{name}] DEF (segurar) defende e solta', st == 'block' and st2 != 'block', [st, st2])
    # soco e chute
    for k, aid in [('soco', 'soco'), ('chute', 'chute')]:
        await pg.evaluate(reset)
        await touch('touchStart', [dict(ctr(k), id=1)]); await pg.wait_for_timeout(40)
        a = await P("(EVD.Battle.current.player.action||{def:{}}).def.id"); await touch('touchEnd', []); await pg.wait_for_timeout(500)
        ok(f'[{name}] {k.upper()} executa o golpe', a == aid, a)
    # andar e atacar ao mesmo tempo (dois dedos)
    await pg.evaluate(reset); await pg.evaluate("(()=>{const B=EVD.Battle.current; B.cpu.x=900; window.__n=0; const f=B.player, o=EVD.Abilities.start; if(!window.__wrapped){window.__wrapped=1; EVD.Abilities.start=function(ff,d,bb){ if(ff===EVD.Battle.current.player && d.basic) window.__n++; return o.apply(this,arguments); };}})()")
    x0 = await P("EVD.Battle.current.player.x")
    await touch('touchStart', [dict(ctr('direita'), id=1)]); await pg.wait_for_timeout(200)
    await touch('touchStart', [dict(ctr('direita'), id=1), dict(ctr('soco'), id=2)]); await pg.wait_for_timeout(900)
    both = await P("[EVD.Input.held('right'), window.__n, EVD.Battle.current.player.x]")
    await touch('touchEnd', [dict(ctr('direita'), id=1)]); await pg.wait_for_timeout(50); await touch('touchEnd', [])
    ok(f'[{name}] andar + segurar SOCO juntos (multitoque)', both[0] and both[1] >= 2 and both[2] - x0 > 40, {'segurando_direita': both[0], 'socos': both[1], 'andou': round(both[2] - x0)})
    # habilidade por toque continua funcionando
    await pg.evaluate(reset)
    s0 = m['skillBtns'][0]
    await touch('touchStart', [{'x': s0['x'] + s0['w'] / 2, 'y': s0['y'] + s0['h'] / 2, 'id': 1}]); await pg.wait_for_timeout(30); await touch('touchEnd', []); await pg.wait_for_timeout(40)
    a = await P("(EVD.Battle.current.player.action||{def:{}}).def.id")
    ok(f'[{name}] toque em habilidade', a == 'soco_popular', a)
    # girar no meio da luta: some e volta
    if w > h and is_phone(w, h):
        t0 = await P("EVD.Battle.current.time")
        await pg.set_viewport_size({'width': h, 'height': w}); await pg.wait_for_timeout(500)
        a = await pg.evaluate(VIS); t1 = await P("EVD.Battle.current.time")
        await pg.set_viewport_size({'width': w, 'height': h}); await pg.wait_for_timeout(500)
        c = await pg.evaluate(VIS); t2 = await P("EVD.Battle.current.time")
        ok(f'[{name}] no meio da luta: vertical esconde e congela, horizontal restaura', a['overlay'] and not a['arena'] and abs(t1 - t0) < 0.15 and c['arena'] and not c['overlay'] and t2 > t1, [round(t0, 2), round(t1, 2), round(t2, 2)])
        await pg.evaluate(reset)
    # captura com a luta em andamento
    await pg.evaluate("(()=>{const B=EVD.Battle.current; B.player.x=520; B.cpu.x=760; B.player.energy=60;})()"); await pg.wait_for_timeout(500)
    await pg.screenshot(path=OUT + name + '.png')
    ok(f'[{name}] sem erros no console', not errs, errs[:2])
    await b.close()

async def main():
    async with async_playwright() as p:
        for c in CONFIGS: await run(p, *c)
    print(f'\n{sum(results)}/{len(results)} passaram')
asyncio.run(main())
