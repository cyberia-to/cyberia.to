/* plots: every planet cut into the same 10 242 cells — a geodesic grid, hexagons with twelve pentagons.
   pure geometry on the unit sphere of the planet's own frame (z its north pole, x its prime meridian).

   the cut, which fixes every plot's number forever:
   an icosahedron with a vertex on each pole, five at latitude +atan(1/2) from longitude 0 every 72°, five at
   -atan(1/2) from longitude 36°; its twenty faces in the order of faces() below. on a face (a, b, c) the point
   (i, j), i + j ≤ FREQ, has barycentric weights (FREQ − i − j, i, j) / FREQ, each raised to SPREAD and summed
   to one; it lies on the great circle between the points that far along a→b and a→c, as far along it as its
   share of b and c says. a point's number is the order in which it first appears. a plot is the cell around a
   point, bounded by the centres of the triangles that meet in it: 10 230 hexagons within 1.22× of each other's
   area, twelve pentagons of 5/6 of a hexagon, as a sphere allows.
   change FREQ, SPREAD or this order and every plot gets another number — a registry built on them would break. */

export const FREQ = 32;
export const SPREAD = 0.97;
export const COUNT = 10 * FREQ * FREQ + 2;

var cache = null;

function norm(v) { var n = Math.hypot(v[0], v[1], v[2]); return [v[0] / n, v[1] / n, v[2] / n]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function slerp(p, q, t) {
    var w = Math.acos(Math.max(-1, Math.min(1, dot(p, q)))), s = Math.sin(w), u, v;
    if (s < 1e-15) return p;
    u = Math.sin((1 - t) * w) / s; v = Math.sin(t * w) / s;
    return [p[0] * u + q[0] * v, p[1] * u + q[1] * v, p[2] * u + q[2] * v];
}
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }

function icosahedron() {
    var v = [[0, 0, 1]], k, lat = Math.atan(0.5), lon;
    for (k = 0; k < 5; k++) { lon = k * 72 * Math.PI / 180; v.push([Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)]); }
    for (k = 0; k < 5; k++) { lon = (36 + k * 72) * Math.PI / 180; v.push([Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), -Math.sin(lat)]); }
    v.push([0, 0, -1]);
    return v;
}

/* north cap, the band in two rows, south cap — every face counter-clockwise seen from outside */
function faces() {
    var f = [], k, u, u1, l, l1;
    for (k = 0; k < 5; k++) {
        u = 1 + k; u1 = 1 + (k + 1) % 5; l = 6 + k; l1 = 6 + (k + 1) % 5;
        f.push([0, u, u1]);
        f.push([u, l, u1]);
        f.push([u1, l, l1]);
        f.push([11, l1, l]);
    }
    return f;
}

/* the grid: points, the triangles between them, and for every plot its centre, its boundary and its neighbours */
export function grid() {
    if (cache) return cache;
    var ico = icosahedron(), F = faces(), n = FREQ, pts = [], index = new Map(), tris = [];
    var f, a, b, c, i, j, row, w0, w1, w2, far;
    function at(p) {
        var q = norm(p), key = q[0].toFixed(9) + ',' + q[1].toFixed(9) + ',' + q[2].toFixed(9), id = index.get(key);
        if (id === undefined) { id = pts.length; index.set(key, id); pts.push(q); }
        return id;
    }
    for (f = 0; f < F.length; f++) {
        a = ico[F[f][0]]; b = ico[F[f][1]]; c = ico[F[f][2]];
        row = [];
        for (i = 0; i <= n; i++) {
            row.push([]);
            for (j = 0; j <= n - i; j++) {
                w0 = Math.pow((n - i - j) / n, SPREAD); w1 = Math.pow(i / n, SPREAD); w2 = Math.pow(j / n, SPREAD);
                far = (w1 + w2) / (w0 + w1 + w2);
                row[i].push(at(i + j === 0 ? a : slerp(slerp(a, b, far), slerp(a, c, far), w2 / (w1 + w2))));
            }
        }
        for (i = 0; i < n; i++) {
            for (j = 0; j < n - i; j++) {
                tris.push([row[i][j], row[i + 1][j], row[i][j + 1]]);
                if (j < n - i - 1) tris.push([row[i + 1][j], row[i + 1][j + 1], row[i][j + 1]]);
            }
        }
    }
    var N = pts.length, around = [], near = [], t, k, m, centre, cells = [];
    for (i = 0; i < N; i++) { around.push([]); near.push(new Set()); }
    var mids = tris.map(function (tr) {
        var p = pts[tr[0]], q = pts[tr[1]], r = pts[tr[2]];
        return norm([p[0] + q[0] + r[0], p[1] + q[1] + r[1], p[2] + q[2] + r[2]]);
    });
    for (t = 0; t < tris.length; t++) {
        for (k = 0; k < 3; k++) {
            around[tris[t][k]].push(t);
            near[tris[t][k]].add(tris[t][(k + 1) % 3]);
            near[tris[t][k]].add(tris[t][(k + 2) % 3]);
        }
    }
    for (i = 0; i < N; i++) {
        centre = pts[i];
        /* a basis on the tangent plane, to put the boundary and the neighbours in counter-clockwise order */
        var e1 = norm(Math.abs(centre[2]) < 0.9 ? cross([0, 0, 1], centre) : cross([1, 0, 0], centre)), e2 = cross(centre, e1);
        var ang = function (v) { return Math.atan2(dot(v, e2), dot(v, e1)); };
        var ring = around[i].map(function (tt) { return mids[tt]; }).sort(function (p, q) { return ang(p) - ang(q); });
        var nb = Array.from(near[i]).sort(function (p, q) { return ang(pts[p]) - ang(pts[q]); });
        cells.push({ c: centre, ring: ring, near: nb });
    }
    m = { n: N, cells: cells, pts: pts, tris: tris, mids: mids };
    cache = m;
    return m;
}

/* is a point of the unit sphere inside plot k: on the inner side of every edge of its boundary */
export function inside(g, k, v) {
    var ring = g.cells[k].ring, i, a, b;
    for (i = 0; i < ring.length; i++) {
        a = ring[i]; b = ring[(i + 1) % ring.length];
        if (dot(cross(a, b), v) < -1e-12) return false;
    }
    return true;
}

/* the plot a point of the unit sphere lies in: start from the nearest of every 97th centre, walk from plot to
   neighbour toward the point, then settle on the cell whose boundary holds it */
export function pick(g, v) {
    var k = 0, best = -2, i, d, step, guard = 0;
    for (i = 0; i < g.n; i += 97) { d = dot(g.cells[i].c, v); if (d > best) { best = d; k = i; } }
    for (;;) {
        step = -1;
        best = dot(g.cells[k].c, v);
        for (i = 0; i < g.cells[k].near.length; i++) {
            d = dot(g.cells[g.cells[k].near[i]].c, v);
            if (d > best) { best = d; step = g.cells[k].near[i]; }
        }
        if (step < 0 || ++guard > 400) break;
        k = step;
    }
    if (inside(g, k, v)) return k;
    for (i = 0; i < g.cells[k].near.length; i++) if (inside(g, g.cells[k].near[i], v)) return g.cells[k].near[i];
    return k;
}

/* the solid angle of plot k, steradians: its triangles from the centre, by Van Oosterom and Strackee */
export function solidAngle(g, k) {
    var cell = g.cells[k], c = cell.c, ring = cell.ring, s = 0, i, a, b, num, den;
    for (i = 0; i < ring.length; i++) {
        a = ring[i]; b = ring[(i + 1) % ring.length];
        num = Math.abs(dot(c, cross(a, b)));
        den = 1 + dot(c, a) + dot(a, b) + dot(b, c);
        s += 2 * Math.atan2(num, den);
    }
    return s;
}

/* the area of plot k on a sphere of radius R, in R's units squared */
export function area(g, k, R) { return solidAngle(g, k) * R * R; }

/* the centre of plot k as planetocentric latitude and east longitude, deg */
export function where(g, k) {
    var c = g.cells[k].c;
    return { lat: Math.asin(Math.max(-1, Math.min(1, c[2]))) * 180 / Math.PI, lon: Math.atan2(c[1], c[0]) * 180 / Math.PI };
}
