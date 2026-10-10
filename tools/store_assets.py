"""Gera ícone, splash, prints e arte da loja a partir do build do app (www/ servido em URL)."""
import asyncio, base64, os, pathlib
from playwright.async_api import async_playwright
URL = os.environ.get('URL', 'http://localhost:8766/index.html')
OUT = pathlib.Path(os.environ.get('OUT', '/home/claude/evd-app'))
(OUT / 'assets').mkdir(parents=True, exist_ok=True)
(OUT / 'loja/iphone-6.9').mkdir(parents=True, exist_ok=True)
(OUT / 'loja/ipad-13').mkdir(parents=True, exist_ok=True)
(OUT / 'loja/google-play').mkdir(parents=True, exist_ok=True)

ART = r"""
(() => {
  const E = window.EVD;
  function bg(x, S) {
    const r = x.createLinearGradient(0, 0, S, S); r.addColorStop(0, '#ff5a4d'); r.addColorStop(1, '#7a0d14');
    x.fillStyle = r; x.fillRect(0, 0, S, S);
    const b = x.createLinearGradient(S, 0, 0, S); b.addColorStop(0, '#3fa9ff'); b.addColorStop(1, '#0b2f7a');
    x.fillStyle = b; x.beginPath(); x.moveTo(S * 0.62, 0); x.lineTo(S, 0); x.lineTo(S, S); x.lineTo(S * 0.38, S); x.closePath(); x.fill();
    x.save(); x.globalAlpha = 0.13; x.fillStyle = '#fff';
    for (let i = 0; i < 14; i++) { x.save(); x.translate(S / 2, S * 0.42); x.rotate(i * Math.PI / 7); x.beginPath(); x.moveTo(0, 0); x.lineTo(S, -S * 0.09); x.lineTo(S, S * 0.09); x.closePath(); x.fill(); x.restore(); }
    x.restore();
    x.strokeStyle = '#ffd21f'; x.lineWidth = S * 0.018; x.beginPath(); x.moveTo(S * 0.62, 0); x.lineTo(S * 0.38, S); x.stroke();
  }
  function fighters(x, S, k, y) {
    const L = E.getCharacter('rubro'), R = E.getCharacter('patriota'), P = E.Art.POSES;
    x.save(); x.translate(S * 0.25, S * y); x.scale(k, k); E.Art.drawFighter(x, L, P.guard(0.3), { expr: 'shout' }); x.restore();
    x.save(); x.translate(S * 0.75, S * y); x.scale(-k, k); E.Art.drawFighter(x, R, P.guard(1.1), { expr: 'grit' }); x.restore();
  }
  function vs(x, S, size, cy) {
    x.save(); x.translate(S / 2, cy); x.transform(1, 0, -0.18, 1, 0, 0);
    x.font = size + 'px Bangers'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
    x.shadowColor = 'rgba(255,140,30,.9)'; x.shadowBlur = size * 0.25;
    x.strokeStyle = '#0c0912'; x.lineWidth = size * 0.16; x.strokeText('VS', 0, 0);
    x.shadowBlur = 0;
    const g = x.createLinearGradient(0, -size / 2, 0, size / 2); g.addColorStop(0, '#fff3a0'); g.addColorStop(0.5, '#ffd21f'); g.addColorStop(1, '#ff8a1f');
    x.fillStyle = g; x.fillText('VS', 0, 0); x.restore();
  }
  function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  const out = {};
  // ícone principal (sem transparência, como a Apple exige)
  let c = canvas(1024, 1024), x = c.getContext('2d');
  bg(x, 1024); fighters(x, 1024, 3.5, 1.37); vs(x, 1024, 300, 225);
  out['assets/icon-only.png'] = c.toDataURL();
  // Android adaptativo: fundo + frente (conteúdo dentro da zona segura central)
  c = canvas(1024, 1024); x = c.getContext('2d'); bg(x, 1024); out['assets/icon-background.png'] = c.toDataURL();
  c = canvas(1024, 1024); x = c.getContext('2d');
  x.save(); x.translate(512, 512); x.scale(0.62, 0.62); x.translate(-512, -512); x.save(); x.beginPath(); x.rect(0, 0, 1024, 1024); x.clip(); fighters(x, 1024, 3.5, 1.37); x.restore(); vs(x, 1024, 300, 225); x.restore();
  out['assets/icon-foreground.png'] = c.toDataURL();
  // splash (2732², o conteúdo fica no centro porque cada aparelho corta as bordas)
  function splash() {
    const S = 2732, c = canvas(S, S), x = c.getContext('2d');
    x.fillStyle = '#0c0912'; x.fillRect(0, 0, S, S);
    const g = x.createRadialGradient(S / 2, S / 2, 50, S / 2, S / 2, S * 0.5);
    g.addColorStop(0, 'rgba(120,40,160,.45)'); g.addColorStop(1, 'rgba(12,9,18,0)'); x.fillStyle = g; x.fillRect(0, 0, S, S);
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
    const word = (t, y, size, c1, c2) => { x.save(); x.translate(S / 2, y); x.rotate(-0.05); x.font = size + 'px Bangers';
      x.strokeStyle = '#000'; x.lineWidth = size * 0.12; x.strokeText(t, 0, 0);
      const gg = x.createLinearGradient(0, -size / 2, 0, size / 2); gg.addColorStop(0, c1); gg.addColorStop(1, c2); x.fillStyle = gg; x.fillText(t, 0, 0); x.restore(); };
    word('ESQUERDA', S / 2 - 250, 300, '#ffd0c4', '#c4161f');
    vs(x, S, 330, S / 2);
    word('DIREITA', S / 2 + 250, 300, '#d6f0ff', '#1f6fe0');
    return c.toDataURL();
  }
  out['assets/splash.png'] = splash(); out['assets/splash-dark.png'] = out['assets/splash.png'];
  // arte de destaque do Google Play (1024x500)
  c = canvas(1024, 500); x = c.getContext('2d');
  x.save(); x.scale(1, 500 / 1024 * 1.0); x.restore();
  const st = canvas(1280, 720); E.Stage.draw(st.getContext('2d'), 0.6, [0.8, 0.8]);
  x.drawImage(st, 0, 60, 1280, 500, 0, 0, 1024, 500 * 1024 / 1280 * 1.25);
  x.fillStyle = 'rgba(8,4,16,.45)'; x.fillRect(0, 0, 1024, 500);
  x.save(); x.translate(170, 560); x.scale(1.45, 1.45); E.Art.drawFighter(x, E.getCharacter('rubro'), E.Art.POSES.guard(0.2), {}); x.restore();
  x.save(); x.translate(854, 560); x.scale(-1.45, 1.45); E.Art.drawFighter(x, E.getCharacter('patriota'), E.Art.POSES.guard(0.9), {}); x.restore();
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  [['ESQUERDA', 150, 104, '#ff5a4d'], ['DIREITA', 350, 104, '#3fa9ff']].forEach(([t, y, s, col]) => { x.font = s + 'px Bangers'; x.strokeStyle = '#0c0912'; x.lineWidth = 16; x.strokeText(t, 512, y); x.fillStyle = col; x.fillText(t, 512, y); });
  vs(x, 1024, 120, 250);
  out['loja/google-play/arte-destaque-1024x500.png'] = c.toDataURL();
  return out;
})()
"""

async def shots(p, vp, scale, folder, prefix):
    b = await p.chromium.launch()
    ctx = await b.new_context(viewport=vp, device_scale_factor=scale, has_touch=True, is_mobile=True)
    pg = await ctx.new_page()
    await pg.goto(URL); await pg.wait_for_timeout(1800)
    d = OUT / folder
    await pg.screenshot(path=str(d / f'{prefix}1-menu.png'))
    await pg.evaluate("EVD.Scenes.go('select',{mode:'play'})"); await pg.wait_for_timeout(500)
    await pg.screenshot(path=str(d / f'{prefix}2-selecao.png'))
    await pg.evaluate("EVD.Scenes.go('battle',{p1:'rubro',cpu:'patriota'})")
    await pg.wait_for_function("EVD.Battle.current.phase==='fight'")
    await pg.evaluate("""(()=>{const B=EVD.Battle.current; B.ai.enabled=false; B.player.x=430; B.cpu.x=860; B.player.energy=70; B.cpu.energy=45; B.cpu.hp=72; B.player.hp=88; B.timer=47;
        EVD.Abilities.use(B.player,1,B);})()""")
    await pg.wait_for_timeout(950)
    await pg.screenshot(path=str(d / f'{prefix}3-chuva-de-impostos.png'))
    await pg.evaluate("""(()=>{const B=EVD.Battle.current; const p=B.player; p.action=null; p.state='idle'; p.hitstun=0; B.cpu.x=900; B.cpu.hitstun=0; B.cpu.state='idle'; B.cpu.action=null; p.energy=100; p.cooldowns=[0,0,0,0]; EVD.Abilities.use(p,3,B);})()""")
    await pg.wait_for_timeout(450)
    await pg.screenshot(path=str(d / f'{prefix}4-golpe-supremo.png'))
    await pg.wait_for_timeout(1150)
    await pg.screenshot(path=str(d / f'{prefix}5-megarrajada.png'))
    await pg.evaluate("EVD.Scenes.go('battle',{p1:'coronel',cpu:'estrela'})")
    await pg.wait_for_function("EVD.Battle.current.phase==='fight'")
    await pg.evaluate("""(()=>{const B=EVD.Battle.current; B.ai.enabled=false; B.player.x=520; B.cpu.x=760; B.player.energy=40; B.cpu.energy=80; B.timer=31; B.cpu.hp=55; B.player.hp=64; EVD.Abilities.use(B.cpu,0,B); })()""")
    await pg.wait_for_timeout(330)
    await pg.screenshot(path=str(d / f'{prefix}6-apagador-voador.png'))
    await b.close()

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); pg = await b.new_page()
        await pg.goto(URL); await pg.wait_for_timeout(1500)
        data = await pg.evaluate(ART)
        for k, v in data.items():
            (OUT / k).parent.mkdir(parents=True, exist_ok=True)
            (OUT / k).write_bytes(base64.b64decode(v.split(',', 1)[1]))
        await b.close()
        await shots(p, {'width': 956, 'height': 440}, 3, 'loja/iphone-6.9', '')      # 2868x1320
        await shots(p, {'width': 1376, 'height': 1032}, 2, 'loja/ipad-13', '')       # 2752x2064
        await shots(p, {'width': 960, 'height': 540}, 2, 'loja/google-play', 'tela-') # 1920x1080
    print('ok')
asyncio.run(main())
