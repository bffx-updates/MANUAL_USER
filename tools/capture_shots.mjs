// Tira os PRINTS do manual a partir do editor de verdade e grava
// img/shots/<id>.webp + js/snapshots.js.
//
//     node tools/capture_shots.mjs                 (tema escuro, todas as telas)
//     node tools/capture_shots.mjs --theme both    (escuro + claro)
//     node tools/capture_shots.mjs --only preset-tela,stage-1
//     node tools/capture_shots.mjs --editor /caminho/do/build
//     node tools/capture_shots.mjs --all           (inclui prints que nenhum card usa)
//
// COMO FUNCIONA
// 1. Sobe o PEDAL SIMULADO (tools/mock_pedal.mjs): o dispositivo virtual do
//    próprio editor, servido por HTTP, com uma semente de demonstração e os
//    aparelhos USB simulados (GP-5, TONEX ONE, Nano Cortex, Kemper). Nenhum
//    pedal real é tocado, então não há guard de escrita: o editor salva no
//    simulado, que é descartado no fim.
// 2. Serve o build do editor (por padrão ../data; entende o .gz do build de
//    produção) e abre o Chrome headless com ?api= apontando pro simulado.
// 3. Percorre as telas (lista SHOTS abaixo) e tira um print 2x de cada
//    região. Os marcadores numerados de cada card do manual (campo `hot` no
//    content.js) são MEDIDOS aqui e gravados junto, em fração da imagem.
//
// MODO PALCO (out/2026): o palco existe SÓ NOS APPS — o build do pedal
// (../data, o padrão daqui) não tem o código dele. Pros prints do palco
// (ids stage-*), aponte --editor pra um BUILD DOS APPS:
//     cd webApp && BF_NO_GZIP=1 node build.mjs     (deixa o data/ cru)
//     copie o data/ pra fora do repo e passe --editor <essa pasta>
//     cd webApp && node build.mjs                   (devolve o data/ ao gzip)
// A captura abre o editor com &palco=1, que liga o atalho do palco num
// servidor local (ver STAGE_DEV no webApp/api.js). Com o build do pedal as
// etapas do palco avisam "atalho MODO PALCO ausente" e seguem adiante.
//
// Mudou a tela do editor? Rode de novo — não redesenhe nada à mão.
// Requisitos: Chrome (ou Edge) e Node 22+.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { startMockPedal } from './mock_pedal.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO = path.resolve(ROOT, '..');
const argv = process.argv.slice(2);
const arg = (name, def) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
const EDITOR = path.resolve(arg('--editor', path.join(REPO, 'data')));
const THEMES = (() => {
  const t = arg('--theme', 'dark');
  return t === 'both' ? ['dark', 'light'] : [t === 'light' ? 'light' : 'dark'];
})();
const ONLY = (arg('--only', '') || '').split(',').map((s) => s.trim()).filter(Boolean);
const PORT = 8931, PEDAL_PORT = 8932, DEBUG_PORT = 9333;
const SHOT_DIR = path.join(ROOT, 'img', 'shots');
const QUALITY = 86;

const CHROME_CANDIDATES = [
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
];
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── servidor do editor (entende o .gz do build de produção) ──────────
function serveEditor() {
  const srv = http.createServer((req, res) => {
    const url = decodeURIComponent(req.url.split('?')[0]);
    // a galeria de fundos do MODO PALCO só existe dentro dos apps (vem de
    // production/stage_bg); aqui ela é servida pra etapa que simula um app
    const base = url.startsWith('/stage_bg/') || url.startsWith('/stage_fonts/') || url.startsWith('/stage_real/') ? path.join(REPO, 'production') : EDITOR;
    const file = path.join(base, url === '/' ? 'index.html' : url);
    if (!file.startsWith(base)) { res.writeHead(404).end(); return; }
    const type = MIME[path.extname(file)] || 'application/octet-stream';
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
      fs.createReadStream(file).pipe(res);
    } else if (fs.existsSync(file + '.gz')) {
      res.writeHead(200, { 'content-type': type, 'cache-control': 'no-store' });
      fs.createReadStream(file + '.gz').pipe(zlib.createGunzip()).pipe(res);
    } else {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('404');
    }
  });
  return new Promise((ok) => srv.listen(PORT, '127.0.0.1', () => ok(srv)));
}

// ── CDP mínimo ───────────────────────────────────────────────────────
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.waiting = new Map(); }
  static async attach(wsUrl) {
    const ws = new WebSocket(wsUrl);
    await new Promise((ok, err) => { ws.onopen = ok; ws.onerror = err; });
    const cdp = new CDP(ws);
    ws.onmessage = (ev) => {
      const msg = JSON.parse(ev.data);
      const w = cdp.waiting.get(msg.id);
      if (w) { cdp.waiting.delete(msg.id); msg.error ? w.err(new Error(JSON.stringify(msg.error))) : w.ok(msg.result); }
    };
    return cdp;
  }
  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((ok, err) => this.waiting.set(id, { ok, err }));
  }
  async eval(expression) {
    const r = await this.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error('JS: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text));
    return r.result.value;
  }
}

// ── marcadores: os `hot` do content.js, por shot ─────────────────────
// Prints que algum card usa: o resto é pulado (a não ser com --all).
const USED = new Set();
function hotSelectorsByShot() {
  const src = fs.readFileSync(path.join(ROOT, 'js', 'content.js'), 'utf8');
  const content = new Function(`${src}; return MN_CONTENT;`)();
  const map = {};
  for (const s of content.sections) for (const c of s.cards || []) {
    if (c.shot) USED.add(c.shot);
    if (!c.shot || !c.hot) continue;
    (map[c.shot] ||= new Set());
    for (const h of c.hot) if (h.sel) map[c.shot].add(h.sel);
  }
  return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, [...v]]));
}

// ── helpers injetados na página ──────────────────────────────────────
const PAGE_HELPERS = `(function(){
  if (window.__mn) return 'ja';
  const norm = (s) => String(s || '').replace(/\\s+/g, ' ').trim().toUpperCase();
  const visible = (e) => { if (!e) return false; const r = e.getBoundingClientRect();
    if (!r.width || !r.height) return false; const cs = getComputedStyle(e);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity !== 0; };
  const M = window.__mn = {
    sleep: (ms) => new Promise((r) => setTimeout(r, ms)),
    async wait(sel, ms) { const t0 = Date.now();
      while (Date.now() - t0 < (ms || 8000)) { const e = document.querySelector(sel); if (e && visible(e)) return true; await M.sleep(150); }
      return false; },
    async waitGone(sel, ms) { const t0 = Date.now();
      while (Date.now() - t0 < (ms || 8000)) { if (!document.querySelector(sel)) return true; await M.sleep(150); }
      return false; },
    find(sel, txt, exact) { const want = norm(txt);
      return [...document.querySelectorAll(sel)].find((b) => { const t = norm(b.innerText || b.getAttribute('aria-label'));
        return exact ? t === want : (t === want || t.startsWith(want + ' ') || t.startsWith(want)); }); },
    click(sel, txt, exact) { const e = txt == null ? document.querySelector(sel) : M.find(sel, txt, exact);
      if (!e) return false; e.scrollIntoView({ block: 'nearest' }); e.click(); return true; },
    // a LARGURA fica a que o elemento tem no app: com flex 0 0 auto a coluna
    // encolhia até o conteúdo e as peças de largura total passavam da borda.
    fit(sels) { for (const s of [].concat(sels)) document.querySelectorAll(s).forEach((e) => { e.style.setProperty('--mn-cap-w', e.getBoundingClientRect().width + 'px'); e.classList.add('mn-cap-fit'); }); return true; },
    unfit() { document.querySelectorAll('.mn-cap-fit').forEach((e) => { e.classList.remove('mn-cap-fit'); e.style.removeProperty('--mn-cap-w'); }); return true; },
    // uniao das caixas dos seletores (cada seletor: todas as ocorrencias visiveis)
    rect(sels, opts) { opts = opts || {}; let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (const s of [].concat(sels)) for (const e of document.querySelectorAll(s)) {
        if (!visible(e)) continue; const r = e.getBoundingClientRect();
        x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom);
        if (opts.first) break; }
      if (x0 === Infinity) return null;
      const p = opts.pad || 0;
      return { x: Math.max(0, Math.floor(x0 - p + scrollX)), y: Math.max(0, Math.floor(y0 - p + scrollY)),
               w: Math.ceil(x1 - x0 + 2 * p), h: Math.ceil(y1 - y0 + 2 * p) }; },
    // filhos visiveis (nao fixos) de um container: a coluna de uma pagina de configuracao
    childrenRect(sel, pad) { const root = document.querySelector(sel); if (!root) return null;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      // display:contents nao tem caixa: desce nos filhos dele
      const kids = (el) => [...el.children].flatMap((e) => getComputedStyle(e).display === 'contents' ? kids(e) : [e]);
      for (const e of kids(root)) { if (!visible(e)) continue; const cs = getComputedStyle(e);
        if (cs.position === 'fixed') continue; const r = e.getBoundingClientRect();
        x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom); }
      if (x0 === Infinity) return null; const p = pad || 0;
      return { x: Math.max(0, Math.floor(x0 - p + scrollX)), y: Math.max(0, Math.floor(y0 - p + scrollY)),
               w: Math.ceil(x1 - x0 + 2 * p), h: Math.ceil(y1 - y0 + 2 * p) }; },
    hot(clip, sels) { const out = {};
      for (const s of sels) { let e = null; try { e = [...document.querySelectorAll(s)].find(visible); } catch (_) {}
        if (!e) continue; const r = e.getBoundingClientRect();
        const x = r.left + scrollX - clip.x, y = r.top + scrollY - clip.y;
        if (x + r.width < 0 || y + r.height < 0 || x > clip.w || y > clip.h) continue;
        out[s] = [x / clip.w, y / clip.h, r.width / clip.w, r.height / clip.h].map((v) => +v.toFixed(4)); }
      return out; },
    // marca o primeiro sel cujo texto contem txt e devolve um seletor unico
    mark(sel, txt, name) { const want = norm(txt);
      const e = [...document.querySelectorAll(sel)].find((x) => norm(x.innerText).includes(want) && visible(x));
      if (!e) return null; e.setAttribute('data-mn-mark', name || 'x'); return '[data-mn-mark="' + (name || 'x') + '"]'; },
    // card cujo TITULO (cabecalho) comeca com txt
    markCard(txt, name) { const want = norm(txt);
      const e = [...document.querySelectorAll('.bf-card')].find((c) => { const h = c.querySelector('h1, h2, h3, .bf-card-head, [class*="card-title"]');
        return h && norm(h.innerText).startsWith(want) && visible(c); });
      if (!e) return null; e.setAttribute('data-mn-mark', name); return '[data-mn-mark="' + name + '"]'; },
    clickIn(rootSel, sel, txt) { const root = document.querySelector(rootSel); if (!root) return false;
      const want = txt == null ? null : norm(txt);
      const e = [...root.querySelectorAll(sel)].find((b) => visible(b) && (want == null || norm(b.innerText || b.getAttribute('aria-label')).includes(want)));
      if (!e) return false; e.scrollIntoView({ block: 'nearest' }); e.click(); return true; },
    needH() { return Math.max(document.documentElement.scrollHeight, document.body.scrollHeight,
      ...[...document.querySelectorAll('.bf-content, .bf-content > *')].map((e) => e.getBoundingClientRect().bottom + scrollY)); },
  };
  return 'ok';
})()`;

// CSS só da captura: sem animação (estado final na hora), sem barra de
// rolagem, e a classe que deixa um painel do tamanho do conteúdo.
const CAPTURE_CSS = `
*, *::before, *::after { animation-duration: .001s !important; animation-delay: 0s !important;
  animation-iteration-count: 1 !important; transition-duration: 0s !important; transition-delay: 0s !important;
  caret-color: transparent !important; }
html, body { scrollbar-width: none !important; }
::-webkit-scrollbar { display: none !important; }
:root:root:root:root .mn-cap-fit, :root:root:root:root.mn-cap-fit { height: auto !important; min-height: 0 !important; max-height: none !important;
  align-self: start !important; overflow: visible !important; flex: 0 0 auto !important; width: var(--mn-cap-w, auto) !important; }
:root:root:root:root .mn-cap-fit > .bf-sw-card, :root:root:root:root .mn-cap-fit.bf-sw-card, :root:root:root:root .mn-cap-fit > .bf-studio-now-playing {
  height: auto !important; min-height: 0 !important; max-height: none !important;
  flex: 0 0 auto !important; overflow: visible !important; }
.mn-cap-notab .bf-tabbar { display: none !important; }
:root:root:root:root .mn-cap-fit .bf-preset-card, :root:root:root:root .mn-cap-fit .bf-preset-card-body, :root:root:root:root .mn-cap-fit .bf-sw-display-card,
:root:root:root:root .mn-cap-fit .bf-studio-now-playing, :root:root:root:root .mn-cap-fit .bf-display-grid {
  height: auto !important; max-height: none !important; overflow: visible !important; flex: 0 0 auto !important; }
`;

const VIEWPORTS = {
  desk: { width: 1280, height: 900, mobile: false, scale: 2 },
  phone: { width: 390, height: 844, mobile: true, scale: 2 },
  land: { width: 844, height: 390, mobile: true, scale: 2 },
};

async function main() {
  const chrome = CHROME_CANDIDATES.find((p) => fs.existsSync(p));
  if (!chrome) { console.error('ERRO: Chrome/Edge nao encontrado.'); process.exit(1); }
  if (!fs.existsSync(path.join(EDITOR, 'index.html'))) {
    console.error('ERRO: build do editor nao encontrado em ' + EDITOR + '\nRode antes: cd webApp && npm run build');
    process.exit(1);
  }
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const HOTS = hotSelectorsByShot();
  const pedal = await startMockPedal({ port: PEDAL_PORT });
  const srv = await serveEditor();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'bfmidi-shots-'));
  const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--mute-audio',
    '--no-first-run', '--no-default-browser-check', '--force-color-profile=srgb',
    '--remote-debugging-port=' + DEBUG_PORT, '--user-data-dir=' + profile,
    '--window-size=1280,900', 'about:blank'], { stdio: 'ignore' });

  let target = null;
  for (let i = 0; i < 80 && !target; i++) {
    await sleep(250);
    try {
      const list = await (await fetch('http://127.0.0.1:' + DEBUG_PORT + '/json/list')).json();
      target = list.find((t) => t.type === 'page');
    } catch { /* subindo */ }
  }
  if (!target) { console.error('ERRO: Chrome nao respondeu no DevTools.'); process.exit(1); }
  const cdp = await CDP.attach(target.webSocketDebuggerUrl);
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');

  const shots = {};
  const prev = (() => {
    try { return new Function(fs.readFileSync(path.join(ROOT, 'js', 'snapshots.js'), 'utf8') + '; return MN_SHOTS;')(); }
    catch { return {}; }
  })();

  let vpNow = null;
  const setVP = async (name, height) => {
    const v = VIEWPORTS[name];
    const h = height || v.height;
    const key = name + ':' + h;
    if (vpNow === key) return;
    vpNow = key;
    await cdp.send('Emulation.setDeviceMetricsOverride',
      { width: v.width, height: h, deviceScaleFactor: v.scale, mobile: v.mobile });
    await cdp.send('Emulation.setTouchEmulationEnabled', v.mobile ? { enabled: true, maxTouchPoints: 5 } : { enabled: false });
    await sleep(350);
  };
  const ev = (js) => cdp.eval(js);
  const H = (call) => ev('window.__mn.' + call);

  let theme = 'dark';
  const open = async (vp, query = '') => {
    await setVP(vp);
    const themeId = theme === 'light' ? 'studio-green' : 'default';
    await cdp.send('Page.navigate', { url: 'about:blank' });
    await sleep(200);
    const url = 'http://127.0.0.1:' + PORT + '/index.html?api=' + encodeURIComponent(pedal.base) + '&palco=1' + query;
    await cdp.send('Page.navigate', { url });
    await sleep(2200);
    await ev(`(function(){ try {
      localStorage.setItem('bfmidi_system_theme', ${JSON.stringify(themeId)});
      localStorage.setItem('bfmidi_language', 'pt');
    } catch(e){} return 1; })()`);
    // a preferência só vale depois de recarregar
    const cur = await ev(`document.querySelector('.bf-screen') ? (document.querySelector('.bf-screen').classList.contains('is-theme-light') ? 'light' : 'dark') : '?'`);
    if (cur !== theme) { await cdp.send('Page.reload', { ignoreCache: true }); await sleep(2400); }
    await ev(PAGE_HELPERS);
    await ev(`(function(){ var s=document.getElementById('mn-cap-css'); if(!s){ s=document.createElement('style'); s.id='mn-cap-css'; document.head.appendChild(s);} s.textContent=${JSON.stringify(CAPTURE_CSS)}; return 1; })()`);
    await H(`wait('.bf-content', 15000)`);
    await sleep(1500);
  };

  // Tira o print da região `sel` (seletor ou lista; união das caixas).
  //   opts.fit    — seletores que encolhem até o conteúdo antes do print
  //   opts.full   — print da janela inteira
  //   opts.tall   — estica a janela até caber a página (configurações longas)
  //   opts.children — usa a união dos FILHOS do seletor (coluna de conteúdo)
  //   opts.kind   — 'phone' | 'landscape' (moldura de aparelho no manual)
  const shoot = async (id, sel, opts = {}) => {
    if (ONLY.length && !ONLY.includes(id)) return;
    if (!USED.has(id) && !argv.includes('--all')) return;
    const hideTab = !opts.full && !JSON.stringify(sel || '').includes('bf-tabbar');
    await ev(`document.documentElement.classList.toggle('mn-cap-notab', ${hideTab})`);
    if (opts.fit) { await H(`fit(${JSON.stringify(opts.fit)})`); await sleep(250); }
    if (opts.tall) {
      const need = Math.ceil(await H('needH()'));
      const v = VIEWPORTS[vpNow.split(':')[0]];
      if (need > v.height) { await setVP(vpNow.split(':')[0], Math.min(need + 40, 7000)); await sleep(400); }
    }
    let clip;
    if (opts.full) {
      const v = VIEWPORTS[vpNow.split(':')[0]];
      // a janela que o usuario ve: inclui o que esta rolado (sobreposicoes fixas
      // como o palco ficam presas a janela, nao ao topo do documento)
      const sx = await ev('Math.round(scrollX)'), sy = await ev('Math.round(scrollY)');
      clip = { x: sx, y: sy, w: v.width, h: Number(vpNow.split(':')[1]) || v.height };
    } else if (opts.children) {
      clip = await H(`childrenRect(${JSON.stringify(sel)}, ${opts.pad ?? 14})`);
    } else {
      clip = await H(`rect(${JSON.stringify(sel)}, ${JSON.stringify({ pad: opts.pad ?? 0, first: !!opts.first })})`);
    }
    if (!clip || clip.w < 4 || clip.h < 4) {
      console.log('  ! ' + id + ' — sem região: ' + JSON.stringify(sel));
      if (opts.fit) await H('unfit()');
      return;
    }
    // região maior que a janela: o que passa da janela não é pintado (sai preto).
    // Estica a janela até caber e mede de novo.
    const vpName = vpNow.split(':')[0];
    const vpH = Number(vpNow.split(':')[1]) || VIEWPORTS[vpName].height;
    if (!opts.full && clip.y + clip.h > vpH) {
      await setVP(vpName, Math.min(clip.y + clip.h + 60, 7000)); await sleep(500);
      clip = opts.children
        ? await H(`childrenRect(${JSON.stringify(sel)}, ${opts.pad ?? 14})`)
        : await H(`rect(${JSON.stringify(sel)}, ${JSON.stringify({ pad: opts.pad ?? 0, first: !!opts.first })})`);
      opts.tall = true;   // devolve a janela no fim
    }
    const hot = HOTS[id] ? await H(`hot(${JSON.stringify(clip)}, ${JSON.stringify(HOTS[id])})`) : {};
    const shot = await cdp.send('Page.captureScreenshot', {
      format: 'webp', quality: QUALITY, captureBeyondViewport: true,
      clip: { x: clip.x, y: clip.y, width: clip.w, height: clip.h, scale: 1 },
    });
    const file = id + (theme === 'light' ? '.light' : '') + '.webp';
    fs.writeFileSync(path.join(SHOT_DIR, file), Buffer.from(shot.data, 'base64'));
    const rel = 'img/shots/' + file;
    if (theme === 'light') {
      if (shots[id]) shots[id].light = rel;
    } else {
      shots[id] = { img: rel, w: clip.w, h: clip.h, hot };
      if (opts.kind) shots[id].kind = opts.kind;
    }
    const kb = (Buffer.byteLength(shot.data, 'base64') / 1024).toFixed(0);
    console.log(`  + ${id}${theme === 'light' ? ' (claro)' : ''}  ${clip.w}×${clip.h}  ${kb} KB` +
      (HOTS[id] ? `  marcadores ${Object.keys(hot).length}/${HOTS[id].length}` : ''));
    if (opts.fit) await H('unfit()');
    await ev(`document.documentElement.classList.remove('mn-cap-notab')`);
    if (opts.tall) await setVP(vpNow.split(':')[0]);
  };

  const key = async (k) => {
    const map = { Escape: { key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 } };
    const d = map[k] || { key: k };
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', ...d });
    await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', ...d });
    await sleep(350);
  };
  // clique "de verdade" (pointerdown/up do navegador) no centro de um elemento
  const tap = async (sel, holdMs = 0) => {
    const r = await H(`rect(${JSON.stringify(sel)}, {first:true})`);
    if (!r) return false;
    const x = r.x + r.w / 2 - (await ev('scrollX')), y = r.y + r.h / 2 - (await ev('scrollY'));
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
    await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
    if (holdMs) await sleep(holdMs);
    await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
    await sleep(300);
    return true;
  };
  const ctx = { cdp, ev, H, open, shoot, setVP, sleep, pedal, key, tap,
    scenario: (name) => fetch(pedal.base + '/__mock/scenario?name=' + name),
    mockGlobal: (q) => fetch(pedal.base + '/__mock/global?' + q),
    mockSet: (q) => fetch(pedal.base + '/__mock/set?' + q),
    reset: () => fetch(pedal.base + '/__mock/reset'),
    // liga/desliga um SW no simulado (o mesmo /sw/tap do MODO PALCO)
    swTap: (n) => fetch(pedal.base + '/sw/tap?sw=' + n, { method: 'POST' }),
    // troca o CC (campo num) do STOMP dos SWs de um preset: { 1: 17, 2: 18 }
    async setSwNums(tag, map) {
      const cur = await (await fetch(pedal.base + '/sw/params?bank=' + tag)).json();
      for (const [n, num] of Object.entries(map)) {
        const line = cur.sw_params && cur.sw_params['sw' + n + '.fx1'];
        if (!line) continue;
        const body = new URLSearchParams({ bank: tag, sw: String(n), mode: 'fx1', layer: '1' });
        for (const kv of line.split('|')) { const i = kv.indexOf('='); if (i > 0) body.set(kv.slice(0, i), kv.slice(i + 1)); }
        body.set('num', String(num));
        await fetch(pedal.base + '/sw/params', { method: 'POST', body,
          headers: { 'content-type': 'application/x-www-form-urlencoded' } });
      }
    } };

  for (theme of THEMES) {
    console.log(`\n══ tema ${theme === 'light' ? 'CLARO' : 'ESCURO'} ══`);
    await ctx.reset();
    for (const step of STEPS) {
      if (ONLY.length && step.ids && !step.ids.some((i) => ONLY.includes(i))) continue;
      console.log('\n[' + step.name + ']');
      // cada etapa começa do pedal simulado zerado (semente): o que uma etapa
      // salva — um envio extra aberto, um modo trocado — não vaza pra outra
      await ctx.reset(); await ctx.mockSet('bpm=118&pedal_name=');
      try { await step.run(ctx); }
      catch (e) { console.log('  ! etapa falhou: ' + e.message); }
    }
  }

  // ── grava js/snapshots.js (mantém o que não foi recapturado com --only) ──
  const merged = ONLY.length ? { ...prev, ...shots } : shots;
  for (const [k, v] of Object.entries(merged)) if (!v || !v.img) delete merged[k];
  fs.writeFileSync(path.join(ROOT, 'js', 'snapshots.js'),
    '/* BFMiDi · Manual — PRINTS do editor (v' + readVersion() + ').\n'
    + '   Gerado por tools/capture_shots.mjs. NAO editar a mao: quando a tela\n'
    + '   do editor mudar, rode a captura de novo.\n'
    + '   { img, light?, w, h, kind?, hot: { seletor: [x, y, w, h] em fracao } } */\n'
    + '/* eslint-disable */\n"use strict";\n\nconst MN_SHOTS = '
    + JSON.stringify(merged, null, 1) + ';\n', 'utf8');
  console.log('\njs/snapshots.js — ' + Object.keys(merged).length + ' prints');
  // arquivos que sobraram de uma captura anterior
  const keep = new Set(Object.values(merged).flatMap((v) => [v.img, v.light].filter(Boolean).map((p) => path.basename(p))));
  if (!ONLY.length) for (const f of fs.readdirSync(SHOT_DIR)) if (!keep.has(f)) fs.unlinkSync(path.join(SHOT_DIR, f));

  proc.kill(); srv.close(); pedal.close(); process.exit(0);
}

function readVersion() {
  try { return /BFMIDI_FW_VERSION\s+"([^"]+)"/.exec(fs.readFileSync(path.join(REPO, 'BFMiDi_v15.ino'), 'utf8'))[1]; }
  catch { return '?'; }
}

// ══════════════════════════════════════════════════════════════════════
// AS TELAS
// A ORDEM importa: abrir CONFIGURAÇÕES › MODO AMIGÁVEL faz o editor migrar o
// modo amigável para o mapa por canal (e salvar), e o PALCO BFMIDI passa a mostrar
// "MULTIPLE MODE" no subtítulo. Por isso o palco vem antes das configurações.
// Cada etapa abre o que precisa e tira os prints. Os ids casam com o campo
// `shot` dos cards no js/content.js.
// ══════════════════════════════════════════════════════════════════════
const settingsOpen = async ({ H, sleep }, name) => {
  await H(`click('.bf-nav-home')`); await sleep(400);
  if (!await H(`click('.bf-nav-settings')`)) return false;
  await H(`wait('.bf-settings-option', 4000)`);
  const ok = await H(`click('.bf-settings-option', ${JSON.stringify(name)}, true)`);
  await sleep(1300);
  return ok;
};

// Subpáginas (out/2026): quase toda tela de configuração tem uma barra de
// abas de ícone no topo (.bf-subpage-tabs). `tab` = rótulo da aba (null = a
// primeira). Clica sempre, inclusive na primeira: voltar ao MESMO item do menu
// não garante que a tela reabra na primeira aba.
const settingsTab = async ({ H, sleep }, tab) => {
  if (!await H(`wait('.bf-subpage-tabs .bf-icon-tab', 2500)`)) return tab == null;   // tela sem abas (ATUALIZAR)
  const ok = tab == null
    ? await H(`click('.bf-subpage-tabs .bf-icon-tab')`)
    : await H(`click('.bf-subpage-tabs .bf-icon-tab', ${JSON.stringify(tab)}, true)`);
  await sleep(900);
  return ok;
};

// [item do menu, id do print, aba]. Um item pode render mais de um print.
const SETTINGS = [
  ['MODO AMIGÁVEL', 'cfg-amigavel', null], ['MODO AMIGÁVEL', 'cfg-user', 'AVANÇADO'],
  ['FOOTSWITCHES', 'cfg-footswitches', 'SW GLOBAL'],
  ['BANCOS', 'cfg-bancos', null], ['BANCOS', 'cfg-chamada', 'CHAMADA'], ['BANCOS', 'cfg-combos', 'COMBOS'],
  ['TELA', 'cfg-tela', null], ['LEDS', 'cfg-leds', 'CORES'], ['IMAGENS', 'cfg-imagens', null],
  ['HARDWARE', 'cfg-hardware', null],
  ['WIFI', 'cfg-wifi', null], ['WIFI', 'cfg-wifi-conectar', 'CONECTAR'],
  ['HOST', 'cfg-host', null], ['BLUETOOTH', 'cfg-bluetooth', 'FUNÇÃO'], ['EDITOR', 'cfg-editor', 'ATALHOS'],
  ['ATUALIZAR', 'cfg-atualizar', null], ['BACKUP', 'cfg-backup', null], ['TESTES', 'cfg-testes', null],
  ['RESTAURAR', 'cfg-restaurar', null],
];
// Prints de um card ABERTO (toque em EDITAR): [item, aba, título do card, id].
const SETTINGS_CARDS = [
  ['FOOTSWITCHES', 'EXTERNOS', 'EXPRESSÃO EXTERNA', 'cfg-exp'],
  ['FOOTSWITCHES', 'SW GLOBAL', 'SW GLOBAL', 'cfg-swglobal'],
];
const MODES = [
  ['STOMP', 'sw-stomp'], ['SPIN', 'sw-spin'], ['RAMP', 'sw-ramp'], ['MOMENT', 'sw-momentary'],
  ['MACROS', 'sw-macros'], ['TAP TEMPO', 'sw-tap'], ['SINGLE', 'sw-single'], ['STEPS', 'sw-steps'],
  ['CONTROL', 'sw-control'], ['INCREM', 'sw-increment'], ['RETORNO', 'sw-spring'], ['ONDA', 'sw-wave'],
  // MUTE saiu do seletor em 18/out/2026 (só aparece em preset antigo); o print
  // sw-mute.webp que já existe continua valendo pro card dele.
];
const goLive = async ({ H, sleep }) => {
  await H(`click('.bf-mobile-home-mode button', 'LIVE', true)`);
  await H(`wait('.bf-sw-card .bf-sw-mode-field', 8000)`);
  await sleep(900);
};
const goPreset = async ({ H, sleep }) => {
  await H(`click('.bf-mobile-home-mode button', 'PRESET', true)`);
  await sleep(900);
};

// Setlist de exemplo do MODO SETLIST (músicas e banda fictícias). O `target`
// de cada parte é o preset plano da controladora (letra*6 + preset: 0 = A1).
const SL_SEED = (() => {
  const now = Date.now();
  const P = (id, type, target, extra = {}) => ({ id, type, label: '', target, color: -1, reps: 1, notes: '',
    mode: 'notes', chords: [], extras: [], ...extra });
  const songs = [
    { id: 'mnso1', name: 'Noite de Estrada', artist: 'Banda Aurora', key: 'Em', bpm: 120, tags: ['abertura'],
      notes: 'Afinação padrão. Começa sozinho no dedilhado.', notesMode: 'notes', chords: [], updated: now,
      parts: [
        P('mnp11', 'intro', 0, { notes: 'Dedilhado limpo, 4 compassos.\nDelay curto.' }),
        P('mnp12', 'verse', 1, { notes: 'Volume baixo, palhetada abafada.\nVoz entra no 2º compasso.', reps: 2 }),
        P('mnp13', 'prechorus', 2, { notes: 'Crescendo — abre o volume no pedal.' }),
        P('mnp14', 'chorus', 3, { mode: 'chords', chords: ['Em', 'C', 'G', 'D', 'Em', 'C', 'Am', 'B7'],
          extras: [{ t: 'pc', ch: 16, n: 4, v: 0, o: 'bt' }] }),
        P('mnp15', 'solo', 4, { notes: 'Solo: 8 compassos.\nBoost ligado, delay longo.' }),
        P('mnp16', 'outro', 0, { notes: 'Volta ao dedilhado e termina no Em.' }),
      ] },
    { id: 'mnso2', name: 'Céu de Vidro', artist: 'Banda Aurora', key: 'A', bpm: 96, tags: [],
      notes: '', notesMode: 'notes', chords: [], updated: now,
      parts: [P('mnp21', 'intro', 6), P('mnp22', 'verse', 7), P('mnp23', 'chorus', 8), P('mnp24', 'outro', 6)] },
    { id: 'mnso3', name: 'Última Chamada', artist: 'Banda Aurora', key: 'D', bpm: 140, tags: [],
      notes: '', notesMode: 'notes', chords: [], updated: now,
      parts: [P('mnp31', 'intro', 12), P('mnp32', 'verse', 13), P('mnp33', 'chorus', 14), P('mnp34', 'solo', 15), P('mnp35', 'outro', 12)] },
  ];
  const setlists = [{ id: 'mnsl1', name: 'Show de Sábado', songs: songs.map((s) => s.id), updated: now }];
  const meta = { active: 'mnsl1', pos: { mnsl1: { song: 0, part: -1 } }, firstUse: now, lastChange: now - 1000,
    lastFullBackup: now, lastSnap: now, lastDaily: now };
  // uma cópia automática de ontem, pra a aba BACKUP não abrir com a lista vazia
  const snap = { at: now - 86400000, reason: 'daily', counts: { songs: songs.length, setlists: setlists.length },
    data: { songs, setlists, meta: { active: meta.active, pos: meta.pos } } };
  return { songs, setlists, meta, snap };
})();

// Grava o setlist de exemplo no IndexedDB do app (mesmo esquema do
// webApp/components/setlist_store.js). Abra a página de novo depois: o app só
// lê o banco ao abrir.
const seedSetlist = (c) => c.ev(`(async function(){
  const seed = ${JSON.stringify(SL_SEED)};
  const norm = (s) => String(s || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase().replace(/\\s+/g, ' ').trim();
  const db = await new Promise((ok, err) => { const rq = indexedDB.open('bfmidi-setlist', 1);
    rq.onupgradeneeded = () => { const d = rq.result;
      if (!d.objectStoreNames.contains('songs')) { const st = d.createObjectStore('songs', { keyPath: 'id' }); st.createIndex('name', '_n'); st.createIndex('artist', '_a'); }
      if (!d.objectStoreNames.contains('setlists')) d.createObjectStore('setlists', { keyPath: 'id' });
      if (!d.objectStoreNames.contains('meta')) d.createObjectStore('meta', { keyPath: 'k' });
      if (!d.objectStoreNames.contains('snapshots')) d.createObjectStore('snapshots', { keyPath: 'at' }); };
    rq.onsuccess = () => ok(rq.result); rq.onerror = () => err(rq.error); rq.onblocked = () => err(new Error('blocked')); });
  const t = db.transaction(['songs', 'setlists', 'meta', 'snapshots'], 'readwrite');
  for (const n of ['songs', 'setlists', 'meta', 'snapshots']) t.objectStore(n).clear();
  for (const s of seed.songs) t.objectStore('songs').put({ ...s, _n: norm(s.name), _a: norm(s.artist) });
  for (const s of seed.setlists) t.objectStore('setlists').put(s);
  for (const [k, v] of Object.entries(seed.meta)) t.objectStore('meta').put({ k, v });
  t.objectStore('snapshots').put(seed.snap);
  await new Promise((ok, err) => { t.oncomplete = ok; t.onerror = () => err(t.error); });
  db.close();
  return seed.songs.length;
})()`);

const STEPS = [
  { name: 'PRESET', ids: ['preset-tela', 'preset-console', 'preset-principal', 'preset-display', 'preset-tabbar', 'preset-extras', 'preset-swlist', 'preset-bancos', 'preset-acoes', 'preset-configurar-display'],
    async run(c) {
      await c.open('desk');
      await c.H(`wait('.bf-bank-console .bf-preset', 8000)`);
      await c.H(`wait('.bf-np-shortcut.is-device', 15000)`);
      await c.sleep(1200);
      await c.shoot('preset-tela', null, { full: true });
      await c.shoot('preset-console', '.bf-bank-console');
      await c.shoot('preset-swlist', '.bf-swlist', { pad: 6 });
      await c.shoot('preset-principal', '.bf-bank-center-stack', { fit: '.bf-bank-center-stack' });
      await c.shoot('preset-display', '.bf-bank-slot-display', { fit: '.bf-bank-slot-display' });
      await c.shoot('preset-tabbar', '.bf-tabbar', { pad: 8 });
      if (await c.H(`click('.bf-studio-np-extras-btn')`)) {
        await c.sleep(900);
        await c.shoot('preset-extras', '.bf-bank-center-stack');   // EXTRAS acrescenta uma linha
      }
      // seletor de banco (toque no mostrador A1)
      if (await c.H(`click('.bf-bank-tile')`)) {
        await c.H(`wait('.bf-bank-picker', 4000)`); await c.sleep(500);
        await c.shoot('preset-bancos', '.bf-bank-picker');
        await c.key('Escape'); await c.H(`click('.bf-modal-backdrop')`); await c.sleep(400);
      }
      // menu de acoes do rodape (copiar/colar)
      if (await c.H(`click('.bf-tabbar-plus')`)) {
        await c.H(`wait('.bf-tabbar-plus-menu', 4000)`); await c.sleep(500);
        await c.shoot('preset-acoes', ['.bf-tabbar-plus-menu', '.bf-tabbar'], { pad: 8 });
        await c.H(`click('.bf-tabbar-plus')`); await c.sleep(400);
      }
      // CONFIGURAR DISPLAY (o botão embaixo da prévia da tela; desde 17/out/2026
      // substitui o POSICIONAR). O popup é horizontal no PC.
      if (await c.H(`click('.bf-bank-slot-display .bf-dcfg-open')`)) {
        await c.H(`wait('.bf-dcfg', 4000)`); await c.sleep(900);
        await c.shoot('preset-configurar-display', '.bf-dcfg');
        await c.key('Escape'); await c.sleep(500);
      }
    } },
  { name: 'LIVE + MODOS', ids: ['live-tela', 'live-painel', 'live-display', 'sw-picker', 'sw-custom', ...MODES.map((m) => m[1])],
    async run(c) {
      await c.open('desk');
      await goLive(c);
      await c.shoot('live-tela', null, { full: true });
      await c.shoot('live-painel', '.bf-bank-slot-center', { fit: '.bf-bank-slot-center' });
      await c.shoot('live-display', '.bf-bank-slot-display', { fit: '.bf-bank-slot-display' });
      if (await c.H(`click('.bf-sw-mode-field')`)) {
        await c.H(`wait('.bf-sw-mode-modal', 5000)`); await c.sleep(500);
        await c.shoot('sw-picker', '.bf-sw-mode-modal');
        await c.H(`click('.bf-modal-backdrop')`); await c.sleep(400);
      }
      for (const [label, id] of MODES) {
        if (ONLY.length && !ONLY.includes(id)) continue;
        await c.H(`click('.bf-sw-mode-field')`);
        if (!await c.H(`wait('.bf-sw-mode-modal', 5000)`)) { console.log('  ! seletor nao abriu'); continue; }
        await c.sleep(300);
        if (!await c.H(`click('.bf-sw-mode', ${JSON.stringify(label)})`)) { console.log('  ! modo ausente ' + label); continue; }
        await c.H(`waitGone('.bf-sw-mode-modal', 4000)`);
        await c.sleep(900);
        await c.shoot(id, '.bf-bank-slot-center', { fit: '.bf-bank-slot-center' });
      }
      // devolve o SW1 ao STOMP (o resto das etapas usa o preset assim)
      await c.H(`click('.bf-sw-mode-field')`); await c.H(`wait('.bf-sw-mode-modal', 5000)`);
      await c.H(`click('.bf-sw-mode', 'STOMP', true)`); await c.sleep(900);
      // VALORES CUSTOM (disco ao lado do CANAL)
      if (!ONLY.length || ONLY.includes('sw-custom')) {
        const ok = await c.ev(`(function(){ var b=[...document.querySelectorAll('.bf-sw-card button')].find(function(x){
          return /custom/i.test((x.getAttribute('aria-label')||'') + ' ' + (x.getAttribute('title')||'')); });
          if (b) { b.click(); return true; } return false; })()`);
        if (ok) { await c.sleep(900); await c.shoot('sw-custom', '.bf-bank-slot-center', { fit: '.bf-bank-slot-center' });
          await c.ev(`(function(){ var b=[...document.querySelectorAll('.bf-sw-card button')].find(function(x){
            return /custom/i.test((x.getAttribute('aria-label')||'') + ' ' + (x.getAttribute('title')||'')); });
            if (b) b.click(); return 1; })()`); await c.sleep(500); }
        else console.log('  ! disco CUSTOM nao achado');
      }
      await goPreset(c);
    } },
  { name: 'EDITORES DE PRESET (GP-5 · TONEX)', ids: ['preset-atalhos', 'deved-gp5', 'deved-gp5-modelo', 'deved-tonex'],
    async run(c) {
      await c.scenario('default');
      await c.open('desk');
      await c.H(`wait('.bf-np-shortcut.is-device', 15000)`); await c.sleep(800);
      await c.shoot('preset-atalhos', '.bf-np-shortcuts', { pad: 8 });
      if (await c.H(`click('.bf-np-shortcut.is-gp5')`)) {
        await c.H(`wait('.bf-deved .bf-deved-lcd', 10000)`); await c.sleep(2200);
        await c.shoot('deved-gp5', '.bf-modal.bf-deved');
        if (await c.H(`click('.bf-deved-chip[data-blk="DLY"]')`)) await c.sleep(600);
        await c.key('Escape'); await c.sleep(500);
      } else console.log('  ! atalho GP-5 ausente');
      if (await c.H(`click('.bf-np-shortcut.is-tonex')`)) {
        await c.H(`wait('.bf-deved .bf-deved-lcd', 10000)`); await c.sleep(2200);
        await c.shoot('deved-tonex', '.bf-modal.bf-deved');
        await c.key('Escape'); await c.sleep(500);
      } else console.log('  ! atalho TONEX ausente');
    } },
  { name: 'MODO PALCO', ids: ['stage-1', 'stage-1-barra', 'stage-set-geral', 'stage-set-visual', 'stage-set-p1', 'stage-set-perfis', 'stage-set-p2', 'stage-2', 'stage-2-hold', 'stage-fav'],
    async run(c) {
      await c.scenario('default');
      await c.mockSet('bpm=118');
      await c.open('desk');
      await c.H(`wait('.bf-np-shortcut.is-device', 15000)`); await c.sleep(500);
      if (!await c.H(`click('.bf-np-shortcut.is-accent')`)) { console.log('  ! atalho MODO PALCO ausente (o palco so existe no build dos apps: use --editor, ver o topo deste arquivo)'); return; }
      await c.H(`wait('.bf-stage-frame.is-p1', 8000)`); await c.sleep(1500);
      for (const n of [1, 3, 4]) { await c.H(`click('.bf-stage-sw:nth-child(${n})')`); await c.sleep(300); }
      await c.sleep(4800);   // o poll traz o estado novo e a barra de cima some
      await c.shoot('stage-1', '.bf-stage');
      await c.H(`click('.bf-stage-handle')`); await c.sleep(700);
      await c.shoot('stage-1-barra', '.bf-stage');
      // configurações do palco (abre na aba do palco atual)
      if (await c.H(`click('.bf-stage-top button[aria-haspopup="dialog"]')`)) {
        await c.H(`wait('.bf-stage-sheet', 4000)`); await c.sleep(700);
        // painel lateral (Fase 1 do plano do palco): o print pega o palco
        // INTEIRO — a prévia reduzida + o painel —, que é o que o usuário vê.
        await c.shoot('stage-set-p1', '.bf-stage');
        const tabs = [['stage-set-geral', 1], ['stage-set-visual', 2], ['stage-set-p2', 4]];
        for (const [id, n] of tabs) {
          await c.H(`click('.bf-stage-rail [role=tab]:nth-child(${n})')`); await c.sleep(id === 'stage-set-p2' ? 2600 : 900);
          await c.shoot(id, '.bf-stage');
        }
        // categoria PERFIS (a 7ª desde a categoria SETLIST, a 6ª): cria dois
        // perfis só pro print e apaga depois, pra as outras etapas continuarem
        // no perfil único (sem a pílula na barra).
        await c.H(`click('.bf-stage-rail [role=tab]:nth-child(3)')`); await c.sleep(700);
        await c.H(`click('.bf-stage-rail [role=tab]:nth-child(7)')`); await c.sleep(900);
        const pfAct = (i) => `(function(){ var b=document.querySelectorAll('.bf-stage-pf-acts button')[${i}]; if(b&&!b.disabled){ b.click(); return true; } return false; })()`;
        const pfPick = (last) => `(function(){ var a=document.querySelectorAll('.bf-stage-pf-pick'); var b=a[${last ? 'a.length-1' : '0'}]; if(b) b.click(); })()`;
        for (let k = 0; k < 2; k++) { await c.ev(pfAct(2)); await c.sleep(500); }
        await c.ev(pfPick(false)); await c.sleep(700);
        await c.shoot('stage-set-perfis', '.bf-stage');
        for (let k = 0; k < 2; k++) {
          await c.ev(pfPick(true)); await c.sleep(500);
          await c.ev(pfAct(5)); await c.sleep(300); await c.ev(pfAct(5)); await c.sleep(600);
        }
        await c.key('Escape'); await c.sleep(500);
      }
      // PALCO ESPECIAL com a GP-5
      await c.H(`click('.bf-stage-handle')`); await c.sleep(500);
      if (await c.H(`click('.bf-stage-view')`)) {
        await c.H(`wait('.bf-stage-frame.is-p2 .bf-stage-detail-row', 10000)`); await c.sleep(2500);
        await c.tap('.bf-stage-blk[data-blk="DLY"]'); await c.sleep(4800);
        await c.shoot('stage-2', '.bf-stage');
        // FAVORITOS (Fase 6): troca pro layout Favoritos, escolhe oito controles
        // pela roda, fotografa e devolve o layout Completo (as outras etapas
        // usam o mesmo armazenamento).
        const p2Lay = async (i) => {
          await c.H(`click('.bf-stage-handle')`); await c.sleep(500);
          if (!await c.H(`click('.bf-stage-top button[aria-haspopup="dialog"]')`)) return false;
          await c.H(`wait('.bf-stage-sheet', 4000)`); await c.sleep(600);
          await c.H(`click('.bf-stage-rail [role=tab]:nth-child(4)')`); await c.sleep(2600);
          await c.ev(`(function(){ var b=document.querySelectorAll('[data-k="p2Layout"] .bf-stage-card')[${i}]; if(b) b.click(); })()`);
          await c.sleep(600);
          await c.key('Escape'); await c.sleep(900);
          return true;
        };
        const favPick = (label) => `(function(){ var b=document.querySelector('.bf-studio-picker-backdrop'); if(!b) return false; var it=[].slice.call(b.querySelectorAll('.bf-studio-picker-item')).find(function(e){ return e.textContent.trim() === ${JSON.stringify(label)}; }); if(it) it.click(); return !!it; })()`;
        if (await p2Lay(5)) {
          for (const label of ['AMP · Gain', 'AMP · Bass', 'AMP · Treble', 'DST · Ligado', 'DST · Gain', 'DLY · Mix', 'DLY · Time', 'RVB · Mix']) {
            await c.ev(`(function(){ var b=document.querySelector('.bf-stage-favbtn'); if(b&&!b.disabled) b.click(); })()`); await c.sleep(800);
            await c.ev(favPick(label)); await c.sleep(500);
            await c.ev(favPick(label)); await c.sleep(400);   // a roda pode pedir o segundo toque (centralizar, depois confirmar)
            await c.ev(`(function(){ var x=document.querySelector('.bf-studio-picker-backdrop .bf-studio-picker-modal-close'); if(x) x.click(); })()`); await c.sleep(300);
          }
          await c.sleep(4800);   // a barra de cima some
          await c.shoot('stage-fav', '.bf-stage');
          await p2Lay(0);
        }
      } else console.log('  ! botao do PALCO ESPECIAL ausente');
      await c.key('Escape'); await c.sleep(600);
    } },
  // EDITAR O FOOTSWITCH NO PALCO (13/out/2026): segurar o ícone abre o card
  // do SW ao lado do palco. O botão direito do mouse (contextmenu) faz o mesmo
  // e não depende do tempo de segurar. O painel mora num portal fora do
  // .bf-stage, então o print é da tela inteira.
  { name: 'PALCO · EDITAR FOOTSWITCH', ids: ['stage-swedit'],
    async run(c) {
      await c.scenario('default');
      await c.open('desk');
      await c.H(`wait('.bf-np-shortcut.is-accent', 12000)`); await c.sleep(600);
      if (!await c.H(`click('.bf-np-shortcut.is-accent')`)) { console.log('  ! atalho MODO PALCO ausente (use --editor com o build dos apps)'); return; }
      await c.H(`wait('.bf-stage-frame.is-p1 .bf-stage-sw', 8000)`); await c.sleep(1500);
      await c.ev(`(function(){ var b=document.querySelector('.bf-stage-sw'); if(!b) return false;
        var r=b.getBoundingClientRect(); b.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true,
          clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, button: 2 })); return true; })()`);
      if (!await c.H(`wait('.bf-stage-swdock', 5000)`)) { console.log('  ! painel do footswitch nao abriu'); await c.key('Escape'); return; }
      await c.sleep(2200);
      await c.shoot('stage-swedit', null, { full: true });
      await c.key('Escape'); await c.sleep(500);
      await c.key('Escape'); await c.sleep(500);
    } },
  // MODO SETLIST (19/out/2026): a 3ª tela do palco, só no build dos apps (use
  // --editor, ver o topo). O banco de músicas mora no IndexedDB do app
  // ('bfmidi-setlist'), então a etapa o SEMEIA antes de abrir: um setlist de
  // exemplo com três músicas. A tela, o editor ao lado (a música aberta), a
  // categoria SETLIST das configurações do palco (a 6ª do trilho) e a aba
  // BACKUP do editor.
  { name: 'MODO SETLIST', ids: ['stage-sl', 'stage-sl-editor', 'stage-set-sl', 'stage-sl-backup'],
    async run(c) {
      await c.scenario('default');
      await c.open('desk');
      await seedSetlist(c);
      await c.open('desk');
      await c.H(`wait('.bf-np-shortcut.is-accent', 12000)`); await c.sleep(600);
      if (!await c.H(`click('.bf-np-shortcut', 'SETLIST')`)) { console.log('  ! atalho SETLIST ausente (use --editor com o build dos apps)'); return; }
      if (!await c.H(`wait('.bf-sl-screen .bf-sl-part', 8000)`)) { console.log('  ! tela do setlist sem partes (a semente nao entrou?)'); await c.key('Escape'); return; }
      await c.sleep(1200);
      // chama o REFRÃO (cifras na área de anotações) e espera o mapa chegar na
      // controladora simulada; a barra de cima fica escondida (o selo e o
      // EDITAR SETLIST moram nela — o marcador aponta a alcinha)
      await c.tap('.bf-sl-part:nth-child(4)'); await c.sleep(4800);
      await c.shoot('stage-sl', '.bf-stage');
      // EDITAR (cabeçalho da música): o editor abre ao lado, na música
      if (await c.H(`clickIn('.bf-sl-head-acts', '.bf-sl-chip', 'EDITAR')`)) {
        if (await c.H(`wait('.bf-sl-dock .bf-sl-parted', 5000)`)) {
          await c.sleep(600);
          // abre o REFRÃO (cifras) e rola até a lista de partes
          await c.H(`click('.bf-sl-pe:nth-child(4) .bf-sl-pe-main')`); await c.sleep(600);
          await c.ev(`(function(){ var b=document.querySelector('.bf-sl-dock-body'), h=document.querySelector('.bf-sl-subhead');
            if(b&&h) b.scrollTop = h.offsetTop - b.offsetTop - 8; return 1; })()`);
          await c.sleep(500);
          await c.shoot('stage-sl-editor', null, { full: true });
        } else console.log('  ! editor da musica nao abriu');
        await c.key('Escape'); await c.sleep(600);
      }
      // aba BACKUP (EDITAR SETLIST na barra)
      await c.H(`click('.bf-stage-handle')`); await c.sleep(500);
      if (await c.H(`click('.bf-stage-pill', 'EDITAR SETLIST', true)`)) {
        await c.H(`wait('.bf-sl-dock .bf-sl-tabs', 5000)`); await c.sleep(400);
        if (await c.H(`click('.bf-sl-tab', 'BACKUP', true)`)) {
          await c.H(`wait('.bf-sl-dock .bf-sl-bk', 4000)`); await c.sleep(700);
          await c.shoot('stage-sl-backup', null, { full: true });
        } else console.log('  ! aba BACKUP ausente');
        await c.key('Escape'); await c.sleep(600);
      } else console.log('  ! EDITAR SETLIST ausente na barra');
      // configurações do palco, categoria SETLIST (a 6ª do trilho)
      await c.H(`click('.bf-stage-handle')`); await c.sleep(500);
      if (await c.H(`click('.bf-stage-top button[aria-haspopup="dialog"]')`)) {
        await c.H(`wait('.bf-stage-sheet', 4000)`); await c.sleep(700);
        await c.H(`click('.bf-stage-rail [role=tab]:nth-child(6)')`); await c.sleep(1200);
        await c.shoot('stage-set-sl', '.bf-stage');
        await c.key('Escape'); await c.sleep(500);
      }
      await c.key('Escape'); await c.sleep(500);
    } },
  // Os comandos de setlist na CHAMADA DE PRESETS (CONFIGURAÇÕES › BANCOS):
  // a lista de ações de uma célula aberta, com o grupo SETLIST no fim.
  { name: 'SETLIST · CHAMADA', ids: ['stage-sl-pe'],
    async run(c) {
      await c.scenario('default');
      await c.open('desk');
      await c.H(`wait('.bf-np-shortcut.is-device', 15000)`);
      if (!await settingsOpen(c, 'BANCOS')) { console.log('  ! opcao ausente: BANCOS'); return; }
      if (!await settingsTab(c, 'CHAMADA')) { console.log('  ! aba CHAMADA ausente'); return; }
      if (!await c.H(`click('.bf-ck-pc-cell')`)) { console.log('  ! celula da CHAMADA ausente'); return; }
      await c.H(`wait('.bf-ck-pc-pick', 4000)`); await c.sleep(600);
      await c.H(`mark('.bf-ck-pc-opt', 'SETLIST: CHAMAR PARTE', 'sl-call')`);
      await c.H(`mark('.bf-ck-pc-opt', 'SETLIST: PRÓXIMA PARTE', 'sl-next')`);
      await c.H(`mark('.bf-ck-pc-opt', 'SETLIST: PRÓXIMA MÚSICA', 'sl-song')`);
      await c.shoot('stage-sl-pe', '.bf-ck-pc-pick', { pad: 10 });
    } },
  { name: 'NANO CORTEX', ids: ['deved-nano', 'stage-2-nano'],
    async run(c) {
      await c.scenario('nano');
      await c.open('desk');
      await c.H(`wait('.bf-np-shortcut.is-nano-cortex', 15000)`); await c.sleep(600);
      if (await c.H(`click('.bf-np-shortcut.is-nano-cortex')`)) {
        await c.H(`wait('.bf-deved .bf-deved-lcd', 10000)`); await c.sleep(2200);
        await c.shoot('deved-nano', '.bf-modal.bf-deved');
        await c.key('Escape'); await c.sleep(500);
      } else console.log('  ! atalho NANO CORTEX ausente');
      if (await c.H(`click('.bf-np-shortcut.is-accent')`)) {
        await c.H(`wait('.bf-stage-frame.is-p1', 8000)`); await c.sleep(1200);
        await c.H(`click('.bf-stage-handle')`); await c.sleep(500);
        await c.H(`click('.bf-stage-view')`);
        await c.H(`wait('.bf-stage-frame.is-p2 .bf-stage-detail-row', 10000)`); await c.sleep(4800);
        await c.shoot('stage-2-nano', '.bf-stage');
        await c.key('Escape'); await c.sleep(500);
      }
    } },
  { name: 'PALCO NO APP (galeria de fundos)', ids: ['stage-set-img', 'stage-1-foto'],
    async run(c) {
      // finge ser o app de Windows: é o que liga a galeria do app no palco
      const { identifier } = await c.cdp.send('Page.addScriptToEvaluateOnNewDocument',
        { source: 'window.__BFMIDI_WINDOWS_APP = true;' });
      try {
        await c.scenario('default');
        await c.open('desk');
        await c.H(`wait('.bf-np-shortcut.is-accent', 12000)`); await c.sleep(800);
        if (!await c.H(`click('.bf-np-shortcut.is-accent')`)) return;
        await c.H(`wait('.bf-stage-frame.is-p1', 8000)`); await c.sleep(1500);
        await c.H(`click('.bf-stage-handle')`); await c.sleep(500);
        if (await c.H(`click('.bf-stage-top button[aria-haspopup="dialog"]')`)) {
          await c.H(`wait('.bf-stage-sheet', 4000)`); await c.sleep(900);
          // categoria IMAGENS (a 5ª do trilho): galeria + recorte
          await c.H(`click('.bf-stage-rail [role=tab]:nth-child(5)')`); await c.sleep(1400);
          await c.shoot('stage-set-img', '.bf-stage');
          // escolhe uma imagem da galeria e mostra o palco com ela
          const ok = await c.ev(`(function(){ var t=[...document.querySelectorAll('.bf-stage-imgtile')].find(function(x){ return (x.innerText||'').trim() === 'Holofotes'; }); var b = t && (t.querySelector('button') || t); if(b){ b.click(); return true;} return false; })()`);
          await c.sleep(900);
          await c.key('Escape'); await c.sleep(4800);
          if (ok) await c.shoot('stage-1-foto', '.bf-stage');
        }
        await c.key('Escape');
      } finally {
        await c.cdp.send('Page.removeScriptToEvaluateOnNewDocument', { identifier });
      }
    } },
  { name: 'PALCO NO CELULAR (deitado)', ids: ['stage-land', 'stage-land-2'],
    async run(c) {
      await c.scenario('default');
      await c.open('land');
      await c.H(`wait('.bf-np-shortcut.is-accent', 12000)`); await c.sleep(1500);
      if (await c.H(`click('.bf-np-shortcut.is-accent')`)) {
        await c.ev('window.scrollTo(0, 0)');
        await c.H(`wait('.bf-stage-frame.is-p1', 8000)`); await c.sleep(2500);
        await c.shoot('stage-land', null, { full: true, kind: 'landscape' });
        await c.H(`click('.bf-stage-handle')`); await c.sleep(500);
        await c.H(`click('.bf-stage-view')`);
        await c.H(`wait('.bf-stage-frame.is-p2 .bf-stage-detail-row', 10000)`); await c.sleep(4800);
        await c.shoot('stage-land-2', null, { full: true, kind: 'landscape' });
        await c.key('Escape');
      }
    } },
  { name: 'CONEXÃO', ids: ['connect-popup', 'tabbar-offline'],
    async run(c) {
      await c.open('desk', '&__x=1');
      await c.cdp.send('Page.navigate', { url: 'http://127.0.0.1:8931/index.html?api=' + encodeURIComponent('http://127.0.0.1:8999') });
      await c.sleep(2500);
      await c.ev(PAGE_HELPERS);
      await c.ev(`(function(){ var s=document.getElementById('mn-cap-css'); if(!s){ s=document.createElement('style'); s.id='mn-cap-css'; document.head.appendChild(s);} s.textContent=${JSON.stringify(CAPTURE_CSS)}; return 1; })()`);
      if (await c.H(`wait('dialog.bf-cx[open], .bf-wifi-dialog.bf-cx', 12000)`)) {
        await c.sleep(1200);
        await c.shoot('connect-popup', 'dialog.bf-cx');
        await c.key('Escape'); await c.sleep(800);
      } else console.log('  ! popup de conexao nao abriu');
      await c.shoot('tabbar-offline', '.bf-tabbar', { pad: 8 });
    } },
  { name: 'CELULAR', ids: ['phone-preset', 'phone-live'],
    async run(c) {
      await c.open('phone');
      await c.H(`wait('.bf-bank-console .bf-preset', 8000)`); await c.sleep(1200);
      await c.shoot('phone-preset', null, { full: true, kind: 'phone' });
      await goLive(c);
      await c.shoot('phone-live', null, { full: true, kind: 'phone' });
      await goPreset(c);
    } },
  { name: 'KEMPER PLAYER', ids: ['ked', 'stage-kemper', 'cfg-kemper', 'cfg-afinador'],
    async run(c) {
      await c.scenario('kemper');
      await c.mockGlobal('match_mode=0&match_channel_0=9&kemper_get_names=1');
      await c.mockSet('pedal_name=' + encodeURIComponent('Brit Lead'));
      await c.setSwNums('A1', { 1: 17, 2: 18, 3: 1, 4: 24, 5: 27, 6: 29 });
      await c.open('desk');
      await c.ev(`(function(){ try { localStorage.setItem('bfmidi_kemper_level_v1', '3'); } catch(e){} return 1; })()`);
      await c.open('desk');
      await c.H(`wait('.bf-np-shortcut.is-kemper', 15000)`); await c.sleep(600);
      if (await c.H(`click('.bf-np-shortcut.is-kemper')`)) {
        await c.H(`wait('.bf-deved.is-kemper .bf-deved-lcd', 12000)`); await c.sleep(3500);
        await c.shoot('ked', '.bf-modal.bf-deved.is-kemper');
        await c.key('Escape'); await c.sleep(800);
      } else console.log('  ! atalho KEMPER ausente');
      if (await c.H(`click('.bf-np-shortcut.is-accent')`)) {
        await c.H(`wait('.bf-stage-frame.is-p1', 8000)`); await c.sleep(1200);
        await c.H(`click('.bf-stage-handle')`); await c.sleep(500);
        await c.H(`click('.bf-stage-view')`);
        await c.H(`wait('.bf-stage-frame.is-p2', 8000)`); await c.sleep(4800);
        await c.shoot('stage-kemper', '.bf-stage');
        await c.key('Escape'); await c.sleep(500);
      }
      // MODO AMIGÁVEL com o Kemper no canal: aba AFINADOR (opções do
      // afinador) e aba AVANÇADO (o card exclusivo do Kemper)
      if (await settingsOpen(c, 'MODO AMIGÁVEL')) {
        await c.sleep(900);
        if (!ONLY.length || ONLY.includes('cfg-afinador')) {
          if (await settingsTab(c, 'AFINADOR')) await c.shoot('cfg-afinador', '.bf-content', { children: true, tall: true, pad: 14 });
          else console.log('  ! aba AFINADOR ausente');
        }
        if (await settingsTab(c, 'AVANÇADO')) {
          const card = await c.H(`markCard('KEMPER', 'kemper')`);
          if (card) await c.shoot('cfg-kemper', card, { tall: true, pad: 0 });
          else console.log('  ! card KEMPER ausente na aba AVANÇADO');
        } else console.log('  ! aba AVANÇADO ausente');
      }
      await c.mockGlobal('match_mode=6&match_channel_0=6');
      await c.mockSet('pedal_name=');
      await c.setSwNums('A1', { 1: 50, 2: 55, 3: 56, 4: 57, 5: 49, 6: 48 });
    } },
  { name: 'CONFIGURAÇÕES', ids: ['cfg-menu', 'cfg-atualizar-host', ...SETTINGS.map((s) => s[1]), ...SETTINGS_CARDS.map((s) => s[3])],
    async run(c) {
      await c.scenario('default');
      await c.open('desk');
      await c.H(`wait('.bf-np-shortcut.is-device', 15000)`);
      await c.H(`click('.bf-nav-settings')`);
      await c.H(`wait('.bf-settings-popup', 4000)`); await c.sleep(500);
      await c.shoot('cfg-menu', '.bf-settings-popup');
      await c.H(`click('.bf-settings-close')`); await c.sleep(300);
      for (const [name, id, tab] of SETTINGS) {
        if (ONLY.length && !ONLY.includes(id) && !(id === 'cfg-atualizar' && ONLY.includes('cfg-atualizar-host'))) continue;
        if (!await settingsOpen(c, name)) { console.log('  ! opcao ausente: ' + name); continue; }
        await c.sleep(900);
        if (!await settingsTab(c, tab)) { console.log('  ! aba ausente: ' + name + ' › ' + tab); continue; }
        await c.shoot(id, '.bf-content', { children: true, tall: true, pad: 14 });
        if (id === 'cfg-atualizar' && (!ONLY.length || ONLY.includes('cfg-atualizar-host'))) {
          if (await c.H(`click('.bf-updx-tab', 'USB HOST')`) || await c.H(`click('.bf-updx-tab:nth-child(2)')`)) {
            await c.sleep(1500);
            await c.shoot('cfg-atualizar-host', '.bf-content', { children: true, tall: true, pad: 14 });
          }
        }
      }
      // cards abertos pelo EDITAR (só os que algum card do manual usa)
      for (const [name, tab, title, id] of SETTINGS_CARDS) {
        if (ONLY.length && !ONLY.includes(id)) continue;
        if (!USED.has(id) && !argv.includes('--all')) continue;
        if (!await settingsOpen(c, name)) { console.log('  ! opcao ausente: ' + name); continue; }
        await c.sleep(700);
        if (!await settingsTab(c, tab)) { console.log('  ! aba ausente: ' + name + ' › ' + tab); continue; }
        const card = await c.H(`markCard(${JSON.stringify(title)}, ${JSON.stringify(id)})`);
        if (card && await c.H(`clickIn(${JSON.stringify(card)}, 'button, [role=button]', 'EDITAR')`)) {
          await c.sleep(900);
          await c.shoot(id, card, { tall: true });
        } else console.log('  ! ' + id + ' sem EDITAR');
      }
    } },
];

main().catch((e) => { console.error(e); process.exit(1); });
