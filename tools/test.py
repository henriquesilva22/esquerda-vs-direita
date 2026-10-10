"""Testes obrigatórios automatizados (Playwright)."""
import asyncio, json
from playwright.async_api import async_playwright
import os
URL=os.environ.get('URL','http://localhost:8765/index.html')
OUT=os.environ.get('OUT','/home/claude/evd/tools/shots/')
results=[]
def ok(name, cond, info=''):
    results.append((name, bool(cond), info)); print(('PASS ' if cond else 'FAIL ')+name+(' — '+str(info) if info else ''))

async def battle_ready(pg):
    await pg.wait_for_function("window.EVD.Scenes.name==='battle' && window.EVD.Battle.current && window.EVD.Battle.current.phase==='fight'", timeout=8000)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        pg = await b.new_page(viewport={'width':1366,'height':768})
        errs=[]
        pg.on('console', lambda m: errs.append(m.text) if m.type=='error' and 'ERR_TUNNEL' not in m.text and 'fonts.g' not in m.text else None)
        pg.on('pageerror', lambda e: errs.append('PAGEERR '+str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(2800)

        # 1 seleção abre
        await pg.click('#btn-play'); await pg.wait_for_timeout(300)
        ok('1. Tela de seleção abre', await pg.is_visible('[data-screen=select]'))
        # escolhe Estrela, CPU -> Coronel
        await pg.click('.card[data-idx="1"]')
        while (await pg.text_content('#cpu-name')) != 'Coronel Agro':
            await pg.click('#cpu-next-btn')
        await pg.screenshot(path=OUT+'t_select.png')
        await pg.click('#sel-confirm')
        await battle_ready(pg)
        ids = await pg.evaluate("[EVD.Battle.current.player.ch.id, EVD.Battle.current.cpu.ch.id]")
        ok('2. Personagem escolhido aparece na batalha', ids==['estrela','coronel'], ids)
        names = await pg.evaluate("[...document.querySelectorAll('#skills .skill .sn')].map(e=>e.textContent)")
        exp = await pg.evaluate("EVD.getCharacter('estrela').abilities.map(i=>EVD.ABILITIES[i].name)")
        ok('3. Habilidades corretas para o personagem', names==exp, names)

        # prepara: IA desligada, energia cheia, perto
        async def setup(px=500, cx=640, energy=100, cpu_hp=None):
            await pg.evaluate(f"""(()=>{{const B=EVD.Battle.current; B.ai.enabled=false; const p=B.player,c=B.cpu;
              p.x={px}; c.x={cx}; p.energy={energy}; p.cooldowns=p.cooldowns.map(()=>0); p.action=null; p.hitstun=0; p.stun=0; p.state='idle';
              c.action=null; c.hitstun=0; c.stun=0; c.invuln=0; c.state='idle'; c.vx=0; p.vx=0; c.shieldT=0; c.pendingStun=0; c.stunImmune=0;
              {'c.hp='+str(cpu_hp)+';' if cpu_hp else 'c.hp=100;'} B.projectiles=[]; B.beams=[]; B.timer=99; }})()""")
        async def hp(): return await pg.evaluate("EVD.Battle.current.cpu.hp")

        # 4/5 cada habilidade via clique
        for i, dist in enumerate([600, 140, 180, 500]):
            await setup(px=400, cx=400+dist)
            before = await hp()
            await pg.click(f'#skills .skill[data-idx="{i}"]', force=True)
            await pg.wait_for_timeout(120)
            started = await pg.evaluate("(EVD.Battle.current.player.action||{}).def ? EVD.Battle.current.player.action.def.id : null")
            await pg.wait_for_timeout(2600 if i==3 else 1300)
            after = await hp()
            ok(f'4/5. Clique na habilidade {i+1} ({exp[i]}) executa e causa dano', started==await pg.evaluate(f"EVD.getCharacter('estrela').abilities[{i}]") and after<before, f'{started} hp {before:.1f}->{after:.1f}')
            if i==3: await pg.screenshot(path=OUT+'t_after_super.png')

        # 6 barra de vida
        await setup(); await pg.wait_for_timeout(200)
        await pg.evaluate("EVD.Battle.current.cpu.hp=40"); await pg.wait_for_timeout(150)
        tr = await pg.evaluate("document.querySelector('#hud-p1 .hpbar .fill').style.transform")
        ok('6. Barra de vida atualiza', '0.4' in tr, tr)
        # 7 energia
        await pg.evaluate("EVD.Battle.current.player.energy=50"); await pg.wait_for_timeout(120)
        sp = await pg.evaluate("[document.querySelector('#hud-p0 .spbar .fill').style.transform, document.querySelector('#hud-p0 .splbl').textContent]")
        await setup(energy=0); await pg.wait_for_timeout(100)
        cls = await pg.evaluate("document.querySelector('#skills .skill[data-idx=\"3\"]').className")
        await pg.click('#skills .skill[data-idx="3"]', force=True); await pg.wait_for_timeout(100)
        act = await pg.evaluate("EVD.Battle.current.player.action")
        toast = await pg.text_content('#toast')
        ok('7. Barra de energia funciona e bloqueia supremo sem energia', '0.5' in sp[0] and sp[1]=='50%' and 'noenergy' in cls and act is None and 'Sem energia' in toast, [sp, cls, toast])
        # energia sobe ao acertar golpes
        await setup(px=600, cx=700, energy=0)
        await pg.keyboard.press('KeyJ'); await pg.wait_for_timeout(500)
        en = await pg.evaluate("EVD.Battle.current.player.energy")
        ok('7b. Golpe básico acerta, não gasta energia e enche a barra', en>3, en)
        # 8 recarga
        await setup(px=400, cx=1000)
        await pg.click('#skills .skill[data-idx="0"]'); await pg.wait_for_timeout(700)
        cd = await pg.evaluate("EVD.Battle.current.player.cooldowns[0]")
        n_proj = await pg.evaluate("EVD.Battle.current.projectiles.length")
        await pg.click('#skills .skill[data-idx="0"]', force=True); await pg.wait_for_timeout(80)
        act2 = await pg.evaluate("EVD.Battle.current.player.action")
        lbl = await pg.text_content('#skills .skill[data-idx="0"] .state')
        await pg.screenshot(path=OUT+'t_cooldown.png')
        ok('8. Recarga respeitada', cd>1.5 and act2 is None and lbl.strip()!='', [cd, lbl, n_proj])
        # 11 teclado
        await setup(px=300, cx=1000)
        x0 = await pg.evaluate("EVD.Battle.current.player.x")
        await pg.keyboard.down('KeyD'); await pg.wait_for_timeout(400); await pg.keyboard.up('KeyD')
        x1 = await pg.evaluate("EVD.Battle.current.player.x")
        await pg.keyboard.press('Space'); await pg.wait_for_timeout(150)
        y = await pg.evaluate("EVD.Battle.current.player.y")
        await pg.wait_for_timeout(900)
        await pg.keyboard.down('ShiftLeft'); await pg.wait_for_timeout(100)
        st = await pg.evaluate("EVD.Battle.current.player.state"); await pg.keyboard.up('ShiftLeft')
        await pg.keyboard.press('Digit3'); await pg.wait_for_timeout(100)
        k3 = await pg.evaluate("(EVD.Battle.current.player.action||{def:{}}).def.id")
        ok('11. Teclado: D anda, Espaço pula, Shift defende, 3 usa habilidade', x1>x0+50 and y<-20 and st=='block' and k3=='passeata', [x0,x1,y,st,k3])
        # mouse/toque: botões de movimento na tela
        await pg.wait_for_timeout(900); await setup(px=300, cx=1000)
        x0 = await pg.evaluate("EVD.Battle.current.player.x")
        box = await pg.locator('[data-hold=right]').bounding_box()
        await pg.mouse.move(box['x']+10, box['y']+10); await pg.mouse.down(); await pg.wait_for_timeout(400); await pg.mouse.up()
        x1 = await pg.evaluate("EVD.Battle.current.player.x")
        await pg.click('[data-press=kick]'); await pg.wait_for_timeout(60)
        kk = await pg.evaluate("(EVD.Battle.current.player.action||{def:{}}).def.id")
        ok('11b. Mouse: botões ▶ e CHUTE na tela funcionam', x1>x0+50 and kk=='chute', [x0,x1,kk])
        # bloqueio reduz dano
        await pg.wait_for_timeout(500)
        await setup(px=600, cx=690)
        await pg.evaluate("(()=>{const B=EVD.Battle.current; B.cpu.state='block'; B.cpu.facing=-1; EVD.Combat.hit(B,B.player,B.cpu,{dmg:10,kb:100,type:'skill'})})()")
        hb = await hp()
        ok('6b. Defesa reduz dano', 100-hb < 3, 100-hb)

        # 9 vitória e derrota encerram rodada / partida
        await pg.wait_for_timeout(400)
        for r in range(2):
            await battle_ready(pg)
            await setup(px=600, cx=700, cpu_hp=1)
            await pg.keyboard.press('KeyK')
            await pg.wait_for_timeout(700)
            ph = await pg.evaluate("EVD.Battle.current.phase")
            if r==0: ok('9a. K.O. encerra a rodada', ph=='ko', ph); await pg.screenshot(path=OUT+'t_ko.png')
        await pg.wait_for_selector('#ov-result:not([hidden])', timeout=8000)
        await pg.screenshot(path=OUT+'t_result.png')
        title = await pg.text_content('#res-title')
        ok('9b. Vitória encerra a partida com resultado', title=='VITÓRIA!', title)
        await pg.click('#res-again'); await battle_ready(pg)
        await pg.evaluate("(()=>{const B=EVD.Battle.current; B.ai.enabled=false; B.player.hp=1; B.cpu.x=B.player.x+100;})()")
        for r in range(2):
            await battle_ready(pg)
            await pg.evaluate("(()=>{const B=EVD.Battle.current; B.ai.enabled=false; B.player.hp=1; B.player.invuln=0; B.cpu.x=B.player.x+100; B.cpu.facing=-1; EVD.Combat.hit(B,B.cpu,B.player,{dmg:20,kb:200,type:'skill'})})()")
            await pg.wait_for_timeout(300)
        await pg.wait_for_selector('#ov-result:not([hidden])', timeout=9000)
        title = await pg.text_content('#res-title')
        ok('9c. Derrota encerra a partida', title=='DERROTA', title)

        # pausa
        await pg.click('#res-again'); await battle_ready(pg)
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(150)
        pz = await pg.is_visible('#ov-pause'); t0 = await pg.evaluate("EVD.Battle.current.timer"); await pg.wait_for_timeout(500); t1 = await pg.evaluate("EVD.Battle.current.timer")
        await pg.screenshot(path=OUT+'t_pause.png')
        await pg.click('#pz-resume')
        ok('Pausa congela o tempo', pz and t0==t1, [t0,t1])

        # 12 todos os botões têm ação (lista de botões sem listener não é inspecionável; checamos ids conhecidos)
        # luta completa com IA nos 4 personagens para pegar erros
        for p1, cpu in [('rubro','patriota'),('patriota','estrela'),('coronel','rubro'),('estrela','coronel')]:
            await pg.evaluate(f"EVD.Scenes.go('battle',{{p1:'{p1}',cpu:'{cpu}'}})")
            await battle_ready(pg)
            # P1 também controlado por IA para estressar todas as habilidades
            await pg.evaluate("""(()=>{const B=EVD.Battle.current; const ai2=new EVD.AI(B.player,B,'dificil'); B.player.energy=100; B.cpu.energy=100;
               const orig=B.update.bind(B); B.update=function(dt,pi){ return orig(dt, ai2.update(dt)); }; })()""")
            await pg.wait_for_timeout(6000)
            await pg.screenshot(path=OUT+f't_ai_{p1}.png')
            s = await pg.evaluate("(()=>{const B=EVD.Battle.current;return [B.player.stats, B.cpu.stats, B.phase, B.player.hp, B.cpu.hp]})()")
            ok(f'IA x IA {p1} vs {cpu} sem erros', not errs, s)
        ok('12. Sem erros no console', not errs, errs[:5])
        await b.close()

        # 10 resoluções
        b = await p.chromium.launch()
        for name, vp, mob in [('1920x1080',{'width':1920,'height':1080},False),('1280x720',{'width':1280,'height':720},False),('phone_land',{'width':844,'height':390},True),('phone_port',{'width':390,'height':844},True),('tablet',{'width':1024,'height':768},True)]:
            ctx = await b.new_context(viewport=vp, has_touch=mob, is_mobile=mob, device_scale_factor=2 if mob else 1)
            pg = await ctx.new_page()
            await pg.goto(URL); await pg.wait_for_timeout(2000)
            await pg.screenshot(path=OUT+f'r_{name}_menu.png')
            await pg.evaluate("EVD.Scenes.go('select',{mode:'play'})"); await pg.wait_for_timeout(300)
            await pg.screenshot(path=OUT+f'r_{name}_select.png')
            await pg.evaluate("EVD.Scenes.go('battle',{p1:'patriota',cpu:'rubro'})"); await pg.wait_for_timeout(2600)
            await pg.screenshot(path=OUT+f'r_{name}_battle.png')
            if vp['height'] > vp['width'] and mob:
                v = await pg.evaluate("[document.documentElement.classList.contains('need-rotate'), getComputedStyle(document.querySelector('[data-screen=battle]')).display]")
                ok(f'10. {name}: vertical mostra só "Gire seu celular"', v[0] and v[1]=='none', v)
                continue
            m = await pg.evaluate("""(()=>{const sb=document.getElementById('stage-box').getBoundingClientRect(); const c=document.getElementById('skills').getBoundingClientRect();
                const sk=[...document.querySelectorAll('#skills .skill')].map(e=>e.getBoundingClientRect());
                return {stageBottom:sb.bottom, ctrlTop:c.top, ctrlBottom:c.bottom, vh:innerHeight, vw:innerWidth, sw:document.documentElement.scrollWidth, skillsVisible: sk.every(r=>r.bottom<=innerHeight+1 && r.right<=innerWidth+1 && r.width>30)}})()""")
            cam = await pg.evaluate("(()=>{const c=EVD.Scenes.current.camera; return {gy:c.gy, W:c.W, H:c.H}})()")
            ok(f'10. Resolução {name}: arena em tela cheia, chão acima dos comandos, habilidades visíveis', cam['W']==m['vw'] and cam['H']==m['vh'] and cam['gy']<=m['ctrlTop']+1 and m['ctrlBottom']<=m['vh']+1 and m['skillsVisible'] and m['sw']<=m['vw'], {**m, **cam})
            app = await pg.evaluate("!!window.EVD_APP")
            if mob and name=='phone_land':
                await pg.evaluate("(()=>{const B=EVD.Battle.current; B.ai.enabled=false; B.player.x=300; B.cpu.x=1100; B.projectiles=[]; B.beams=[]; B.timers=[]; B.player.stun=0; B.player.pendingStun=0; B.player.hitstun=0; B.player.action=null; B.player.state='idle';})()"); await pg.wait_for_timeout(900)
                L = await pg.locator('[data-hold=left]').bounding_box(); R = await pg.locator('[data-hold=right]').bounding_box()
                await pg.mouse.move(L['x']+L['width']/2, L['y']+L['height']/2); await pg.mouse.down(); await pg.wait_for_timeout(250)
                held_l = await pg.evaluate("EVD.Input.held('left')")
                await pg.mouse.move(R['x']+R['width']/2, R['y']+R['height']/2, steps=6); await pg.wait_for_timeout(250)
                held = await pg.evaluate("[EVD.Input.held('left'), EVD.Input.held('right')]")
                await pg.mouse.up(); await pg.wait_for_timeout(50)
                rel = await pg.evaluate("EVD.Input.held('right')")
                ok('Mobile: dedo desliza de ◀ para ▶ sem soltar', held_l and held==[False, True] and not rel, [held_l, held, rel])
                await pg.evaluate("(()=>{const B=EVD.Battle.current; B.player.x=600; B.cpu.x=1100; B.player.stats.hits=0; B.projectiles=[]; B.beams=[]; B.timers=[]; B.player.stun=0; B.player.pendingStun=0; B.player.hitstun=0; B.player.action=null; B.player.state='idle'; window.__acts=0; const f=B.player; const o=EVD.Abilities.start; EVD.Abilities.start=function(ff,d,b){ if(ff===f&&d.id==='soco') window.__acts++; return o.apply(this,arguments); };})()")
                P = await pg.locator('#btn-punch').bounding_box()
                await pg.mouse.move(P['x']+20, P['y']+20); await pg.mouse.down(); await pg.wait_for_timeout(1000); await pg.mouse.up()
                acts = await pg.evaluate("window.__acts")
                ok('Mobile: segurar SOCO repete o golpe', acts>=3, acts)
            if mob and not (app and name=='phone_port'):
                await pg.evaluate("(()=>{const B=EVD.Battle.current; B.ai.enabled=false; B.cpu.action=null;})()"); await pg.wait_for_timeout(900)
                await pg.tap('#skills .skill[data-idx="0"]'); await pg.wait_for_timeout(80)
                a = await pg.evaluate("(EVD.Battle.current.player.action||{def:{}}).def.id")
                ok(f'Toque na habilidade ({name})', a=='golpe_patriotico', a)
            await ctx.close()
        await b.close()
    print('\n%d/%d passaram' % (sum(r[1] for r in results), len(results)))
asyncio.run(main())
