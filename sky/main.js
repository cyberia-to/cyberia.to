/* the sky of cyberia: sun left, earth right — every body where it stands now, the stars as they stand.
   this file owns the page's side of it: the canvas, the clock, the order of things, the frame loop.
   it loads the rest only on a desk; a phone gets this file and nothing more.

   sky/facts.js     the tables: JPL elements, IAU poles and radii, the Yale bright stars
   sky/astro.js     the laws: positions and axes as pure functions of the Julian day
   sky/look.js      the taste: sizes, colours, glow, blur, twinkle
   sky/draw.js      the 2d primitives
   sky/scene.js     the geometry of this screen and the camera
   sky/spheres.js   a map on a lit ball
   sky/bodies.js    the sun, the earth, the moon, the planets
   sky/backdrop.js  the stars, the milky way, the orbits as light, the belt, the meteors
   sky/plots.js     every body cut into 10 242 plots
   sky/focus.js     a click on a body opens it: sky/globe.js turns it in WebGL, sky/panel.js shows its plots */

var DESKTOP = '(min-width: 960px)';
var STILL = '(prefers-reduced-motion: reduce)';

var sky = null, canvas = null, ctx = null, running = false, paused = false, raf = 0, t0 = 0, last = 0;

function desktop() { return matchMedia(DESKTOP).matches; }
function still() { return matchMedia(STILL).matches; }

/* the only clock: every module below gets the moment from here */
function clock() { return sky.astro.julian(Date.now()); }

function load() {
    if (!sky) {
        sky = Promise.all([import('./astro.js'), import('./scene.js'), import('./bodies.js'), import('./backdrop.js'), import('./focus.js')])
            .then(function (m) { return (sky = { astro: m[0], scene: m[1], bodies: m[2], backdrop: m[3], focus: m[4] }); });
    }
    return Promise.resolve(sky);
}

function layout() {
    var cssW = canvas.clientWidth, cssH = canvas.clientHeight, ratio = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== Math.floor(cssW * ratio) || canvas.height !== Math.floor(cssH * ratio)) {
        canvas.width = Math.floor(cssW * ratio);
        canvas.height = Math.floor(cssH * ratio);
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    sky.scene.size(cssW, cssH, ratio);
    var jd = clock(), at = sky.scene.orient(jd);
    sky.backdrop.bakeBackdrop(at.T, at.earthAu);
    sky.bodies.bake(jd);
}

function paint(t, dt) {
    var s = sky.scene, b = sky.bodies, d = sky.backdrop, jd = clock(), list, i;
    ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, s.W, s.H);
    d.drawStarfield(ctx, t);
    b.drawHaze(ctx);
    d.drawLight(ctx);
    d.drawRocks(ctx);
    /* the earth turns a quarter of a degree a minute, jupiter and saturn faster still */
    b.tick(jd);
    list = b.placeBodies(jd);
    sky.focus.track(list);
    for (i = 0; i < list.length; i++) {
        if (list[i].sun) b.drawSun(ctx, t);
        else b.drawPlanet(ctx, list[i].p, list[i].x, list[i].y, list[i].r, list[i].moon);
    }
    d.drawMeteors(ctx, dt || 0);
}

function frame(now) {
    if (!running || paused) return;
    if (!last) last = now;
    var t = (now - t0) / 1000;
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    paint(t, dt);
    if (!still()) raf = requestAnimationFrame(frame);
}

function begin() {
    if (!desktop()) { stop(); return; }
    try {
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.className = 'sky';
            canvas.setAttribute('aria-hidden', 'true');
            document.body.insertBefore(canvas, document.body.firstChild);
            ctx = canvas.getContext('2d', { alpha: false });
            sky.bodies.loadTextures(clock, function () { if (running && still()) paint(0, 0); });
            sky.focus.init({ clock: clock, pause: pause, resume: resume });
        }
        canvas.style.display = '';
        layout();
        t0 = performance.now(); last = 0;
        running = true;
        paint(0, 0);
        if (!still()) raf = requestAnimationFrame(frame);
    } catch (err) { try { console.error(err); } catch (e) {} }
}

function start() {
    if (!desktop()) { stop(); return; }
    load().then(begin).catch(function (err) { try { console.error(err); } catch (e) {} });
}

/* while a body is open up close, the sky behind it holds still */
function pause() { paused = true; if (raf) cancelAnimationFrame(raf); raf = 0; }
function resume() { paused = false; if (running && !still()) { last = 0; raf = requestAnimationFrame(frame); } }

function stop() {
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    if (canvas) canvas.style.display = 'none';
}

var resizeWait = 0;
function onResize() {
    clearTimeout(resizeWait);
    resizeWait = setTimeout(function () {
        if (!desktop()) { stop(); return; }
        if (!running) start();
        else layout();
    }, 80);
}

document.addEventListener('visibilitychange', function () {
    if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; last = 0; }
    else if (running && !paused && !still()) { last = 0; raf = requestAnimationFrame(frame); }
});
window.addEventListener('resize', onResize);
matchMedia(DESKTOP).addEventListener('change', onResize);
matchMedia(STILL).addEventListener('change', function () { stop(); start(); });

/* the page loads this async: it starts as soon as there is a body to hang the canvas in */
if (document.body) setTimeout(start, 0);
else document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 0); });
