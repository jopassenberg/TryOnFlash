// Tiefenschätzung in einem eigenen Thread: Laden, Kompilieren und Rechnen des Modells blockieren so nie die Seite
// (Animationen und Eingaben bleiben flüssig). Auf dem Handy beendet die App den Worker nach dem Scan – damit ist
// der komplette Speicher des Modells wieder frei, was ein dispose() im Hauptthread nicht schafft.
const TRANSFORMERS = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2/dist/transformers.min.js";
const MODEL = "onnx-community/depth-anything-v2-small";
let pipe = null, device = null, cfg = {};

const progress = p => { if (p.status === "progress" && p.total) postMessage({ type: "progress", p: { status: p.status, file: p.file, loaded: p.loaded, total: p.total } }); };
async function make(dev) {
  const { pipeline, env } = await import(TRANSFORMERS);
  if (cfg.remote) env.remoteHost = cfg.remote; // Modelldateien über die eigene Domain (Safari mag die Weiterleitung von Hugging Face nicht)
  device = dev;
  return pipeline("depth-estimation", MODEL, { ...(dev === "webgpu" ? { device: "webgpu", dtype: "fp16" } : { dtype: "q8" }), progress_callback: progress });
}
async function get() {
  if (pipe) return pipe;
  // Handy: CPU-Pfad (quantisiert), braucht viel weniger Speicher als eine WebGPU-Sitzung
  const adapter = !cfg.mobile && self.navigator?.gpu ? await navigator.gpu.requestAdapter().catch(() => null) : null;
  if (adapter?.features?.has("shader-f16")) { try { return (pipe = await make("webgpu")); } catch (e) { console.warn("WebGPU depth unavailable, using CPU", e); } }
  return (pipe = await make("wasm"));
}
function sized(p) { const ip = p.processor?.image_processor, s = cfg.sides?.[device] || 518; if (ip?.size) ip.size = { width: s, height: s }; return p; }
function toF32(d) { // je nach Backend float32, float16 oder rohe Halbfloat-Bits
  if (d instanceof Float32Array) return d;
  if (typeof Float16Array !== "undefined" && d instanceof Float16Array) return Float32Array.from(d);
  if (d instanceof Uint16Array) {
    const out = new Float32Array(d.length);
    for (let i = 0; i < d.length; i++) { const h = d[i], s = h & 0x8000 ? -1 : 1, e = (h >> 10) & 31, f = h & 1023;
      out[i] = s * (e === 0 ? f * 2 ** -24 : e === 31 ? (f ? NaN : Infinity) : (1 + f / 1024) * 2 ** (e - 15)); }
    return out;
  }
  return Float32Array.from(d, Number);
}

onmessage = async ({ data: m }) => {
  try {
    if (m.cfg) cfg = m.cfg;
    if (m.type === "load") { await get(); postMessage({ type: "loaded", device }); return; }
    if (m.type === "run") {
      const { RawImage } = await import(TRANSFORMERS);
      const img = new RawImage(new Uint8ClampedArray(m.buf), m.w, m.h, 4);
      let out;
      try { out = await sized(await get())(img); }
      catch (e) { // manche GPUs scheitern erst beim Rechnen: dann auf der CPU
        if (device !== "webgpu") throw e;
        console.warn("WebGPU depth failed while running, retrying on CPU", e);
        pipe = await make("wasm"); out = await sized(pipe)(img);
      }
      const t = out.predicted_depth, data = toF32(t.data).slice();
      postMessage({ type: "done", data, dims: Array.from(t.dims), device }, [data.buffer]);
    }
  } catch (e) { postMessage({ type: "error", message: String(e?.message || e) }); }
};
