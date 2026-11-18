/* the bodies: the sun as SDO saw it over the last two days, the earth turned to the hour with its day and night,
   the moon, the planets — baked from their maps, placed at their true positions, drawn nearest last */
import { TAU, EPS, hypot3, centuries, planetEcl, moonEcl, gmst, moonAxes } from './astro.js';
import { unit, smooth, still, glowDisc } from './draw.js';
import { PLANETS, MOON, SUN } from './look.js';
import { dpr, sx, sy, sunR, earthR, cam, earthWorld, toWorld, project, vantage, moonRadius, bodyRadius } from './scene.js';
import { texels, texel, bakeBall, framed, spin, shown, stamp } from './spheres.js';

var SUN_FILL = 0.8; /* img/sun.jpg: the limb radius over half the frame (img/textures.py) */
/* img/planets.jpg, top to bottom */
var MAPS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'moon'];

export var tex = { sun: null, day: null, night: null, atlas: null, dayPx: null, nightPx: null, maps: null, ring: null };
var sunSprite = null, sprites = {}, earthBaked = 0, earthJob = null;
var motion = null; /* the sun in motion: { v: the video, light: the disc's brightness per frame, fps, since } */

/* the maps arrive one by one; each bakes what it feeds, then ready() lets the page repaint */
export function loadTextures(clock, ready) {
    function load(src, key, bake) {
        var img = new Image();
        img.onload = function () {
            tex[key] = img;
            try {
                bake();
                ready();
            } catch (err) { try { console.error(err); } catch (e) {} }
        };
        img.src = src;
    }
    load('/img/sun.jpg', 'sun', bakeSun);
    load('/img/earth.jpg', 'day', function () { bakeEarth(clock()); });
    load('/img/earth-night.jpg', 'night', function () { bakeEarth(clock()); });
    load('/img/planets.jpg', 'atlas', function () { cutAtlas(); bakeBodies(clock()); });
    if (!still()) moving();
}

/* SDO's last 48 hours at 304 Å, looped: the sun turns, its plasma rises and falls; the photograph stays until
   the first frame plays, and for anyone who asked for stillness */
function moving() {
    var v = document.createElement('video');
    v.muted = true; v.loop = true; v.playsInline = true; v.preload = 'auto';
    v.setAttribute('muted', ''); v.setAttribute('playsinline', '');
    fetch('/img/sun-motion.json').then(function (r) { return r.json(); }).then(function (meta) {
        v.addEventListener('playing', function () {
            if (!motion) motion = { v: v, light: meta.light, fps: meta.fps, since: performance.now() };
        });
        v.src = '/img/sun-motion.mp4';
        v.playbackRate = SUN.speed;
        v.defaultPlaybackRate = SUN.speed;
        var p = v.play();
        if (p && p.catch) p.catch(function () {});
    }).catch(function () {});
}

/* hold the sun's motion while the sky is paused or hidden */
export function hold(on) {
    if (!motion) return;
    if (on) motion.v.pause();
    else { var p = motion.v.play(); if (p && p.catch) p.catch(function () {}); }
}

/* everything again, for a new layout */
export function bake(jd) {
    bakeSun();
    bakeEarth(jd);
    bakeBodies(jd);
}

/* once a frame: finish the earth a slice at a time; a minute later turn it and the others again */
export function tick(jd) {
    if (earthJob) earthJob(5);
    else if (sprites.earth && (jd - earthBaked) * 86400000 > 60000) { bakeEarth(jd, true); bakeBodies(jd); }
}

function keep(id, s) {
    s.since = sprites[id] ? sprites[id].since : performance.now();
    sprites[id] = s;
}

function bakeSun() {
    if (!tex.sun || !sunR) return;
    var half = sunR / SUN_FILL, n = Math.ceil(half * 2 * dpr);
    var c = document.createElement('canvas'), x;
    c.width = n; c.height = n;
    x = c.getContext('2d');
    x.imageSmoothingQuality = 'high';
    x.drawImage(tex.sun, 0, 0, n, n);
    sunSprite = { c: c, half: half, since: sunSprite ? sunSprite.since : performance.now() };
}

/* img/planets.jpg: eight maps 512 × 256 one under another, then saturn's rings — a strip of colour, a strip of opacity */
function cutAtlas() {
    var a = texels(tex.atlas, 512, 2080), row = 512 * 256 * 4, n = 128, i, o, k;
    var c = new Float32Array(n * 3), al = new Float32Array(n);
    tex.maps = {};
    for (i = 0; i < MAPS.length; i++) tex.maps[MAPS[i]] = { w: 512, h: 256, d: a.d.subarray(i * row, (i + 1) * row) };
    for (i = 0; i < 512; i++) {
        o = (2056 * 512 + i) * 4; k = (2072 * 512 + i) * 4;
        c[(i >> 2) * 3] += a.d[o] / 4; c[(i >> 2) * 3 + 1] += a.d[o + 1] / 4; c[(i >> 2) * 3 + 2] += a.d[o + 2] / 4;
        al[i >> 2] += a.d[k] / 1020;
    }
    tex.ring = { n: n, c: c, a: al };
}

/* the earth as it hangs now, seen from the camera: the meridian under it by sidereal time,
   the axis tilted by the obliquity, day and night split by where the sun stands.
   spread: a few rows a frame, so the minute's turn never stalls the sky */
function bakeEarth(jd, spread) {
    if (!tex.day || !cam || !earthWorld || !earthR) return;
    var g = gmst(jd), see = vantage(jd, earthWorld);
    var R = earthR * dpr, half = Math.ceil(R * 1.13) + 1, S = half * 2;
    var need = TAU * R, w = need <= 512 ? 512 : need <= 1024 ? 1024 : 2048;
    if (!tex.dayPx || tex.dayPx.w !== w) tex.dayPx = texels(tex.day, w);
    if (tex.night && (!tex.nightPx || tex.nightPx.w !== Math.min(w, 1024))) tex.nightPx = texels(tex.night, Math.min(w, 1024));
    var day = tex.dayPx, night = tex.night ? tex.nightPx : null;

    var lx = see.sun[0], ly = see.sun[1], lz = see.sun[2];
    var hl = hypot3(lx, ly, lz + 1) || 1, hx = lx / hl, hy = ly / hl, hz = (lz + 1) / hl;
    var cE = Math.cos(EPS), sE = Math.sin(EPS), cG = Math.cos(g), sG = Math.sin(g);
    /* ecliptic → equatorial → turned with the earth */
    function fixed(v) {
        var e = see.ecl(v);
        var ye = e[1] * cE - e[2] * sE, ze = e[1] * sE + e[2] * cE;
        return [e[0] * cG + ye * sG, -e[0] * sG + ye * cG, ze];
    }
    var A = fixed(see.axes[0]), B = fixed(see.axes[1]), C = fixed(see.axes[2]);

    var c = document.createElement('canvas'), cx2, im, px, dc = [0, 0, 0], nc = [0, 0, 0];
    var i, j, o, nx, ny, nz, d, light, cov, air, lon, lat, k, dw, water, nh, sp, rim, r, gg, b, f, a;
    c.width = S; c.height = S;
    cx2 = c.getContext('2d');
    im = cx2.createImageData(S, S);
    px = im.data;
    j = 0;
    earthBaked = jd;
    earthJob = function (budget) {
        var t0 = performance.now();
        for (; j < S; j++) {
            if (j && (j & 7) === 0 && performance.now() - t0 > budget) return;
            row();
        }
        cx2.putImageData(im, 0, 0);
        keep('earth', { c: c, k: half / R });
        earthJob = null;
    };
    earthJob(spread ? 5 : Infinity);

    function row() {
        for (i = 0; i < S; i++) {
            nx = (i + 0.5 - half) / R; ny = (half - j - 0.5) / R;
            d = Math.sqrt(nx * nx + ny * ny);
            if (d > 1.12) continue;
            if (d > 1) { nx /= d; ny /= d; nz = 0; } else nz = Math.sqrt(1 - d * d);
            light = nx * lx + ny * ly + nz * lz;
            cov = unit((1 - d) * R + 0.5);
            /* the air: a thin blue limb on the sunlit side */
            air = d > 1 ? 1 - (d - 1) / 0.12 : 1;
            air = air * air * air * 0.5 * smooth(-0.3, 0.3, light);
            o = (j * S + i) * 4;
            if (cov <= 0) {
                px[o] = 96; px[o + 1] = 168; px[o + 2] = 255; px[o + 3] = air * 255;
                continue;
            }
            lon = Math.atan2(A[1] * nx + B[1] * ny + C[1] * nz, A[0] * nx + B[0] * ny + C[0] * nz);
            lat = Math.asin(Math.max(-1, Math.min(1, A[2] * nx + B[2] * ny + C[2] * nz)));
            texel(day, lon, lat, dc);
            k = Math.pow(unit(light * 1.1 + 0.08), 0.75) * 1.2;
            dw = smooth(-0.14, 0.2, light);
            water = unit((dc[2] - Math.max(dc[0], dc[1])) / 40);
            nh = nx * hx + ny * hy + nz * hz;
            sp = nh > 0 ? Math.pow(nh, 60) * water * 0.5 : 0;
            rim = Math.pow(1 - nz, 2.6) * dw;
            /* the map, the haze of the air over it, the glint of the sun on water, the blue limb */
            r = (dc[0] + 14) * k + 255 * sp + 70 * rim;
            gg = (dc[1] + 30) * k + 235 * sp + 130 * rim;
            b = (dc[2] + 62) * k + 200 * sp + 255 * rim;
            if (night && dw < 1) {
                /* the dark side: the land faint under the stars, the cities burning */
                texel(night, lon, lat, nc);
                f = 1 - dw;
                a = unit((nc[0] - 24) / 200) * 1.3;
                r += (nc[0] * 0.6 + 255 * a) * f;
                gg += (nc[1] * 0.6 + 206 * a) * f;
                b += (nc[2] * 0.6 + 140 * a) * f;
            }
            a = cov + air * (1 - cov);
            px[o] = (r * cov + 96 * air * (1 - cov)) / a;
            px[o + 1] = (gg * cov + 168 * air * (1 - cov)) / a;
            px[o + 2] = (b * cov + 255 * air * (1 - cov)) / a;
            px[o + 3] = a * 255;
        }
    }
}

/* the moon and the planets as they hang now, each lit by the sun from where it stands */
function bakeBodies(jd) {
    if (!tex.maps || !cam || !earthWorld || !earthR) return;
    var T = centuries(jd), e = planetEcl('earth', T), earthAu = hypot3(e.x, e.y, e.z);
    var see = vantage(jd, earthWorld), i, p, ecl, w, q;
    keep('moon', bakeBall(tex.maps.moon, moonRadius() * dpr, see, framed(moonAxes(jd), see), true, null));
    for (i = 0; i < PLANETS.length; i++) {
        p = PLANETS[i];
        if (!p.pole) continue;
        ecl = planetEcl(p.id, T);
        w = toWorld(ecl.x, ecl.y, ecl.z, earthAu);
        q = project(w);
        if (!q) continue;
        see = vantage(jd, w);
        keep(p.id, bakeBall(tex.maps[p.id], bodyRadius(p, q) * dpr, see, spin(p.pole, jd, see), p.id === 'mercury', p.rings ? tex.ring : null));
    }
}

/* every body on the screen, farthest first; the moon set beside the earth on the side it truly stands */
export function placeBodies(jd) {
    var T = centuries(jd), e = planetEcl('earth', T);
    var earthAu = hypot3(e.x, e.y, e.z);
    var i, p, ecl, w, q, r, moon, me, mw, mq, dx, dy, len, behind;
    var list = [{ z: cam.earthZ * 0.92, sun: true }];
    for (i = 0; i < PLANETS.length; i++) {
        p = PLANETS[i];
        ecl = planetEcl(p.id, T);
        w = toWorld(ecl.x, ecl.y, ecl.z, earthAu);
        q = project(w);
        if (!q) continue;
        r = bodyRadius(p, q);
        moon = null;
        if (p.id === 'earth') {
            me = moonEcl(jd);
            mw = toWorld(e.x + me.x, e.y + me.y, e.z + me.z, earthAu);
            mq = project(mw);
            if (mq) {
                dx = mq.x - q.x; dy = mq.y - q.y;
                len = Math.sqrt(dx * dx + dy * dy) || 1;
                behind = mq.z > q.z;
                moon = {
                    x: q.x + dx / len * r * 1.78,
                    y: q.y + dy / len * r * 0.62,
                    behind: behind
                };
            }
        }
        list.push({ z: q.z, p: p, x: q.x, y: q.y, r: r, moon: moon });
    }
    list.sort(function (a, b) { return b.z - a.z; });
    return list;
}

/* the sun's light spread far behind the orbits */
export function drawHaze(ctx) {
    var i, h;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < SUN.haze.length; i++) {
        h = SUN.haze[i];
        glowDisc(ctx, sx, sy, sunR * h[0], h[1], h[2]);
    }
    ctx.restore();
}

export function drawSun(ctx, t) {
    var x = sx, y = sy, r = sunR, i, h, m = motion && !still() && motion.v.readyState >= 2 ? motion : null, f;
    /* the corona breathes with the disc's recorded light: brighter when SDO saw it brighter */
    var pulse = 1;
    if (m) {
        f = Math.floor(m.v.currentTime * m.fps) % m.light.length;
        pulse = 1 + SUN.flicker * (m.light[f] - 1);
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < SUN.corona.length; i++) {
        h = SUN.corona[i];
        glowDisc(ctx, x, y, r * h[0] * pulse, h[1], h[2]);
    }
    ctx.restore();
    var k = sunSprite ? shown(sunSprite) : 0, core;
    if (k < 1) {
        /* until the photograph arrives: a plain hot disc */
        core = ctx.createRadialGradient(x, y, r * 0.05, x, y, r);
        core.addColorStop(0, '#ffc501');
        core.addColorStop(0.8, '#ff6501');
        core.addColorStop(1, '#e23400');
        ctx.fillStyle = core;
        ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    if (k > 0) {
        h = sunSprite.half;
        ctx.save();
        ctx.globalAlpha = k;
        /* the disc is the photograph alone; the glow joins it at the limb */
        core = ctx.createRadialGradient(x, y, r * 0.88, x, y, r * 1.01);
        core.addColorStop(0, 'rgba(0,0,0,1)');
        core.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = core;
        ctx.beginPath(); ctx.arc(x, y, r * 1.01, 0, TAU); ctx.fill();
        ctx.globalCompositeOperation = 'lighter';
        var km = m ? shown(m) : 0;
        if (km < 1) { ctx.globalAlpha = k * (1 - km); ctx.drawImage(sunSprite.c, x - h, y - h, 2 * h, 2 * h); }
        if (km > 0) { ctx.globalAlpha = k * km; ctx.drawImage(m.v, x - h, y - h, 2 * h, 2 * h); }
        ctx.restore();
    }
}

export function drawPlanet(ctx, p, x, y, r, moon) {
    try {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        glowDisc(ctx, x, y, r * p.glow[2], p.glow[0], p.glow[1]);
        ctx.globalCompositeOperation = 'source-over';
        if (moon && moon.behind) stamp(ctx, sprites.moon, moon.x, moon.y, moonRadius(), MOON);
        stamp(ctx, sprites[p.id], x, y, r, p.c);
        if (moon && !moon.behind) stamp(ctx, sprites.moon, moon.x, moon.y, moonRadius(), MOON);
        ctx.restore();
    } catch (err) { try { ctx.restore(); } catch (e) {} }
}
