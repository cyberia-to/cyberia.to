/* the 2d primitives every layer of the sky paints with */
import { TAU } from './astro.js';

export function still() { return matchMedia('(prefers-reduced-motion: reduce)').matches; }

export function rng(seed) {
    var s = seed % 2147483647; if (s <= 0) s += 2147483646;
    return function () { s = s * 16807 % 2147483647; return (s - 1) / 2147483646; };
}

export function unit(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
export function smooth(a, b, x) {
    var t = unit((x - a) / (b - a));
    return t * t * (3 - 2 * t);
}

export function rgba(h, a) {
    return 'rgba(' + parseInt(h.slice(1, 3), 16) + ',' + parseInt(h.slice(3, 5), 16) + ',' + parseInt(h.slice(5, 7), 16) + ',' + a + ')';
}
export function hexRGB(h) {
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

/* the colour of a star's light by its temperature / 100 K */
export function kelvinRGB(k100, a) {
    var k = k100 * 100;
    var r, g, b;
    if (k >= 10000) { r = 180; g = 210; b = 255; }
    else if (k >= 8000) { r = 210; g = 225; b = 255; }
    else if (k >= 6500) { r = 235; g = 238; b = 255; }
    else if (k >= 5500) { r = 255; g = 244; b = 230; }
    else if (k >= 4500) { r = 255; g = 214; b = 170; }
    else if (k >= 3500) { r = 255; g = 180; b = 120; }
    else { r = 255; g = 150; b = 90; }
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
}

export function glowDisc(ctx, x, y, r, color, a) {
    var g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(color, a));
    g.addColorStop(1, rgba(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}

/* a plain lit sphere: the stand-in for a body whose map has not arrived */
export function litSphere(ctx, x, y, r, c0, c1, c2) {
    var g = ctx.createRadialGradient(x - r * 0.42, y - r * 0.28, r * 0.08, x + r * 0.2, y, r * 1.05);
    g.addColorStop(0, c0);
    g.addColorStop(0.42, c1);
    g.addColorStop(1, c2);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
}
