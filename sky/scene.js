/* geometry of this screen: where the sun and the earth sit, how distances are pressed to fit, the camera.
   the state below is written here only — by size() and orient() — and read live by every other module. */
import { DEG, hypot3, norm3, cross, dot3, centuries, planetEcl, precession } from './astro.js';

export var W = 0, H = 0, dpr = 1;            /* the canvas in css px, and device px per css px */
export var sx = 0, sy = 0, sunR = 0;         /* the sun on the screen */
export var earthA = 0, earthR = 0;           /* the earth's orbit in world units, the earth's radius in css px */
export var cam = null, worldAng = 0, earthWorld = null;

/* the composition: the sun pressed to the left edge, the earth near the right, both sized by the viewport */
export function size(cssW, cssH, ratio) {
    W = cssW; H = cssH; dpr = ratio;
    sunR = Math.min(W, H) * 0.148;
    sx = Math.max(sunR * 0.46, Math.min(W * 0.09, sunR * 0.72));
    sy = H * 0.50;
    var wrap = Math.min(780, W);
    var gutter = Math.max(140, (W - wrap) / 2);
    earthR = Math.max(30, Math.min(W, H) * 0.052, gutter * 0.145);
    var targetX = sx + (W - sx - earthR * 2.4) * 0.84;
    earthA = Math.max(220, targetX - sx);
}

/* the world turned so the earth stands on the +x axis; the camera aimed between the sun and the earth */
export function orient(jd) {
    var T = centuries(jd), e = planetEcl('earth', T), earthAu = hypot3(e.x, e.y, e.z);
    worldAng = Math.atan2(e.y, e.x);
    earthWorld = toWorld(e.x, e.y, e.z, earthAu);
    buildCamera(earthWorld);
    return { T: T, earthAu: earthAu, earth: e };
}

/* distances inside the earth's orbit stay true; outside they are pressed logarithmically, so neptune fits */
export function visRatio(au, earthAu) {
    var u = au / Math.max(0.2, earthAu);
    if (u <= 1) return Math.max(0.22, u);
    var t = (Math.log(u) - Math.log(1)) / (Math.log(31) - Math.log(1));
    return 1 + 0.2 * Math.max(0, Math.min(1, t));
}

export function toWorld(x, y, z, earthAu) {
    var c = Math.cos(worldAng), s = Math.sin(worldAng);
    var xr = x * c + y * s, yr = -x * s + y * c;
    var r = hypot3(xr, yr, z), v = visRatio(r, earthAu) * earthA / Math.max(1e-6, r);
    return [xr * v, yr * v, z * v];
}

function buildCamera(eW) {
    var dist = earthA * 2.35, elev = 28 * DEG;
    var cx = earthA * 0.42, cy = -dist * Math.cos(elev), cz = dist * Math.sin(elev);
    var lx = earthA * 0.42, ly = 0, lz = 0;
    var fwd = norm3(lx - cx, ly - cy, lz - cz);
    var cr = cross(fwd, [0, 0, 1]);
    var right = norm3(cr[0], cr[1], cr[2]);
    var up = cross(right, fwd);
    function raw(p) {
        var vx = p[0] - cx, vy = p[1] - cy, vz = p[2] - cz;
        var x = vx * right[0] + vy * right[1] + vz * right[2];
        var y = vx * up[0] + vy * up[1] + vz * up[2];
        var z = vx * fwd[0] + vy * fwd[1] + vz * fwd[2];
        return { xn: x / z, yn: y / z, z: z, x: x, y: y };
    }
    var s = raw([0, 0, 0]), e = raw(eW);
    var span = e.xn - s.xn;
    cam = {
        cx: cx, cy: cy, cz: cz,
        fwd: fwd, right: right, up: up,
        s: s, k: (Math.abs(span) < 1e-6 ? earthA : earthA / span),
        earthZ: e.z
    };
}

/* a point of the world → the screen: the sun pinned at (sx, sy), the earth at its place */
export function project(p) {
    if (!cam) return null;
    var vx = p[0] - cam.cx, vy = p[1] - cam.cy, vz = p[2] - cam.cz;
    var x = vx * cam.right[0] + vy * cam.right[1] + vz * cam.right[2];
    var y = vx * cam.up[0] + vy * cam.up[1] + vz * cam.up[2];
    var z = vx * cam.fwd[0] + vy * cam.fwd[1] + vz * cam.fwd[2];
    if (z < 12) return null;
    return {
        x: sx + cam.k * (x / z - cam.s.xn),
        y: sy - cam.k * (y / z - cam.s.yn),
        z: z,
        scale: cam.earthZ / z
    };
}

/* same camera basis as the orrery, wider sky so the galactic plane fills the canvas */
export function projectSky(dir) {
    if (!cam) return null;
    var x = dir[0] * cam.right[0] + dir[1] * cam.right[1] + dir[2] * cam.right[2];
    var y = dir[0] * cam.up[0] + dir[1] * cam.up[1] + dir[2] * cam.up[2];
    var z = dir[0] * cam.fwd[0] + dir[1] * cam.fwd[1] + dir[2] * cam.fwd[2];
    if (z < 0.12) return null;
    var f = 0.64 * H;
    var px = W * 0.5 + f * x / z;
    var py = H * 0.5 - f * y / z;
    if (px < -60 || px > W + 60 || py < -60 || py > H + 60) return null;
    return { x: px, y: py, z: z };
}

/* how a body standing at a point of the world is seen: right, up and toward the camera, the sun among them,
   and the turn from the world to the ecliptic of date — the equinox has precessed since J2000 */
export function vantage(jd, at) {
    var toCam = norm3(cam.cx - at[0], cam.cy - at[1], cam.cz - at[2]);
    var rt = cross(cam.up, toCam); rt = norm3(rt[0], rt[1], rt[2]);
    var up = cross(toCam, rt);
    var sun = norm3(-at[0], -at[1], -at[2]);
    var ang = worldAng + precession(jd);
    var c = Math.cos(ang), s = Math.sin(ang);
    return {
        axes: [rt, up, toCam],
        sun: [dot3(sun, rt), dot3(sun, up), dot3(sun, toCam)],
        ecl: function (v) { return [v[0] * c - v[1] * s, v[0] * s + v[1] * c, v[2]]; }
    };
}

export function moonRadius() { return Math.max(2.6, earthR * 0.24); }

/* a body's radius on the screen: its size from the look, nearer is larger, never vanishing */
export function bodyRadius(p, q) {
    var scale = Math.max(0.55, Math.min(1.45, q.scale));
    return p.id === 'earth' ? Math.max(earthR * scale, 26) : Math.max(p.r * Math.min(W, H) / 860 * scale, 2.4);
}
