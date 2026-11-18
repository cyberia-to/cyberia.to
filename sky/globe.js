/* a body up close: its map on a sphere in WebGL, lit by the sun from where it truly stands, cut into its plots.
   drag turns it, the wheel brings it nearer; the plot under the pointer lights up, a chosen one stays lit.
   the view is orthographic: a pixel maps back to exactly one point of the surface, so picking is exact */
import { grid, pick } from './plots.js';

var SPHERE_VS = 'attribute vec3 p;uniform vec3 uR,uU,uO;uniform vec2 uS;uniform float uLift;varying vec3 vP;varying float vZ;' +
    'void main(){vP=p;vec3 v=vec3(dot(p,uR),dot(p,uU),dot(p,uO));vZ=v.z;gl_Position=vec4(v.x*uS.x,v.y*uS.y,-v.z*0.25-uLift,1.0);}';

var SPHERE_FS = 'precision highp float;varying vec3 vP;' +
    'uniform sampler2D uMap,uNight,uRing;uniform vec3 uSun,uO,uAir;uniform float uEarth,uFlat,uRings,uNightOn;' +
    'const float PI=3.14159265;' +
    'float ringA(float r){float u=(r-1.1695)/1.1855;if(u<0.0||u>1.0)return 0.0;return texture2D(uRing,vec2(u,0.5)).a;}' +
    'vec3 map(sampler2D t,vec3 n){return texture2D(t,vec2(atan(n.y,n.x)/(2.0*PI)+0.5,0.5-asin(clamp(n.z,-1.0,1.0))/PI)).rgb;}' +
    'void main(){vec3 n=normalize(vP);vec3 c=map(uMap,n);float l=dot(n,uSun);float mu=max(dot(n,uO),0.0);float k;vec3 col;' +
    'if(uFlat>0.5)k=l>0.0?min(1.25,2.2*l/(l+mu+0.02))*smoothstep(0.0,0.12,l)*1.15:0.0;' +
    'else k=pow(clamp((l+0.16)/1.16,0.0,1.0),0.9)*(0.6+0.4*sqrt(mu));' +
    'if(uRings>0.5&&abs(uSun.z)>1e-4){float t=-n.z/uSun.z;if(t>0.0)k*=1.0-0.8*ringA(length(n+t*uSun));}' +
    'if(uEarth>0.5){float ke=pow(clamp(l*1.1+0.08,0.0,1.0),0.75)*1.2;float dw=smoothstep(-0.14,0.2,l);' +
    'float water=clamp((c.b-max(c.r,c.g))*6.4,0.0,1.0);vec3 h=normalize(uSun+uO);float sp=pow(max(dot(n,h),0.0),60.0)*water*0.5;' +
    'float rim=pow(1.0-mu,2.6)*dw;col=(c+vec3(0.055,0.118,0.243))*ke+vec3(1.0,0.92,0.78)*sp+vec3(0.27,0.51,1.0)*rim;' +
    'if(uNightOn>0.5){vec3 nc=map(uNight,n);float f=1.0-dw;float a=clamp((nc.r-0.094)*1.275,0.0,1.0)*1.3;col+=(nc*0.6+vec3(1.0,0.81,0.55)*a)*f;}}' +
    'else{col=c*(k+(uFlat>0.5?0.1:0.14));if(uFlat<0.5)col+=uAir*pow(1.0-mu,3.0)*smoothstep(-0.2,0.3,l)*0.35;}' +
    'gl_FragColor=vec4(col,1.0);}';

/* the plots' light: dimmer on the night side and toward the limb, so the grid never paints the dark green */
var FLAT_FS = 'precision mediump float;uniform vec4 uC;uniform vec3 uSun;uniform float uShade;varying float vZ;varying vec3 vP;' +
    'void main(){float a=uC.a*smoothstep(0.0,0.3,vZ)*mix(1.0,0.35+0.65*smoothstep(-0.15,0.25,dot(normalize(vP),uSun)),uShade);' +
    'gl_FragColor=vec4(uC.rgb*a,a);}';

var RING_VS = 'attribute vec3 p;uniform vec3 uR,uU,uO;uniform vec2 uS;varying vec3 vP;' +
    'void main(){vP=p;vec3 v=vec3(dot(p,uR),dot(p,uU),dot(p,uO));gl_Position=vec4(v.x*uS.x,v.y*uS.y,-v.z*0.25,1.0);}';

var RING_FS = 'precision highp float;varying vec3 vP;uniform sampler2D uRing;uniform vec3 uSun,uO;' +
    'void main(){float r=length(vP.xy);float u=(r-1.1695)/1.1855;if(u<0.0||u>1.0)discard;vec4 t=texture2D(uRing,vec2(u,0.5));' +
    'float s=dot(vP,uSun);float lit=(s<0.0&&r*r-s*s<1.0)?0.06:(uSun.z*uO.z>0.0?2.2:1.2);gl_FragColor=vec4(t.rgb*lit,t.a);}';

function shader(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
}
function program(gl, vs, fs) {
    var p = gl.createProgram();
    gl.attachShader(p, shader(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(p, shader(gl, gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS), i, a;
    for (i = 0; i < n; i++) { a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); }
    return { p: p, u: u, a: gl.getAttribLocation(p, 'p') };
}
function buffer(gl, data, target, usage) {
    var b = gl.createBuffer();
    gl.bindBuffer(target || gl.ARRAY_BUFFER, b);
    gl.bufferData(target || gl.ARRAY_BUFFER, data, usage || gl.STATIC_DRAW);
    return b;
}
function texture(gl, src) {
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    if (src.data) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, src.w, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, src.data);
    else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, src.data ? gl.CLAMP_TO_EDGE : gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    return t;
}

function rot(a, b, ang) {
    var c = Math.cos(ang), s = Math.sin(ang);
    return [[a[0] * c + b[0] * s, a[1] * c + b[1] * s, a[2] * c + b[2] * s], [b[0] * c - a[0] * s, b[1] * c - a[1] * s, b[2] * c - a[2] * s]];
}
function norm(v) { var n = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / n, v[1] / n, v[2] / n]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function hex(h) { return [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]; }

/* the plots' boundaries as line segments, once for every body: each edge between two triangles of the grid
   becomes the arc between their centres */
var edges = null;
function plotEdges(g) {
    if (edges) return edges;
    var seen = new Map(), out = [], t, k, a, b, key, other;
    for (t = 0; t < g.tris.length; t++) {
        for (k = 0; k < 3; k++) {
            a = g.tris[t][k]; b = g.tris[t][(k + 1) % 3];
            key = a < b ? a * 65536 + b : b * 65536 + a;
            other = seen.get(key);
            if (other === undefined) seen.set(key, t);
            else out.push(g.mids[other][0], g.mids[other][1], g.mids[other][2], g.mids[t][0], g.mids[t][1], g.mids[t][2]);
        }
    }
    edges = new Float32Array(out);
    return edges;
}

/* body: { map, night, ring: { w, data }, sun, view: { R, U, O }, air, flat, earth }
   every vector is in the body's own frame: z its north pole, x its prime meridian */
export function createGlobe(canvas, body) {
    var gl = canvas.getContext('webgl', { antialias: true, premultipliedAlpha: true, alpha: true });
    if (!gl) throw new Error('no webgl');
    var g = grid(), i;
    var sphere = program(gl, SPHERE_VS, SPHERE_FS);
    var flat = program(gl, SPHERE_VS, FLAT_FS);
    var ringProg = body.ring ? program(gl, RING_VS, RING_FS) : null;

    var pos = new Float32Array(g.n * 3), idx = new Uint16Array(g.tris.length * 3);
    for (i = 0; i < g.n; i++) { pos[i * 3] = g.pts[i][0]; pos[i * 3 + 1] = g.pts[i][1]; pos[i * 3 + 2] = g.pts[i][2]; }
    for (i = 0; i < g.tris.length; i++) { idx[i * 3] = g.tris[i][0]; idx[i * 3 + 1] = g.tris[i][1]; idx[i * 3 + 2] = g.tris[i][2]; }
    var posB = buffer(gl, pos), idxB = buffer(gl, idx, gl.ELEMENT_ARRAY_BUFFER), lines = plotEdges(g), lineB = buffer(gl, lines);
    var markB = gl.createBuffer(), marks = [];
    var ringB = null, ringN = 0;
    if (body.ring) {
        var rv = [], seg = 256, r0 = 1.1695, r1 = 2.355, a0, a1;
        for (i = 0; i < seg; i++) {
            a0 = i / seg * Math.PI * 2; a1 = (i + 1) / seg * Math.PI * 2;
            rv.push(r0 * Math.cos(a0), r0 * Math.sin(a0), 0, r1 * Math.cos(a0), r1 * Math.sin(a0), 0, r1 * Math.cos(a1), r1 * Math.sin(a1), 0,
                r0 * Math.cos(a0), r0 * Math.sin(a0), 0, r1 * Math.cos(a1), r1 * Math.sin(a1), 0, r0 * Math.cos(a1), r0 * Math.sin(a1), 0);
        }
        ringB = buffer(gl, new Float32Array(rv)); ringN = rv.length / 3;
    }
    /* no mipmaps: the map is at least as fine as the screen over most of the disc, and the seam where
       longitude wraps stays invisible without them */
    var mapT = texture(gl, body.map), nightT = body.night ? texture(gl, body.night) : mapT;
    var ringT = body.ring ? texture(gl, body.ring) : mapT;

    var R = body.view.R.slice(), U = body.view.U.slice(), O = body.view.O.slice();
    var zoom = 1, side = 0, ratio = 1, queued = false, air = hex(body.air || '#00b4ff');

    /* device px per radius: the disc fills 80% of the stage, a ringed body is drawn small enough for its rings */
    function scale() { return side * ratio * 0.5 * (body.ring ? 0.94 / 2.355 : 0.8) * zoom; }

    function size() {
        ratio = Math.min(2, window.devicePixelRatio || 1);
        side = canvas.clientWidth;
        canvas.width = Math.round(side * ratio); canvas.height = Math.round(side * ratio);
        redraw();
    }

    function common(prog) {
        var s = scale() / (canvas.width / 2);
        gl.uniform3fv(prog.u.uR, R); gl.uniform3fv(prog.u.uU, U); gl.uniform3fv(prog.u.uO, O);
        gl.uniform2f(prog.u.uS, s, s);
    }
    function attrib(prog, buf) {
        gl.bindBuffer(gl.ARRAY_BUFFER, buf);
        gl.enableVertexAttribArray(prog.a);
        gl.vertexAttribPointer(prog.a, 3, gl.FLOAT, false, 0, 0);
    }

    function draw() {
        queued = false;
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.depthMask(true); gl.disable(gl.BLEND);

        gl.useProgram(sphere.p); common(sphere);
        gl.uniform1f(sphere.u.uLift, 0);
        gl.uniform3fv(sphere.u.uSun, body.sun); gl.uniform3fv(sphere.u.uAir, air);
        gl.uniform1f(sphere.u.uEarth, body.earth ? 1 : 0); gl.uniform1f(sphere.u.uFlat, body.flat ? 1 : 0);
        gl.uniform1f(sphere.u.uRings, body.ring ? 1 : 0); gl.uniform1f(sphere.u.uNightOn, body.night ? 1 : 0);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, mapT); gl.uniform1i(sphere.u.uMap, 0);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, nightT); gl.uniform1i(sphere.u.uNight, 1);
        gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, ringT); gl.uniform1i(sphere.u.uRing, 2);
        attrib(sphere, posB);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxB);
        gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_SHORT, 0);

        /* the plots: thin light on the surface, the nearer the brighter as the view comes in */
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
        gl.useProgram(flat.p); common(flat);
        gl.uniform1f(flat.u.uLift, 0.0006);
        gl.uniform3fv(flat.u.uSun, body.sun); gl.uniform1f(flat.u.uShade, 1);
        gl.uniform4f(flat.u.uC, 0.0, 1.0, 0.004, Math.min(0.5, 0.13 + 0.05 * zoom));
        attrib(flat, lineB);
        gl.drawArrays(gl.LINES, 0, lines.length / 3);
        gl.uniform1f(flat.u.uShade, 0);
        for (i = 0; i < marks.length; i++) {
            gl.uniform4f(flat.u.uC, marks[i].c[0], marks[i].c[1], marks[i].c[2], marks[i].c[3]);
            attrib(flat, markB);
            gl.bindBuffer(gl.ARRAY_BUFFER, markB);
            gl.bufferData(gl.ARRAY_BUFFER, marks[i].fill, gl.DYNAMIC_DRAW);
            gl.drawArrays(gl.TRIANGLES, 0, marks[i].fill.length / 3);
            gl.uniform4f(flat.u.uC, marks[i].c[0], marks[i].c[1], marks[i].c[2], 1);
            gl.bufferData(gl.ARRAY_BUFFER, marks[i].edge, gl.DYNAMIC_DRAW);
            gl.drawArrays(gl.LINE_LOOP, 0, marks[i].edge.length / 3);
        }

        if (ringProg) {
            gl.useProgram(ringProg.p); common(ringProg);
            gl.uniform3fv(ringProg.u.uSun, body.sun); gl.uniform3fv(ringProg.u.uO, O);
            gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, ringT); gl.uniform1i(ringProg.u.uRing, 2);
            attrib(ringProg, ringB);
            gl.drawArrays(gl.TRIANGLES, 0, ringN);
        }
        gl.depthMask(true);
    }

    function redraw() { if (!queued) { queued = true; requestAnimationFrame(draw); } }

    /* a plot as a lit fill and an outline, a hair above the surface */
    function mark(k, colour, alpha) {
        var cell = g.cells[k], f = [], e = [], j, a, b, lift = 1.0008;
        for (j = 0; j < cell.ring.length; j++) {
            a = cell.ring[j]; b = cell.ring[(j + 1) % cell.ring.length];
            f.push(cell.c[0] * lift, cell.c[1] * lift, cell.c[2] * lift, a[0] * lift, a[1] * lift, a[2] * lift, b[0] * lift, b[1] * lift, b[2] * lift);
            e.push(a[0] * lift, a[1] * lift, a[2] * lift);
        }
        var c = hex(colour);
        return { fill: new Float32Array(f), edge: new Float32Array(e), c: [c[0], c[1], c[2], alpha] };
    }

    var api = {
        size: size,
        redraw: redraw,
        /* hover and chosen plots, -1 for none */
        mark: function (hover, chosen) {
            marks = [];
            if (hover >= 0 && hover !== chosen) marks.push(mark(hover, '#00ff01', 0.22));
            if (chosen >= 0) marks.push(mark(chosen, '#00b4ff', 0.3));
            redraw();
        },
        /* the plot under a point of the canvas, css px from its corner; -1 off the body */
        pick: function (x, y) {
            var s = scale() / ratio, h = side / 2, vx = (x - h) / s, vy = (h - y) / s, r2 = vx * vx + vy * vy, vz;
            if (r2 > 1) return -1;
            vz = Math.sqrt(1 - r2);
            return pick(g, [vx * R[0] + vy * U[0] + vz * O[0], vx * R[1] + vy * U[1] + vz * O[1], vx * R[2] + vy * U[2] + vz * O[2]]);
        },
        /* turn by a drag of dx, dy css px: the surface under the pointer follows it */
        turn: function (dx, dy) {
            var s = scale() / ratio, t;
            t = rot(R, O, dx / s); R = t[0]; O = t[1];
            t = rot(U, O, -dy / s); U = t[0]; O = t[1];
            O = norm(O); R = norm(cross(U, O)); U = cross(O, R);
            redraw();
        },
        zoomBy: function (f) { zoom = Math.max(1, Math.min(9, zoom * f)); redraw(); },
        /* bring a plot to the middle of the view, the north kept up where it can be */
        face: function (k) {
            var c = g.cells[k].c, n = [0, 0, 1];
            O = c.slice();
            var r = cross(n, O);
            if (Math.hypot(r[0], r[1], r[2]) < 1e-6) r = cross([0, 1, 0], O);
            R = norm(r); U = cross(O, R);
            redraw();
        },
        view: function () { return { R: R.slice(), U: U.slice(), O: O.slice(), zoom: zoom }; },
        destroy: function () { var x = gl.getExtension('WEBGL_lose_context'); if (x) x.loseContext(); }
    };
    size();
    return api;
}
