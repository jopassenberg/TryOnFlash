// MediaPipe (Haut-Segmentierung, Hand, Körper) in einem eigenen Thread. Laden und Kompilieren dieser Modelle hat
// die Seite vorher mehrere Sekunden eingefroren. Klassischer Worker (kein type: module), weil MediaPipe seinen
// WebAssembly-Lader per importScripts nachlädt; das Bundle selbst kommt per dynamischem import().
const VISION = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/vision_bundle.mjs";
const VISION_WASM = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.1.1/wasm";
let V = null, fs = null, seg = null, hand = null, pose = null;
async function init() { if (!V) { V = await import(VISION); fs = await V.FilesetResolver.forVisionTasks(VISION_WASM); } }
const image = m => new ImageData(new Uint8ClampedArray(m.buf), m.w, m.h);

onmessage = async ({ data: m }) => {
  try {
    await init();
    if (m.type === "seg") {
      seg ||= await V.ImageSegmenter.createFromOptions(fs, { baseOptions: { modelAssetPath: m.model }, runningMode: "IMAGE", outputCategoryMask: false, outputConfidenceMasks: true });
      const res = seg.segment(image(m)), cm = res.confidenceMasks, cw = cm[0].width, ch = cm[0].height;
      const out = {}; for (const [k, i] of Object.entries(m.classes)) out[k] = cm[i].getAsFloat32Array().slice();
      cm.forEach(x => x.close()); res.close?.();
      if (m.free) { seg.close(); seg = null; } // Handy: ein Modell nach dem anderen
      postMessage({ type: "done", masks: out, cw, ch }, Object.values(out).map(a => a.buffer));
    }
    if (m.type === "body") {
      const img = image(m), B = { hands: [], pose: null };
      try {
        hand ||= await V.HandLandmarker.createFromOptions(fs, { baseOptions: { modelAssetPath: m.hand }, runningMode: "IMAGE", numHands: 2 });
        const r = hand.detect(img); B.hands = (r.landmarks || []).map((l, i) => ({ img: l, world: r.worldLandmarks[i] }));
      } catch (e) { console.warn("hand", e); }
      if (m.free && hand) { hand.close(); hand = null; }
      try {
        pose ||= await V.PoseLandmarker.createFromOptions(fs, { baseOptions: { modelAssetPath: m.pose }, runningMode: "IMAGE", numPoses: 1 });
        const r = pose.detect(img); if (r.landmarks?.[0]) B.pose = { img: r.landmarks[0], world: r.worldLandmarks[0] };
      } catch (e) { console.warn("pose", e); }
      if (m.free && pose) { pose.close(); pose = null; }
      postMessage({ type: "done", body: JSON.parse(JSON.stringify(B)) });
    }
  } catch (e) { postMessage({ type: "error", message: String(e?.message || e) }); }
};
