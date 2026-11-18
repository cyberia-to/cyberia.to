/* a click on a body in the sky opens it up close: the globe to turn on the left, its plots' panel on the right.
   the page keeps its links: a click on a link, a button or the player is theirs, never a body's */
import { centuries, planetEcl, moonEcl, bodyAxes, earthAxes, moonAxesJ2000, toJ2000, norm3, dot3, cross } from './astro.js';
import { POLES, RADIUS_KM } from './facts.js';
import { PLANETS } from './look.js';
import { worldAng, earthWorld, toWorld, vantage, moonRadius } from './scene.js';
import { tex } from './bodies.js';
import { texels } from './spheres.js';
import { createGlobe } from './globe.js';
import { createPanel } from './panel.js';
import { still } from './draw.js';

var CSS = '.orb{position:fixed;inset:0;z-index:2147483100;display:flex;align-items:center;justify-content:center;gap:clamp(24px,4vw,64px);' +
    'background:rgba(0,0,0,.8);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);font-family:Play,sans-serif;color:#ccc;opacity:0;transition:opacity .3s ease}' +
    '.orb.on{opacity:1}' +
    '.orb-stage{position:relative;width:min(84vh,calc(100vw - 480px));aspect-ratio:1;flex:none}' +
    '.orb-stage:before{content:"";position:absolute;inset:4%;border-radius:50%;background:radial-gradient(circle,var(--air) 0%,transparent 68%);opacity:.22;filter:blur(30px);pointer-events:none}' +
    '.orb-globe{position:relative;width:100%;height:100%;display:block;cursor:grab;touch-action:none;opacity:0;transition:opacity .5s ease;' +
    '-webkit-mask-image:radial-gradient(closest-side,#000 84%,transparent 100%);mask-image:radial-gradient(closest-side,#000 84%,transparent 100%)}' +
    '.orb-globe.ready{opacity:1}.orb-globe.drag{cursor:grabbing}.orb-globe.over{cursor:pointer}' +
    '.orb-panel{width:320px;max-height:84vh;overflow:auto;flex:none;scrollbar-width:thin}' +
    '.orb-kicker{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#556}' +
    '.orb-name{font-size:40px;line-height:1.1;color:#fff;margin:2px 0 18px;font-weight:700}' +
    '.orb-plot{font-size:24px;color:#00b4ff;margin:18px 0 12px;font-variant-numeric:tabular-nums}' +
    '.orb-ground{display:block;width:264px;height:264px;border:1px solid #1a1a24;border-radius:4px;margin-bottom:14px}' +
    '.orb-facts{display:grid;grid-template-columns:96px 1fr;gap:7px 12px;font-size:14px;margin:0}' +
    '.orb-facts dt{color:#667}.orb-facts dd{margin:0;color:#ddd;font-variant-numeric:tabular-nums}' +
    '.orb-nb{font:12px Play,sans-serif;color:#00ff01;background:transparent;border:1px solid #1a3a1c;border-radius:3px;padding:2px 6px;margin:0 4px 4px 0;cursor:pointer}' +
    '.orb-nb:hover{border-color:#00ff01;background:rgba(0,255,1,.08)}' +
    '.orb-hint{margin-top:18px;font-size:13px;color:#667}' +
    '.orb-close{position:absolute;top:18px;right:22px;width:40px;height:40px;border-radius:50%;border:1.5px solid #1a1a24;background:transparent;color:#ccc;font:22px/1 Play,sans-serif;cursor:pointer}' +
    '.orb-close:hover{border-color:#00ff01;color:#00ff01}';

var hooks = null, list = [], open = null, styled = false;

/* main hands over the clock and a way to pause the sky behind; then the bodies of every frame */
export function init(h) {
    hooks = h;
    document.addEventListener('pointermove', onMove, { passive: true });
    document.addEventListener('click', onClick);
}
export function track(bodies) { list = bodies; }

function interactive(t) { return t && t.closest && t.closest('a,button,input,textarea,select,label,[data-cyberia-player],.orb'); }

/* the body under a point of the page, nearest first; small bodies get a finger's width of slack */
function hit(x, y) {
    var i, b, d;
    for (i = list.length - 1; i >= 0; i--) {
        b = list[i];
        if (b.sun) continue;
        if (b.moon && Math.hypot(x - b.moon.x, y - b.moon.y) <= Math.max(moonRadius() + 3, 9)) return 'moon';
        d = Math.hypot(x - b.x, y - b.y);
        if (d <= Math.max(b.r + 4, 10)) return b.p.id;
    }
    return null;
}

function onMove(e) {
    if (open || !list.length) return;
    var over = !interactive(e.target) && hit(e.clientX, e.clientY);
    document.documentElement.style.cursor = over ? 'pointer' : '';
}
function onClick(e) {
    if (open || interactive(e.target)) return;
    var id = hit(e.clientX, e.clientY);
    if (id) { document.documentElement.style.cursor = ''; show(id); }
}

/* everything the globe needs about a body, in the body's own frame, at this moment */
function describe(id, jd) {
    var T = centuries(jd), e = planetEcl('earth', T), axes, pos, world, p;
    if (id === 'earth') { axes = earthAxes(jd); pos = [e.x, e.y, e.z]; world = earthWorld; }
    else if (id === 'moon') {
        var m = toJ2000((function (q) { return [q.x, q.y, q.z]; })(moonEcl(jd)), jd);
        axes = moonAxesJ2000(jd); pos = [e.x + m[0], e.y + m[1], e.z + m[2]]; world = earthWorld;
    } else {
        var q = planetEcl(id, T);
        axes = bodyAxes(POLES[id], jd); pos = [q.x, q.y, q.z]; world = toWorld(q.x, q.y, q.z, Math.hypot(e.x, e.y, e.z));
    }
    function own(v) { return [dot3(v, axes.X), dot3(v, axes.Y), dot3(v, axes.Z)]; }
    /* the world of the page is the ecliptic turned so the earth stands on +x: turn it back */
    var c = Math.cos(worldAng), s = Math.sin(worldAng);
    function ecl(v) { return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]]; }
    var see = vantage(jd, world), sun = own(norm3(-pos[0], -pos[1], -pos[2]));
    /* the view opens from the sky's camera turned halfway toward the sun: day and night both in sight,
       the light where it truly falls; the sky's up stays up */
    var U0 = own(ecl(see.axes[1])), O0 = own(ecl(see.axes[2]));
    var O = norm3(O0[0] + sun[0], O0[1] + sun[1], O0[2] + sun[2]);
    if (Math.hypot(O0[0] + sun[0], O0[1] + sun[1], O0[2] + sun[2]) < 1e-6) O = O0;
    var R = cross(U0, O); R = norm3(R[0], R[1], R[2]);
    p = PLANETS.filter(function (x) { return x.id === id; })[0];
    return {
        id: id,
        name: id.charAt(0).toUpperCase() + id.slice(1),
        radiusKm: RADIUS_KM[id],
        sun: sun,
        view: { R: R, U: cross(O, R), O: O },
        air: p ? p.glow[0] : '#a8a49c',
        flat: id === 'mercury' || id === 'moon',
        earth: id === 'earth',
        rings: !!(p && p.rings)
    };
}

function image(src) {
    return new Promise(function (ok, fail) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = fail; i.src = src; });
}

/* saturn's rings from the atlas: colour weighed by opacity, and opacity, 512 steps from the inside out */
function ringStrip() {
    if (!tex.atlas) return null;
    var a = texels(tex.atlas, 512, 2080), d = new Uint8Array(512 * 4), i, o, k;
    for (i = 0; i < 512; i++) {
        o = (2056 * 512 + i) * 4; k = (2072 * 512 + i) * 4;
        d[i * 4] = a.d[o]; d[i * 4 + 1] = a.d[o + 1]; d[i * 4 + 2] = a.d[o + 2]; d[i * 4 + 3] = a.d[k];
    }
    return { w: 512, data: d };
}

/* open a body by its id: 'mercury' … 'neptune', 'moon' */
export function show(id) {
    if (!styled) { var st = document.createElement('style'); st.textContent = CSS; document.head.appendChild(st); styled = true; }
    var body = describe(id, hooks.clock());
    var root = document.createElement('div'), stage = document.createElement('div'), canvas = document.createElement('canvas');
    var panel = document.createElement('aside'), close = document.createElement('button');
    root.className = 'orb'; root.setAttribute('role', 'dialog'); root.setAttribute('aria-label', body.name + ', its plots');
    stage.className = 'orb-stage'; stage.style.setProperty('--air', body.air);
    canvas.className = 'orb-globe'; panel.className = 'orb-panel';
    close.className = 'orb-close'; close.type = 'button'; close.setAttribute('aria-label', 'close'); close.textContent = '×';
    stage.appendChild(canvas); root.appendChild(stage); root.appendChild(panel); root.appendChild(close);
    document.body.appendChild(root);
    requestAnimationFrame(function () { root.classList.add('on'); });
    hooks.pause();

    var state = { root: root, globe: null, hover: -1, chosen: -1, spin: null };
    open = state;
    close.addEventListener('click', hide);
    root.addEventListener('click', function (e) { if (e.target === root) hide(); });
    document.addEventListener('keydown', onKey);
    close.focus({ preventScroll: true });

    var src = id === 'earth' ? '/img/earth.jpg' : '/img/planets/' + id + '.jpg';
    Promise.all([image(src), id === 'earth' ? image('/img/earth-night.jpg') : null]).then(function (imgs) {
        if (open !== state) return;
        body.map = imgs[0]; body.night = imgs[1];
        body.ring = body.rings ? ringStrip() : null;
        var pane = createPanel(panel, { name: body.name, radiusKm: body.radiusKm, map: body.map }, choose);
        var globe = createGlobe(canvas, body);
        state.globe = globe; state.pane = pane;
        canvas.classList.add('ready');
        wire(state, canvas);
    }).catch(function (err) { try { console.error(err); } catch (e) {} });

    function choose(k, turn) {
        state.chosen = k;
        if (turn) state.globe.face(k);
        state.globe.mark(state.hover, k);
        state.pane.show(k);
    }
    state.choose = choose;
}

/* drag turns the body and lets it coast; a click without a drag chooses the plot under it; the wheel comes nearer */
function wire(state, canvas) {
    var g = state.globe, down = null, moved = 0, vx = 0, vy = 0, lastT = 0;
    function local(e) { var r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
    function coast() {
        if (open !== state || down || (Math.abs(vx) < 0.02 && Math.abs(vy) < 0.02)) { state.spin = null; return; }
        g.turn(vx * 16, vy * 16); vx *= 0.94; vy *= 0.94;
        state.spin = requestAnimationFrame(coast);
    }
    canvas.addEventListener('pointerdown', function (e) {
        down = local(e); moved = 0; vx = vy = 0; lastT = performance.now();
        canvas.setPointerCapture(e.pointerId);
        if (state.spin) { cancelAnimationFrame(state.spin); state.spin = null; }
    });
    canvas.addEventListener('pointermove', function (e) {
        var p = local(e), now = performance.now(), dt;
        if (down) {
            var dx = p[0] - down[0], dy = p[1] - down[1];
            moved += Math.abs(dx) + Math.abs(dy);
            if (moved > 4) {
                canvas.classList.add('drag');
                g.turn(dx, dy);
                dt = Math.max(1, now - lastT); vx = dx / dt; vy = dy / dt; lastT = now;
            }
            down = p;
            return;
        }
        var k = g.pick(p[0], p[1]);
        canvas.classList.toggle('over', k >= 0);
        if (k !== state.hover) { state.hover = k; g.mark(k, state.chosen); }
    });
    canvas.addEventListener('pointerup', function (e) {
        var p = local(e);
        canvas.classList.remove('drag');
        if (moved <= 4) {
            var k = g.pick(p[0], p[1]);
            if (k >= 0) state.choose(k, false);
        } else if (!still() && performance.now() - lastT < 80) state.spin = requestAnimationFrame(coast);
        down = null;
    });
    canvas.addEventListener('pointerleave', function () { if (!down && state.hover >= 0) { state.hover = -1; g.mark(-1, state.chosen); } });
    canvas.addEventListener('wheel', function (e) { e.preventDefault(); g.zoomBy(Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
    window.addEventListener('resize', state.onResize = function () { g.size(); });
}

function onKey(e) { if (e.key === 'Escape') hide(); }

function hide() {
    var s = open;
    if (!s) return;
    open = null;
    document.removeEventListener('keydown', onKey);
    if (s.onResize) window.removeEventListener('resize', s.onResize);
    if (s.spin) cancelAnimationFrame(s.spin);
    s.root.classList.remove('on');
    setTimeout(function () { if (s.globe) s.globe.destroy(); s.root.remove(); }, 320);
    hooks.resume();
}
