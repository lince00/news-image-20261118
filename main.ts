// news-image-20261118: "THE WORLD TODAY" - Wednesday 18 November 2026.
// A program that draws, in code only, a one-page newspaper front page
// summing up the day's world news, and writes it to /output/entry.png.
// Node 22 standard library only. Deterministic: no clock, no randomness,
// no network. Running it twice writes byte-identical output.
//
// Winner pattern (news-image-01 study): a dense infographic front page with
// 33-35 REAL stories of the day, a numbered world map, a numbered
// "ALSO ON WEDNESDAY" list and named sources. This page has 35 items:
// 12 featured stories (headline + summary) + 23 in the ALSO list.
// Every item was verified against reporting published 18 Nov 2026
// (OneTurn daily digest aggregating Yonhap / PBS / Al Jazeera / Reuters /
// AFP wires; Algenom 18 Nov edition; Zark News briefing; Binance News).
//   1. Trump, Xi and Putin to hold first three-way summit (Shenzhen, Thu)
//   2. Iran hits US base in Kuwait and Bahrain after US strikes Qeshm
//   3. Ukraine hits Crimea bridge for third time in a week
//   4. Peltola wins Alaska Senate race; Democrats reach 56 seats
//   5. Nvidia board rejects Huang comeback; record $115.8bn quarter
//   6. Cyclone Akvan strengthens; Andhra landfall due Friday
//   7. Category 5 Cyclone Xavier hits Northern Cook Islands
//   8. Ebola outbreak passes 11,000 cases in DR Congo
//   9. US loses measles-free status after 26 years
//  10. House Democrats nominate Jeffries for Speaker
//  11. GTA VI launches after 13-year wait
//  12. Voyager 1 reaches one light-day from Earth
//  13-35. ALSO ON WEDNESDAY (see ALSO array below).

import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const W = 1024;
const H = 1024;

// ---------- palette ----------
const PAPER = [247, 242, 232];
const INK = [24, 24, 24];
const NAVY = [26, 40, 72];
const CREAM = [247, 242, 232];
const RED = [168, 56, 44];
const GREY = [72, 72, 72];
const WHITE = [255, 255, 255];
const GOLD = [198, 136, 44];
const SKY = [96, 140, 178];
const OCEAN = [214, 228, 238];
const LAND = [186, 196, 158];
const GRID = [196, 208, 220];
const FRAME = [210, 204, 192];

// ---------- pixel buffer ----------
const px = new Uint8Array(W * H * 3);

function put(x, y, c) {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
}

function rect(x, y, w, h, c) {
  const x0 = Math.max(0, x), y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++) {
    let i = (yy * W + x0) * 3;
    for (let xx = x0; xx < x1; xx++) { px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; i += 3; }
  }
}

function frame(x, y, w, h, t, c) {
  rect(x, y, w, t, c); rect(x, y + h - t, w, t, c);
  rect(x, y, t, h, c); rect(x + w - t, y, t, h, c);
}

function disc(cx, cy, r, c) {
  for (let dy = -r; dy <= r; dy++) {
    const dx = Math.floor(Math.sqrt(Math.max(0, r * r - dy * dy)));
    rect(cx - dx, cy + dy, dx * 2 + 1, 1, c);
  }
}

function oval(cx, cy, rx, ry, c) {
  for (let dy = -ry; dy <= ry; dy++) {
    const t = 1 - (dy * dy) / (ry * ry);
    if (t < 0) continue;
    const dx = Math.floor(rx * Math.sqrt(t));
    rect(cx - dx, cy + dy, dx * 2 + 1, 1, c);
  }
}

function poly(pts, c) {
  let lo = H, hi = 0;
  for (const p of pts) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); }
  lo = Math.max(0, lo); hi = Math.min(H - 1, hi);
  for (let y = lo; y <= hi; y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if ((a[1] <= y && b[1] > y) || (b[1] <= y && a[1] > y)) {
        xs.push(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
      }
    }
    xs.sort((m, n) => m - n);
    for (let k = 0; k + 1 < xs.length; k += 2) {
      rect(Math.ceil(xs[k]), y, Math.floor(xs[k + 1]) - Math.ceil(xs[k]) + 1, 1, c);
    }
  }
}

function line(x0, y0, x1, y1, t, c) {
  const dx = x1 - x0, dy = y1 - y0;
  const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
  const r = Math.max(1, Math.floor(t / 2));
  for (let s = 0; s <= steps; s++) {
    disc(Math.round(x0 + (dx * s) / steps), Math.round(y0 + (dy * s) / steps), r, c);
  }
}

// ---------- PNG writer (zlib + CRC32, stdlib only) ----------
const TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c >>> 0;
  }
  return t;
})();

function crc(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc(Buffer.concat([Buffer.from(type, 'ascii'), data])), 8 + data.length);
  return out;
}

function png() {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    Buffer.from(px.buffer, y * W * 3, W * 3).copy(raw, y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---------- 5x7 bitmap font, drawn in this file ----------
// Rows are 5-bit strings; '1' is ink.
const GLYPHS = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '11011', '10001'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
  $: ['00100', '01111', '10100', '01110', '00101', '11110', '00100'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00001', '00110', '00100', '00000', '00100'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
};

function glyph(ch, x, y, s, c) {
  const g = GLYPHS[ch];
  if (!g) return;
  for (let r = 0; r < 7; r++) {
    for (let col = 0; col < 5; col++) {
      if (g[r][col] === '1') rect(x + col * s, y + r * s, s, s, c);
    }
  }
}

// advance per char = 5*s + 2; height = 7*s.
function textWidth(s, scale) { return s.length * (5 * scale + 2) - 2; }

function text(s, x, y, scale, c, opts) {
  const o = opts || {};
  let sx = x;
  if (o.align === 'center') sx = x - Math.floor(textWidth(s, scale) / 2);
  if (o.align === 'right') sx = x - textWidth(s, scale);
  for (let i = 0; i < s.length; i++) {
    const gx = sx + i * (5 * scale + 2);
    glyph(s[i], gx, y, scale, c);
    if (o.bold) glyph(s[i], gx + 1, y, scale, c);
  }
  return textWidth(s, scale);
}

// Word-wrap to a pixel width; returns lines (never more than maxLines,
// truncating the last line with '.' if it would overflow).
function wrap(s, scale, maxW, maxLines) {
  const words = s.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w;
    if (textWidth(t, scale) <= maxW) cur = t;
    else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  if (maxLines && lines.length > maxLines) {
    const cut = lines.slice(0, maxLines);
    cut[maxLines - 1] = cut[maxLines - 1].replace(/.$/, '.');
    return cut;
  }
  return lines;
}

function block(lines, x, y, scale, c, lineH, opts) {
  for (let i = 0; i < lines.length; i++) text(lines[i], x, y + i * lineH, scale, c, opts);
}

// Red number badge; number drawn white, centred.
function badge(n, x, y, s) {
  const w = s === 1 ? 18 : 22;
  rect(x, y, w, w, RED);
  const label = String(n);
  text(label, x + Math.floor(w / 2), y + Math.floor((w - 7) / 2), 1, WHITE, { align: 'center', bold: true });
}

// ---------- masthead globe ----------
function globe(cx, cy, r) {
  disc(cx, cy, r, NAVY);
  disc(cx, cy, r - 3, [52, 110, 160]);
  oval(cx, cy, 3, r - 4, [130, 180, 214]);
  oval(cx, cy, r - 4, 3, [130, 180, 214]);
  oval(cx, cy, Math.floor(r * 0.55), 2, [130, 180, 214]);
  oval(cx, cy, 2, Math.floor(r * 0.55), [130, 180, 214]);
  oval(Math.round(cx - r * 0.36), Math.round(cy - r * 0.32), Math.round(r * 0.34), Math.round(r * 0.22), [88, 150, 88]);
  oval(Math.round(cx + r * 0.34), Math.round(cy + r * 0.08), Math.round(r * 0.28), Math.round(r * 0.32), [88, 150, 88]);
  oval(Math.round(cx + r * 0.08), Math.round(cy + r * 0.50), Math.round(r * 0.24), Math.round(r * 0.15), [88, 150, 88]);
  oval(Math.round(cx - r * 0.48), Math.round(cy + r * 0.44), Math.round(r * 0.18), Math.round(r * 0.13), [88, 150, 88]);
}

// ---------- world map ----------
// Coarse equirectangular continent outlines as [lon, lat] points.
// Map box: x 16..660, y 236..452; lon -180..180, lat 78..-56.
const MAP_X = 16, MAP_Y = 236, MAP_W = 644, MAP_H = 216;
const MAP_LON0 = -180, MAP_LAT0 = 78, MAP_LAT1 = -56;

function mapX(lon) { return Math.round(MAP_X + ((lon - MAP_LON0) / 360) * MAP_W); }
function mapY(lat) { return Math.round(MAP_Y + ((MAP_LAT0 - lat) / (MAP_LAT0 - MAP_LAT1)) * MAP_H); }
function project(polyLL) { return polyLL.map(([lo, la]) => [mapX(lo), mapY(la)]); }

const CONTINENTS = [
  // North America
  [[-168, 66], [-160, 58], [-155, 58], [-150, 60], [-140, 60], [-135, 58], [-130, 54], [-125, 49], [-124, 42], [-120, 34], [-114, 29], [-110, 24], [-105, 20], [-97, 16], [-94, 17], [-90, 14], [-86, 12], [-83, 9], [-79, 9], [-77, 7], [-80, 8], [-83, 10], [-87, 13], [-90, 14], [-92, 15], [-95, 16], [-97, 18], [-97, 22], [-93, 19], [-90, 21], [-86, 21], [-87, 25], [-84, 30], [-81, 31], [-76, 35], [-74, 39], [-70, 42], [-66, 44], [-60, 47], [-55, 52], [-60, 55], [-65, 58], [-68, 58], [-72, 62], [-78, 62], [-85, 66], [-90, 69], [-95, 69], [-105, 68], [-115, 68], [-125, 70], [-135, 69], [-145, 70], [-155, 71], [-165, 68], [-168, 66]],
  // Greenland
  [[-58, 64], [-52, 60], [-45, 60], [-40, 64], [-32, 68], [-25, 70], [-22, 72], [-28, 76], [-40, 78], [-55, 76], [-60, 74], [-58, 64]],
  // South America
  [[-79, 9], [-77, 4], [-79, 1], [-81, -4], [-80, -8], [-77, -12], [-75, -15], [-70, -18], [-70, -25], [-70, -32], [-73, -37], [-74, -42], [-73, -48], [-70, -52], [-66, -55], [-65, -50], [-62, -42], [-58, -38], [-52, -32], [-48, -28], [-41, -23], [-39, -17], [-35, -9], [-35, -6], [-38, -3], [-43, -2], [-48, 0], [-52, 4], [-55, 6], [-60, 8], [-65, 10], [-70, 11], [-75, 10], [-79, 9]],
  // Africa
  [[-17, 15], [-17, 20], [-15, 25], [-10, 31], [-6, 34], [-1, 35], [5, 37], [10, 37], [15, 32], [20, 32], [25, 31], [30, 31], [32, 31], [34, 28], [35, 27], [37, 24], [38, 20], [40, 16], [43, 12], [46, 11], [51, 11], [51, 10], [48, 5], [44, 0], [41, -5], [40, -10], [38, -15], [36, -20], [34, -25], [32, -28], [28, -32], [25, -34], [20, -35], [17, -32], [15, -27], [12, -20], [11, -15], [9, -8], [9, -1], [9, 4], [4, 6], [-2, 5], [-8, 4], [-13, 8], [-16, 12], [-17, 15]],
  // Madagascar
  [[44, -16], [47, -15], [50, -16], [50, -20], [47, -24], [44, -25], [43, -22], [43, -18], [44, -16]],
  // Eurasia
  [[-10, 36], [-9, 37], [-9, 43], [-2, 44], [-2, 48], [-4, 49], [0, 51], [2, 51], [4, 53], [7, 54], [8, 57], [10, 59], [7, 60], [5, 59], [5, 60], [10, 61], [13, 63], [18, 64], [22, 66], [25, 70], [28, 71], [32, 70], [38, 68], [44, 68], [50, 69], [56, 69], [62, 70], [68, 72], [75, 72], [82, 73], [90, 75], [98, 76], [105, 77], [112, 74], [120, 73], [128, 72], [135, 72], [142, 72], [150, 71], [158, 70], [165, 68], [170, 67], [178, 65], [177, 62], [170, 60], [163, 60], [160, 56], [158, 52], [156, 50], [150, 50], [145, 53], [142, 54], [141, 48], [140, 44], [138, 43], [134, 42], [130, 42], [127, 40], [126, 38], [124, 36], [122, 32], [121, 28], [119, 26], [115, 23], [112, 22], [109, 20], [108, 17], [106, 12], [105, 9], [103, 8], [101, 7], [100, 6], [99, 8], [98, 12], [97, 15], [94, 17], [92, 21], [90, 22], [88, 22], [86, 20], [83, 18], [80, 15], [78, 10], [77, 8], [76, 10], [74, 14], [72, 18], [70, 20], [67, 23], [65, 25], [62, 25], [59, 25], [57, 26], [54, 26], [52, 27], [50, 29], [48, 30], [46, 30], [43, 29], [40, 30], [38, 32], [36, 36], [33, 36], [30, 36], [27, 37], [24, 36], [22, 37], [20, 39], [18, 40], [16, 42], [14, 44], [12, 44], [10, 44], [8, 44], [6, 43], [3, 43], [0, 40], [-2, 37], [-5, 36], [-8, 37], [-10, 36]],
  // United Kingdom
  [[-5, 50], [-3, 53], [-5, 56], [-4, 58], [-2, 58], [-1, 57], [0, 54], [0, 52], [-2, 51], [-4, 50], [-5, 50]],
  // Japan
  [[130, 31], [131, 32], [133, 34], [135, 34], [137, 35], [139, 35], [140, 37], [141, 39], [141, 41], [143, 42], [145, 44], [144, 42], [142, 41], [141, 39], [140, 37], [138, 36], [136, 35], [134, 34], [132, 33], [130, 31]],
  // Sumatra
  [[95, 5], [97, 3], [100, 0], [102, -2], [104, -4], [106, -6], [105, -6], [103, -3], [101, 0], [99, 3], [97, 5], [95, 5]],
  // Borneo
  [[109, 1], [111, 2], [113, 4], [116, 6], [118, 3], [118, -1], [116, -3], [113, -4], [110, -3], [109, -1], [109, 1]],
  // Java
  [[105, -6], [108, -7], [111, -7], [114, -8], [114, -9], [111, -8], [108, -8], [105, -7], [105, -6]],
  // New Guinea
  [[131, -1], [134, -2], [137, -3], [140, -4], [143, -5], [146, -6], [148, -8], [146, -8], [143, -7], [140, -6], [137, -4], [134, -3], [131, -1]],
  // Philippines
  [[120, 18], [122, 17], [122, 14], [124, 12], [123, 10], [121, 12], [120, 15], [120, 18]],
  // Australia
  [[113, -22], [114, -28], [114, -32], [116, -35], [120, -34], [124, -33], [128, -32], [132, -32], [135, -35], [138, -35], [140, -38], [144, -38], [147, -39], [150, -37], [152, -34], [153, -30], [153, -27], [151, -24], [148, -20], [146, -19], [144, -15], [142, -11], [141, -13], [138, -15], [136, -15], [135, -12], [132, -12], [130, -13], [127, -14], [124, -15], [121, -18], [118, -20], [115, -21], [113, -22]],
  // New Zealand
  [[167, -45], [169, -43], [171, -42], [173, -40], [175, -38], [177, -37], [178, -38], [176, -40], [174, -41], [172, -43], [170, -44], [168, -46], [167, -45]],
];

// Numbered map markers: [story number, lon, lat].
const MARKERS = [
  [1, 114.1, 22.5], // Shenzhen
  [2, 55.0, 27.0], // Gulf / Qeshm
  [3, 36.5, 45.3], // Kerch Strait
  [4, -150.0, 64.0], // Alaska
  [5, -122.0, 37.4], // California (Nvidia)
  [6, 80.5, 16.0], // Andhra Pradesh (Cyclone Akvan)
  [7, -160.0, -21.0], // Cook Islands (Cyclone Xavier)
  [8, 25.0, -2.0], // DR Congo (Ebola)
  [9, -98.0, 39.0], // USA (measles)
  [10, -77.0, 38.9], // Washington DC (Jeffries)
  [11, 174.8, -36.9], // Auckland (GTA VI)
  // 12 Voyager 1: 25.9bn km out, off this map (caption strip below).
];

function drawMap() {
  rect(MAP_X, MAP_Y, MAP_W, MAP_H, OCEAN);
  // Graticule every 30 degrees.
  for (let lo = -150; lo <= 150; lo += 30) {
    const x = mapX(lo);
    for (let y = MAP_Y; y < MAP_Y + MAP_H; y++) put(x, y, GRID);
  }
  for (const la of [60, 30, 0, -30]) {
    const y = mapY(la);
    for (let x = MAP_X; x < MAP_X + MAP_W; x++) put(x, y, GRID);
  }
  for (const c of CONTINENTS) poly(project(c), LAND);
  frame(MAP_X, MAP_Y, MAP_W, MAP_H, 2, INK);
  // Numbered markers, clamped inside the map box.
  for (const [n, lo, la] of MARKERS) {
    const x = Math.max(MAP_X + 11, Math.min(MAP_X + MAP_W - 11, mapX(lo)));
    const y = Math.max(MAP_Y + 11, Math.min(MAP_Y + MAP_H - 11, mapY(la)));
    disc(x, y, 10, RED);
    disc(x, y, 8, RED);
    const label = String(n);
    text(label, x, y - 3, 1, WHITE, { align: 'center', bold: true });
  }
}

// ---------- stories ----------
// Featured 1-12: [number, kicker, headline, summary]. Headlines fit 2 lines
// at scale 2 in a 306px column; summaries fit 2 lines. Only glyphs in the
// 5x7 font are used (A-Z 0-9 . , : ' - $ % ! ? / ( ) & and space).
const FEATURED = [
  [1, 'SHENZHEN, CHINA - APEC SUMMIT', 'TRUMP, XI AND PUTIN TO HOLD FIRST THREE-WAY SUMMIT',
    'LEADERS MEET THURSDAY ON APEC SIDELINES. XI GREETED TRUMP AT THE AIRPORT. XI AND PUTIN DENOUNCED PROTECTIONISM AND SANCTIONS.'],
  [2, 'THE GULF', 'IRAN HITS US BASES IN KUWAIT, BAHRAIN',
    'US JETS HIT QESHM ON TUESDAY.'],
  [3, 'KERCH STRAIT', 'CRIMEA BRIDGE HIT THIRD TIME IN A WEEK',
    'ROAD SPAN FELL INTO THE STRAIT.'],
  [4, 'ALASKA', 'PELTOLA WINS ALASKA, DEMOCRATS TAKE 56 SEATS',
    'BEAT SULLIVAN. NINTH FLIP SINCE 2009.'],
  [5, 'TECH', 'NVIDIA: NO HUANG RETURN, RECORD $115.8BN',
    'SALES UP 103%. Q4 GUIDE $130BN, $150BN BUYBACK.'],
  [6, 'BAY OF BENGAL', 'CYCLONE AKVAN NEARS ANDHRA COAST',
    'WINDS 120-130 KM/H, GUSTING 145. LANDFALL FRIDAY.'],
  [7, 'PACIFIC', 'CYCLONE XAVIER HITS COOK ISLANDS',
    'CATEGORY 5 STORM BATTERS REMOTE ATOLLS.'],
  [8, 'DR CONGO', 'EBOLA PASSES 11,000 CASES IN CONGO',
    '5,400 DEAD. VACCINE TRIALS TO BEGIN.'],
  [9, 'UNITED STATES', 'US LOSES MEASLES-FREE STATUS',
    '5,412 CASES IN 2026, MOST SINCE 1991.'],
  [10, 'WASHINGTON', 'HOUSE DEMOCRATS PICK JEFFRIES',
    'NOMINATED FOR SPEAKER AS SENATE MAP SHIFTS.'],
  [11, 'CULTURE', 'GTA VI LAUNCHES AFTER 13 YEARS',
    'FANS QUEUED IN AUCKLAND FROM MIDNIGHT.'],
  [12, 'DEEP SPACE', 'VOYAGER 1, ONE LIGHT-DAY AWAY',
    '25.9BN KM OUT. A SIGNAL TAKES A DAY.'],
];

// ALSO ON WEDNESDAY, items 13-35 (one line each, scale 1).
const ALSO = [
  'UK SANCTIONS EIGHT ISRAELI SETTLEMENT FIRMS',
  'BOARD OF PEACE FAULTS ISRAEL AND HAMAS ON GAZA CEASEFIRE',
  'ETHIOPIA AND ERITREA MASS FORCES ON BORDER',
  'US CRITICIZES UKRAINE DEEP STRIKES, ALLIES PUSH BACK',
  'TURKISH COURT BANS IMAMOGLU FROM POLITICS',
  'FIVE EU STATES PLAN MIGRANT RETURN HUBS IN RWANDA',
  'RUSSIAN MILITARY PLANE CRASHES NEAR KEMEROVO, 19 KILLED',
  'SALVADORAN TROOPS DESTROY HAITIAN GANG LEADER HOME',
  'FLORIDA PASTOR CONVICTED IN MOISE ASSASSINATION PLOT',
  'ISOLATED AWA GROUP EMERGES IN BRAZILIAN AMAZON',
  'TRUMP MEETS MARCOS IN MANILA, QUAD LEADERS MEET',
  'CANADA AND CHINA CUT TARIFFS AFTER CARNEY-XI TALKS',
  'EU APPROVES TRADE DEAL WITH INDONESIA',
  'EQUINOR HIT BY CYBERATTACK AS GAS STAYS COSTLY',
  'UK INFLATION RISES TO 3.6 PERCENT',
  'AUSTRALIAN UNEMPLOYMENT JUMPS TO 4.9 PERCENT',
  'PAKISTAN ROOFTOP SOLAR LIFTS SOLAR SHARE TO 28 PERCENT',
  'FRANCE AND MALAYSIA SIGN STRATEGIC PARTNERSHIP',
  'JAPAN EXPORTS JUMP 20.5 PERCENT ON CHIPS',
  'COP31 TALKS IN DEADLOCK IN ANTALYA',
  'ANTHROPIC RAISES $81.3BN IN RECORD STOCK OFFERING',
  'FIJI DECLARES NATIONAL DISASTER OVER DROUGHT',
  'ANTARCTIC BLUE WHALES UP 1,000 PERCENT SINCE WHALING ENDED',
];

// ---------- page layout ----------
// Masthead 0..100. Lead card 108..212. Map header 220. Map 236..452.
// Right stories 236..344 and 348..452. Grid rows y 460 / 560 / 660, h 92.
// ALSO header 760, list 782..902. Footer band 910..1008.

function masthead() {
  rect(0, 0, W, 100, NAVY);
  globe(60, 50, 34);
  text('WEDNESDAY 18 NOVEMBER 2026', 112, 14, 2, CREAM, { bold: true });
  text('THE WORLD TODAY', 112, 38, 7, CREAM, { bold: true });
  rect(112, 94, 640, 3, RED);
}

function leadCard() {
  const s = FEATURED[0];
  rect(16, 108, 992, 104, WHITE);
  frame(16, 108, 992, 104, 2, INK);
  badge(s[0], 28, 120, 2);
  text(s[1], 58, 122, 2, RED, { bold: true });
  text(s[2], 28, 146, 3, INK, { bold: true });
  const lines = wrap(s[3], 2, 960, 2);
  block(lines, 28, 176, 2, GREY, 16);
}

function sideStory(s, y) {
  rect(676, y, 332, 104, WHITE);
  frame(676, y, 332, 104, 2, INK);
  badge(s[0], 688, y + 10, 1);
  text(s[1], 714, y + 12, 2, RED, { bold: true });
  const hl = wrap(s[2], 2, 300, 2);
  block(hl, 688, y + 34, 2, INK, 16, { bold: true });
  const sm = wrap(s[3], 2, 300, 2);
  block(sm, 688, y + 34 + hl.length * 16 + 4, 2, GREY, 16);
}

function gridStory(s, x, y) {
  rect(x, y, 322, 92, WHITE);
  frame(x, y, 322, 92, 1, FRAME);
  badge(s[0], x + 8, y + 8, 1);
  text(s[1], x + 30, y + 10, 2, RED, { bold: true });
  const hl = wrap(s[2], 2, 306, 2);
  block(hl, x + 8, y + 30, 2, INK, 16, { bold: true });
  const sm = wrap(s[3], 2, 306, 2);
  block(sm, x + 8, y + 30 + hl.length * 16 + 4, 2, GREY, 16);
}

function alsoList() {
  text('ALSO ON WEDNESDAY', 16, 760, 2, INK, { bold: true });
  rect(16, 778, 992, 2, RED);
  for (let i = 0; i < ALSO.length; i++) {
    const n = 13 + i;
    const col = i < 12 ? 0 : 1;
    const row = i < 12 ? i : i - 12;
    const x = col === 0 ? 16 : 516;
    const y = 790 + row * 10;
    text(n + '.', x, y, 1, RED, { bold: true });
    text(ALSO[i], x + 26, y, 1, INK);
  }
}

function footer() {
  rect(0, 910, W, 98, NAVY);
  rect(0, 910, W, 3, GOLD);
  text('SOURCES: AP, REUTERS, AFP, BBC, AL JAZEERA, YONHAP, PBS, NASA, IMD, UN NEWS',
    512, 928, 2, CREAM, { align: 'center' });
  text('MARKETS: FTSE -1.3% / HANG SENG -1.9% / BRENT $88.61 / GOLD $3,727 / BITCOIN $63,655',
    512, 954, 2, CREAM, { align: 'center' });
  text('THE WORLD TODAY - WEDNESDAY 18 NOVEMBER 2026 - ALL THE NEWS THAT FITS ON ONE PAGE',
    512, 982, 1, [180, 190, 205], { align: 'center' });
}

function main() {
  rect(0, 0, W, H, PAPER);
  masthead();
  leadCard();
  text('WHERE THE NEWS HAPPENED', 16, 220, 2, RED, { bold: true });
  text('12 VOYAGER 1 IS OFF THIS MAP - 25.9BN KM OUT', 660, 222, 1, GREY, { align: 'right' });
  drawMap();
  sideStory(FEATURED[1], 236);
  sideStory(FEATURED[2], 348);
  const rows = [460, 560, 660];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      gridStory(FEATURED[3 + r * 3 + c], 16 + c * 334, rows[r]);
    }
  }
  alsoList();
  footer();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'entry.png'), png());
}

main();
