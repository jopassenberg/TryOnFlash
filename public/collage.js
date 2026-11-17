// Collage für Flash-Sticker: wie ein Bogen, auf dem die Sticker locker, leicht gedreht und doch dicht liegen.
// Jeder Sticker wird mit seiner echten Form (Alpha des Bildes, gedreht, plus Abstand) in ein grobes Raster
// gelegt; der Platz ist die höchste Stelle, an der sich nichts überlappt, und dort die linkeste (Bottom-Left-Fill).
// Größe und Drehung kommen aus einem Zufall, der aus der ID des Flashes entsteht: bei jedem Öffnen gleich.

const CELL = 6; // Rastergröße in px

function seeded(str) { // mulberry32 aus einem String-Hash
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const loaded = new Map();
function load(src) {
  if (!loaded.has(src)) loaded.set(src, new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; }));
  return loaded.get(src);
}

// items: [{ id, src, fixed? }]; fixed = { x, y, w, h, rot } bleibt, wo es ist (vom Nutzer verschoben oder schon gelegt).
// Neue Sticker werden nach Größe sortiert (große zuerst) in die freien Stellen gelegt: das nutzt den Platz am besten.
// returns [{ id, x, y, w, h, rot }] and the total height (px)
export async function layoutCollage(items, width, opts = {}) {
  const gap = opts.gap ?? (width < 520 ? 6 : 10), perRow = opts.perRow ?? (width < 520 ? 2.3 : width < 900 ? 3.3 : 4.4);
  const cols = Math.max(4, Math.floor(width / CELL)), unit = width / perRow;
  const rows = []; const row = y => rows[y] || (rows[y] = new Uint8Array(cols));
  const out = [];
  const prepared = [];
  for (const it of items) { const img = await load(it.src).catch(() => null); if (img) prepared.push({ it, img, area: img.naturalWidth * img.naturalHeight }); }
  const wide = p => p.img.naturalWidth / p.img.naturalHeight > 2.2 ? 1 : 0; // breite Motive zuerst, die brauchen die längsten freien Strecken
  const ordered = [...prepared.filter(p => p.it.fixed), ...prepared.filter(p => !p.it.fixed).sort((a, b) => wide(b) - wide(a))];
  for (const { it, img } of ordered) {
    const rnd = seeded(it.id), ar = img.naturalWidth / img.naturalHeight, F = it.fixed;
    // gleiche „Masse“ für alle: Fläche statt Breite angleichen, dazu etwas Zufall; sehr breite Motive dürfen breiter sein
    const s = unit * (.86 + .26 * rnd()) * (ar > 2.2 ? 1.25 : 1);
    let w = F ? F.w : s * Math.sqrt(ar), h = F ? F.h : s / Math.sqrt(ar);
    const maxW = width * .96; if (!F && w > maxW) { h *= maxW / w; w = maxW; }
    const r0 = (rnd() * 2 - 1) * 7, rot = (F ? F.rot : r0) * Math.PI / 180;
    // gedrehte Form ins Raster legen, um den Abstand erweitert
    const bw = Math.abs(w * Math.cos(rot)) + Math.abs(h * Math.sin(rot)), bh = Math.abs(w * Math.sin(rot)) + Math.abs(h * Math.cos(rot));
    const g = Math.ceil(gap / CELL), mw = Math.ceil(bw / CELL) + 2 * g, mh = Math.ceil(bh / CELL) + 2 * g;
    const c = Object.assign(document.createElement("canvas"), { width: mw, height: mh }), x = c.getContext("2d", { willReadFrequently: true });
    x.translate(mw / 2, mh / 2); x.rotate(rot); x.drawImage(img, -w / CELL / 2, -h / CELL / 2, w / CELL, h / CELL);
    const a = x.getImageData(0, 0, mw, mh).data, solid = new Uint8Array(mw * mh);
    for (let i = 0; i < mw * mh; i++) solid[i] = a[i * 4 + 3] > 24 ? 1 : 0;
    const mask = []; // Abstand: jede gefüllte Zelle wächst um g Zellen (Kreis)
    const grown = new Uint8Array(mw * mh);
    for (let y = 0; y < mh; y++) for (let xx = 0; xx < mw; xx++) if (solid[y * mw + xx])
      for (let dy = -g; dy <= g; dy++) for (let dx = -g; dx <= g; dx++) if (dx * dx + dy * dy <= g * g) {
        const yy = y + dy, xq = xx + dx; if (yy >= 0 && yy < mh && xq >= 0 && xq < mw) grown[yy * mw + xq] = 1; }
    for (let i = 0; i < mw * mh; i++) if (grown[i]) mask.push(i % mw, (i / mw) | 0);
    const fits = (px, py) => { for (let k = 0; k < mask.length; k += 2) { const cx = px + mask[k]; if (cx < 0 || cx >= cols) return false; if (row(py + mask[k + 1])[cx]) return false; } return true; };
    let best = null;
    const xMax = cols - mw + g; // die äußere Abstandszone darf über den Rand ragen
    if (F) best = [Math.round((F.x + F.w / 2) / CELL - mw / 2), Math.round((F.y + F.h / 2) / CELL - mh / 2)];
    for (let py = -g; !best; py++) {
      // pro Zeile in zufälliger Reihenfolge der Startspalte suchen, sonst klebt alles links
      const start = Math.floor(rnd() * Math.max(1, xMax + g)), span = xMax + g + 1;
      for (let k = 0; k < span; k++) { const px = ((start + k) % span) - g; if (fits(px, py)) { best = [px, py]; break; } }
      if (py > 4000) break;
    }
    if (!best) continue;
    const [px, py] = best;
    for (let k = 0; k < mask.length; k += 2) { const cx = px + mask[k], cy = py + mask[k + 1]; if (cx >= 0 && cx < cols && cy >= 0) row(cy)[cx] = 1; }
    if (F) { out.push({ id: it.id, ...F }); continue; }
    const cxp = (px + mw / 2) * CELL, cyp = (py + mh / 2) * CELL;
    out.push({ id: it.id, x: cxp - w / 2, y: cyp - h / 2, w, h, rot: rot * 180 / Math.PI });
  }
  let height = 0; for (const o of out) height = Math.max(height, o.y + o.h / 2 + Math.max(o.w, o.h) / 2 + 8);
  return { items: out, height };
}
