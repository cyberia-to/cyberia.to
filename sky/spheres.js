/* the machinery of a map on a lit ball: sampling a map, baking a ball as the camera sees it, fading it in */
import { TAU, hypot3, dot3, bodyAxes } from './astro.js';
import { unit, smooth, still, litSphere } from './draw.js';

/* an image as pixels, w wide; an equirectangular map unless h says otherwise */
export function texels(img, w, h) {
    var c = document.createElement('canvas'), x;
    h = h || w / 2;
    c.width = w; c.height = h;
    x = c.getContext('2d', { willReadFrequently: true });
    x.imageSmoothingQuality = 'high';
    x.drawImage(img, 0, 0, w, h);
    return { w: w, h: h, d: x.getImageData(0, 0, w, h).data };
}

/* the colour of a map at a longitude and latitude, rad, bilinear, into out */
export function texel(t, lon, lat, out) {
    var fx = (lon / TAU + 0.5) * t.w - 0.5, fy = (0.5 - lat / Math.PI) * t.h - 0.5;
    var x0 = Math.floor(fx), y0 = Math.floor(fy), ax = fx - x0, ay = fy - y0;
    var x1 = (x0 + 1 + t.w) % t.w, y1 = Math.min(t.h - 1, y0 + 1), k;
    x0 = (x0 + t.w) % t.w; y0 = Math.max(0, y0);
    var p = (y0 * t.w + x0) * 4, q = (y0 * t.w + x1) * 4, r = (y1 * t.w + x0) * 4, s = (y1 * t.w + x1) * 4, d = t.d;
    for (k = 0; k < 3; k++) {
        out[k] = (d[p + k] * (1 - ax) + d[q + k] * ax) * (1 - ay) + (d[r + k] * (1 - ax) + d[s + k] * ax) * ay;
    }
}

/* saturn's rings at a distance in saturn radii: opacity, and into out the colour already weighed by it.
   ring: { n, c, a } — the strip of the atlas, from 1.17 to 2.355 radii */
export function ringAt(ring, rr, out) {
    var g = ring, f = (rr - 1.1695) / 1.1855 * (g.n - 1), i = Math.floor(f);
    if (i < 0 || i >= g.n - 1) return 0;
    f -= i;
    out[0] = g.c[i * 3] * (1 - f) + g.c[i * 3 + 3] * f;
    out[1] = g.c[i * 3 + 1] * (1 - f) + g.c[i * 3 + 4] * f;
    out[2] = g.c[i * 3 + 2] * (1 - f) + g.c[i * 3 + 5] * f;
    return g.a[i] * (1 - f) + g.a[i + 1] * f;
}

/* a ball wrapped in its map, seen from the camera and lit by the sun. R: radius in device px;
   fixed: the camera's frame → the ball's own. flat: airless dust scatters evenly, the limb as bright as the middle;
   under air the limb darkens. ring: saturn's, in the plane of its equator, with both shadows */
export function bakeBall(map, R, see, fixed, flat, ring) {
    var half = Math.ceil(R * (ring ? 2.4 : 1)) + 1, S = half * 2;
    var A = fixed(see.axes[0]), B = fixed(see.axes[1]), C = fixed(see.axes[2]);
    var lx = see.sun[0], ly = see.sun[1], lz = see.sun[2];
    /* the pole in the camera's frame, and the height of the sun over the plane of the rings */
    var n0 = A[2], n1 = B[2], n2 = C[2], den = lx * n0 + ly * n1 + lz * n2;
    var c = document.createElement('canvas'), cx2, im, px, mc = [0, 0, 0], rc = [0, 0, 0];
    var i, j, o, x, y, nx, ny, nz, d, cov, light, k, t, zp, rr, ra, r, g, b, a, lit, keepBall, keepRing;
    c.width = S; c.height = S;
    cx2 = c.getContext('2d');
    im = cx2.createImageData(S, S);
    px = im.data;
    for (j = 0; j < S; j++) {
        for (i = 0; i < S; i++) {
            x = (i + 0.5 - half) / R; y = (half - j - 0.5) / R;
            d = Math.sqrt(x * x + y * y);
            cov = unit((1 - d) * R + 0.5);
            r = g = b = 0; nz = 0;
            if (cov > 0) {
                nx = x; ny = y;
                if (d > 1) { nx /= d; ny /= d; } else nz = Math.sqrt(1 - d * d);
                light = nx * lx + ny * ly + nz * lz;
                texel(map,
                    Math.atan2(A[1] * nx + B[1] * ny + C[1] * nz, A[0] * nx + B[0] * ny + C[0] * nz),
                    Math.asin(Math.max(-1, Math.min(1, A[2] * nx + B[2] * ny + C[2] * nz))), mc);
                if (flat) k = light > 0 ? Math.min(1.25, 2.2 * light / (light + nz + 0.02)) * smooth(0, 0.12, light) * 1.15 : 0;
                else k = Math.pow(unit((light + 0.16) / 1.16), 0.9) * (0.6 + 0.4 * Math.sqrt(nz));
                if (ring && den !== 0) {
                    /* the rings' shadow on the globe: toward the sun, where the ray crosses their plane */
                    t = -(nx * n0 + ny * n1 + nz * n2) / den;
                    if (t > 0) k *= 1 - 0.8 * ringAt(ring, hypot3(nx + t * lx, ny + t * ly, nz + t * lz), rc);
                }
                k += flat ? 0.05 : 0.1;
                r = mc[0] * k * cov; g = mc[1] * k * cov; b = mc[2] * k * cov;
            }
            a = cov;
            if (ring && Math.abs(n2) > 0.03) {
                zp = -(x * n0 + y * n1) / n2;
                rr = hypot3(x, y, zp);
                ra = ringAt(ring, rr, rc);
                if (ra > 0) {
                    /* the globe's shadow on the rings; their unlit face glows dimly through */
                    t = x * lx + y * ly + zp * lz;
                    lit = t < 0 && rr * rr - t * t < 1 ? 0.06 : den * n2 > 0 ? 2.2 : 1.2;
                    /* the nearer of the two covers the other */
                    keepBall = cov <= 0 || zp > nz ? 1 - ra : 1;
                    keepRing = cov <= 0 || zp > nz ? 1 : 1 - cov;
                    r = r * keepBall + rc[0] * lit * keepRing;
                    g = g * keepBall + rc[1] * lit * keepRing;
                    b = b * keepBall + rc[2] * lit * keepRing;
                    a = cov * keepBall + ra * keepRing;
                }
            }
            if (a <= 0) continue;
            o = (j * S + i) * 4;
            px[o] = r / a; px[o + 1] = g / a; px[o + 2] = b / a; px[o + 3] = a * 255;
        }
    }
    cx2.putImageData(im, 0, 0);
    return { c: c, k: half / R };
}

/* the camera's frame → a body's own, given its axes on the J2000 ecliptic */
export function framed(axes, see) {
    var X = axes.X, Y = axes.Y, Z = axes.Z;
    return function (v) {
        var u = see.ecl(v);
        return [dot3(u, X), dot3(u, Y), dot3(u, Z)];
    };
}

/* the camera's frame → a planet's own: its pole, and its prime meridian turned W from where its equator rises through ours */
export function spin(pole, jd, see) { return framed(bodyAxes(pole, jd), see); }

/* a sprite fades in over the stand-in drawn while its photograph loads */
export function shown(sprite) {
    return still() ? 1 : unit((performance.now() - sprite.since) / 700);
}

/* a baked body, fading in over the plain sphere that stands in for it while its map loads */
export function stamp(ctx, s, x, y, r, c) {
    var k = s ? shown(s) : 0, h;
    if (k < 1) litSphere(ctx, x, y, r, c[0], c[1], c[2]);
    if (k > 0) {
        h = s.k * r;
        ctx.globalAlpha = k;
        ctx.drawImage(s.c, x - h, y - h, 2 * h, 2 * h);
        ctx.globalAlpha = 1;
    }
}
