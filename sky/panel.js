/* the panel beside a body up close: the body's own numbers, and for a chosen plot its facts and its ground.
   only what is computed is shown: the registry of owners is not connected yet, so its line holds a dash */
import { grid, area, where, solidAngle } from './plots.js';
import { texels, texel } from './spheres.js';

var NB = ' '; /* a narrow space between thousands */

function groups(x) { return Math.round(x).toString().replace(/\B(?=(\d{3})+(?!\d))/g, NB); }
function deg(v, pos, neg) { return Math.abs(v).toFixed(2) + '°' + NB + (v >= 0 ? pos : neg); }
function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
}
function row(dl, k, v) { dl.appendChild(el('dt', null, k)); var d = el('dd', null, v); dl.appendChild(d); return d; }
function norm(v) { var n = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / n, v[1] / n, v[2] / n]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

/* body: { name, radiusKm, map } — choose(k) is called when a neighbour is picked here */
export function createPanel(root, body, choose) {
    var g = grid(), px = null;
    var sphere = 4 * Math.PI * body.radiusKm * body.radiusKm;

    function head() {
        root.textContent = '';
        root.appendChild(el('div', 'orb-kicker', 'plots of'));
        root.appendChild(el('h2', 'orb-name', body.name));
        var dl = el('dl', 'orb-facts');
        row(dl, 'radius', groups(body.radiusKm) + NB + 'km');
        row(dl, 'surface', groups(sphere) + NB + 'km²');
        row(dl, 'plots', groups(g.n) + ' — ' + groups(g.n - 12) + ' hexagons, 12 pentagons');
        row(dl, 'a plot', '≈' + NB + groups(sphere / g.n) + NB + 'km²');
        root.appendChild(dl);
    }

    /* the ground of a plot from the map, seen straight down, its border and its neighbours' drawn over it */
    function ground(k) {
        var N = 264, c = el('canvas', 'orb-ground'), x = c.getContext('2d'), cell = g.cells[k], ctr = cell.c;
        var ratio = Math.min(2, window.devicePixelRatio || 1), S = Math.round(N * ratio);
        c.width = S; c.height = S;
        if (!px) px = texels(body.map, body.map.naturalWidth >= 2048 ? 2048 : body.map.naturalWidth);
        var e1 = norm(Math.abs(ctr[2]) < 0.999 ? cross([0, 0, 1], ctr) : [1, 0, 0]), e2 = cross(ctr, e1);
        var reach = 0, i, j, o, u, v, p, out = [0, 0, 0];
        for (i = 0; i < cell.ring.length; i++) reach = Math.max(reach, Math.acos(Math.min(1, dot(cell.ring[i], ctr))));
        var t = Math.tan(reach * 2.4), im = x.createImageData(S, S), d = im.data;
        for (j = 0; j < S; j++) {
            for (i = 0; i < S; i++) {
                u = ((i + 0.5) / S * 2 - 1) * t; v = (1 - (j + 0.5) / S * 2) * t;
                p = norm([ctr[0] + u * e1[0] + v * e2[0], ctr[1] + u * e1[1] + v * e2[1], ctr[2] + u * e1[2] + v * e2[2]]);
                texel(px, Math.atan2(p[1], p[0]), Math.asin(Math.max(-1, Math.min(1, p[2]))), out);
                o = (j * S + i) * 4;
                d[o] = out[0]; d[o + 1] = out[1]; d[o + 2] = out[2]; d[o + 3] = 255;
            }
        }
        x.putImageData(im, 0, 0);
        function outline(cl, colour, width) {
            x.beginPath();
            for (var q = 0; q < cl.ring.length; q++) {
                var r = cl.ring[q], w = dot(r, ctr), sx = (dot(r, e1) / w / t + 1) / 2 * S, sy = (1 - dot(r, e2) / w / t) / 2 * S;
                if (q) x.lineTo(sx, sy); else x.moveTo(sx, sy);
            }
            x.closePath(); x.strokeStyle = colour; x.lineWidth = width * ratio; x.stroke();
        }
        for (i = 0; i < cell.near.length; i++) outline(g.cells[cell.near[i]], 'rgba(0,255,1,0.45)', 1);
        outline(cell, '#00b4ff', 2);
        return c;
    }

    function show(k) {
        head();
        if (k < 0) {
            root.appendChild(el('p', 'orb-hint', 'drag to turn · scroll to come closer · click a plot'));
            return;
        }
        var cell = g.cells[k], at = where(g, k);
        root.appendChild(el('div', 'orb-plot', 'plot ' + k));
        root.appendChild(ground(k));
        var dl = el('dl', 'orb-facts');
        row(dl, 'centre', deg(at.lat, 'N', 'S') + ' · ' + deg(at.lon, 'E', 'W'));
        row(dl, 'area', groups(area(g, k, body.radiusKm)) + NB + 'km²');
        row(dl, 'share', '1/' + groups(4 * Math.PI / solidAngle(g, k)) + ' of ' + body.name);
        row(dl, 'shape', cell.ring.length === 6 ? 'hexagon' : 'pentagon');
        var nd = row(dl, 'neighbours', '');
        cell.near.forEach(function (n) {
            var b = el('button', 'orb-nb', String(n));
            b.type = 'button';
            b.addEventListener('click', function () { choose(n, true); });
            nd.appendChild(b);
        });
        row(dl, 'owner', '—');
        root.appendChild(dl);
    }

    show(-1);
    return { show: show };
}
