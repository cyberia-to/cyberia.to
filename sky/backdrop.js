/* what lies behind the bodies, painted once per layout: the stars and the milky way, the orbits as light,
   the asteroid belt; and the meteors that cross it now and then */
import { TAU, DEG, planetEcl, eqToEclDir, galToEq } from './astro.js';
import { STARS } from './facts.js';
import { PLANETS, ORBIT, STAR } from './look.js';
import { rng, still, hexRGB, kelvinRGB } from './draw.js';
import { W, H, dpr, cam, worldAng, toWorld, project, projectSky } from './scene.js';

var rocks = [], meteors = [], starField = [], skyLayer = null, glows = {}, rings = [], lightLayer = null;

/* all of it again, for a new layout */
export function bakeBackdrop(T, earthAu) {
    lightRings(T, earthAu);
    seedBelt(T, earthAu);
    bakeStars();
}

/* a star as a lens sees it: a hot white point, its colour in the light around it, the light thinning
   into the dark the way it does in a photograph — a Moffat core with a faint wide halo, no edge anywhere */
function starGlow(k100) {
    var key = kelvinRGB(k100, 1), c = glows[key], x, im, d, rgb, N = 128, R = N / 2, i, j, o, r, I, w, a;
    if (c) return c;
    rgb = key.match(/\d+/g).map(Number);
    c = document.createElement('canvas');
    c.width = N; c.height = N;
    x = c.getContext('2d');
    im = x.createImageData(N, N);
    d = im.data;
    for (j = 0; j < N; j++) {
        for (i = 0; i < N; i++) {
            r = Math.sqrt((i + 0.5 - R) * (i + 0.5 - R) + (j + 0.5 - R) * (j + 0.5 - R)) / R;
            if (r >= 1) continue;
            I = Math.pow(1 + (r / STAR.core) * (r / STAR.core), -STAR.fall) + STAR.halo[0] * Math.exp(-(r / STAR.halo[1]) * (r / STAR.halo[1]));
            I *= (1 - r * r) * (1 - r * r);
            a = I > 1 ? 1 : I;
            w = Math.min(1, I * STAR.white[0]); w = w * w * STAR.white[1];
            o = (j * N + i) * 4;
            d[o] = rgb[0] + (255 - rgb[0]) * w;
            d[o + 1] = rgb[1] + (255 - rgb[1]) * w;
            d[o + 2] = rgb[2] + (255 - rgb[2]) * w;
            d[o + 3] = a * 255;
        }
    }
    x.putImageData(im, 0, 0);
    glows[key] = c;
    return c;
}

/* the sky behind everything, painted once: the milky way as one soft band of light, and the faint crowd
   of stars, each a small glow. the catalogue stars stay apart — each breathes at its own pace */
function bakeStars() {
    var i, p, mag, a, eq, l, b, u, z, rxy, g, warm, h, k;
    var cA = Math.cos(worldAng), sA = Math.sin(worldAng);
    function worldDir(ecl) {
        return [ecl[0] * cA + ecl[1] * sA, -ecl[0] * sA + ecl[1] * cA, ecl[2]];
    }
    var c = skyLayer || document.createElement('canvas'), x;
    c.width = Math.floor(W * dpr); c.height = Math.floor(H * dpr);
    x = c.getContext('2d');
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.globalCompositeOperation = 'source-over';
    x.fillStyle = '#000';
    x.fillRect(0, 0, W, H);
    x.globalCompositeOperation = 'lighter';

    /* the band: puffs of light along the galactic plane on a quarter-size canvas, blurred into one haze */
    var band = document.createElement('canvas'), bx, Q = 4, rnd = rng(7);
    band.width = Math.ceil(W / Q); band.height = Math.ceil(H / Q);
    bx = band.getContext('2d');
    bx.globalCompositeOperation = 'lighter';
    for (i = 0; i < 1400; i++) {
        l = rnd() * TAU;
        b = (rnd() + rnd() + rnd() - 1.5) * 0.11;
        eq = galToEq(l, b);
        p = projectSky(worldDir(eqToEclDir(eq[0] / DEG, eq[1] / DEG)));
        if (!p) continue;
        h = (4 + rnd() * 9) / Q; a = 0.025 + rnd() * 0.04; warm = rnd() > 0.55 ? '255,228,196,' : '196,208,255,';
        g = bx.createRadialGradient(p.x / Q, p.y / Q, 0, p.x / Q, p.y / Q, h);
        g.addColorStop(0, 'rgba(' + warm + a.toFixed(3) + ')');
        g.addColorStop(1, 'rgba(' + warm + '0)');
        bx.fillStyle = g;
        bx.beginPath(); bx.arc(p.x / Q, p.y / Q, h, 0, TAU); bx.fill();
    }
    if (typeof x.filter === 'string') x.filter = 'blur(' + (6 * dpr) + 'px)';
    x.drawImage(band, 0, 0, W, H);
    x.filter = 'none';

    /* the faint crowd: small glows, too dim to breathe */
    var rnd2 = rng(13), f = 0.64 * H;
    for (i = 0; i < 1400; i++) {
        z = 0.2 + rnd2() * 0.8;
        rxy = Math.sqrt(Math.max(0, 1 - z * z));
        u = rnd2() * TAU;
        p = {
            x: W * 0.5 + f * (rxy * Math.cos(u)) / z,
            y: H * 0.5 - f * (rxy * Math.sin(u)) / z
        };
        k = 48 + (rnd2() * 42 | 0); a = 0.22 + rnd2() * 0.3; h = 3 + rnd2() * 2.2;
        if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20) continue;
        x.globalAlpha = a;
        x.drawImage(starGlow(k), p.x - h, p.y - h, 2 * h, 2 * h);
    }
    x.globalAlpha = 1;
    skyLayer = c;

    starField = [];
    var rnd3 = rng(53);
    for (i = 0; i < STARS.length; i += 4) {
        p = projectSky(worldDir(eqToEclDir(STARS[i], STARS[i + 1])));
        if (!p) continue;
        mag = STARS[i + 2];
        starField.push({
            x: p.x, y: p.y, a: mag < 0 ? 1 : mag < 1.5 ? 0.95 : mag < 2.5 ? 0.85 : mag < 3.4 ? 0.7 : 0.55,
            h: 7 + (4.3 - mag) * 4.6, glow: starGlow(STARS[i + 3]),
            f1: 0.5 + rnd3() * 1.5, f2: 2.2 + rnd3() * 3.2, ph: rnd3() * TAU
        });
    }
}

/* a belt between mars and jupiter: 2.2–3.2 au, at random places on it */
function seedBelt(T, earthAu) {
    var rnd = rng(99), i, au, th, inc;
    rocks = [];
    for (i = 0; i < 140; i++) {
        planetEcl('mars', T, rnd() * 360);
        au = 2.2 + rnd() * 1.1;
        th = rnd() * TAU; inc = (rnd() - 0.5) * 0.18;
        rocks.push({ w: toWorld(au * Math.cos(th), au * Math.sin(th), au * inc, earthAu), r: 0.45 + rnd() * 1.1, c: rnd() > 0.5 ? '#d0c0a8' : '#8a7a68' });
    }
    meteors = [];
}

/* an orbit as a ring of light: its points on the screen, and where its planet stands on it, in points */
function lightRings(T, earthAu) {
    var i, j, p, ecl, pts;
    rings = [];
    for (i = 0; i < PLANETS.length; i++) {
        p = PLANETS[i]; pts = [];
        for (j = 0; j < 240; j++) {
            ecl = planetEcl(p.id, T, -180 + 360 * j / 240);
            pts.push(project(toWorld(ecl.x, ecl.y, ecl.z, earthAu)));
        }
        rings.push({ pts: pts, rgb: hexRGB(p.light), at: (planetEcl(p.id, T).M + 180) / 360 * 240 });
    }
    bakeLight();
}

/* the orbits, painted once and blurred into light: each is brightest at its planet and fades along the way it has come */
function bakeLight() {
    var line = document.createElement('canvas'), c, x, i, j, k, g, n, a, b, e, blur, pass;
    line.width = Math.floor(W * dpr); line.height = Math.floor(H * dpr);
    x = line.getContext('2d');
    blur = typeof x.filter === 'string';
    pass = blur ? [ORBIT.line] : ORBIT.wide;
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.globalCompositeOperation = 'lighter';
    for (i = 0; i < rings.length; i++) {
        g = rings[i]; n = g.pts.length;
        for (k = 0; k < pass.length; k++) {
            x.lineWidth = pass[k][0];
            for (j = 0; j < n; j++) {
                a = g.pts[j]; b = g.pts[(j + 1) % n];
                if (!a || !b) continue;
                e = ORBIT.floor + (1 - ORBIT.floor) * Math.exp(-(((g.at - j) % n + n) % n) / n / ORBIT.trail);
                x.strokeStyle = 'rgba(' + g.rgb[0] + ',' + g.rgb[1] + ',' + g.rgb[2] + ',' + (pass[k][1] * e).toFixed(4) + ')';
                x.beginPath(); x.moveTo(a.x, a.y); x.lineTo(b.x, b.y); x.stroke();
            }
        }
    }
    if (!blur) { lightLayer = line; return; }
    c = lightLayer || document.createElement('canvas');
    c.width = line.width; c.height = line.height;
    x = c.getContext('2d');
    x.globalCompositeOperation = 'lighter';
    for (k = 0; k < ORBIT.veils.length; k++) {
        x.filter = 'blur(' + (ORBIT.veils[k][0] * dpr) + 'px)';
        x.globalAlpha = ORBIT.veils[k][1];
        x.drawImage(line, 0, 0);
    }
    lightLayer = c;
}

export function drawStarfield(ctx, t) {
    var live = !still(), i, s, a;
    if (skyLayer) ctx.drawImage(skyLayer, 0, 0, W, H);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < starField.length; i++) {
        s = starField[i];
        a = live ? s.a * (1 + STAR.twinkle * (0.6 * Math.sin(t * s.f1 + s.ph) + 0.4 * Math.sin(t * s.f2 + s.ph * 2.7))) : s.a;
        ctx.globalAlpha = a > 1 ? 1 : a;
        ctx.drawImage(s.glow, s.x - s.h, s.y - s.h, 2 * s.h, 2 * s.h);
    }
    ctx.restore();
}

export function drawLight(ctx) {
    if (!lightLayer) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.drawImage(lightLayer, 0, 0, W, H);
    ctx.restore();
}

export function drawRocks(ctx) {
    var i, p, q;
    for (i = 0; i < rocks.length; i++) {
        p = rocks[i];
        q = project(p.w);
        if (!q) continue;
        ctx.fillStyle = p.c;
        ctx.globalAlpha = 0.45 + 0.35 * Math.max(0, Math.min(1, 1.2 - q.z / (cam.earthZ * 2)));
        ctx.fillRect(q.x, q.y, p.r, p.r);
    }
    ctx.globalAlpha = 1;
}

export function drawMeteors(ctx, dt) {
    if (!still() && Math.random() < 0.014 && meteors.length < 2) {
        meteors.push({
            x: W * (0.2 + Math.random() * 0.7),
            y: H * Math.random() * 0.42,
            vx: 440 + Math.random() * 380,
            vy: 170 + Math.random() * 180,
            life: 0.55 + Math.random() * 0.25
        });
    }
    var i, m, a;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (i = meteors.length - 1; i >= 0; i--) {
        m = meteors[i];
        m.x += m.vx * dt; m.y += m.vy * dt; m.life -= dt;
        if (m.life <= 0 || m.x > W + 40 || m.y > H + 40) { meteors.splice(i, 1); continue; }
        a = Math.max(0, m.life * 1.6);
        ctx.strokeStyle = 'rgba(255,255,255,' + a + ')';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(m.x - m.vx * 0.08, m.y - m.vy * 0.08);
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,240,200,' + a + ')';
        ctx.beginPath(); ctx.arc(m.x, m.y, 1.5, 0, TAU); ctx.fill();
    }
    ctx.restore();
}
