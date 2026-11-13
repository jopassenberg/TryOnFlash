// Static site from public/ plus one API route:
// POST /api/ink  { image, design, mode }  ->  JPEG
// Sends the studio's composited crop (image) and the original flash (design) to an image-editing
// model on fal.ai and returns the refined crop. The API key lives only here, as the secret FAL_KEY.
const MODEL = "fal-ai/nano-banana-2/edit";
const MAX_DATA_URI = 4_000_000; // ~3 MB per image

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === "/api/ink") {
      if (req.method !== "POST") return json({ error: "method" }, 405);
      return ink(req, env);
    }
    return env.ASSETS.fetch(req);
  },
};

async function ink(req, env) {
  if (!env.FAL_KEY) return json({ error: "no_key" }, 503);
  if (env.INK_LIMIT) {
    const { success } = await env.INK_LIMIT.limit({ key: req.headers.get("cf-connecting-ip") || "anon" });
    if (!success) return json({ error: "rate_limited" }, 429);
  }
  let body;
  try { body = await req.json(); } catch { return json({ error: "bad_json" }, 400); }
  const { image, design, mode } = body || {};
  const isImg = s => typeof s === "string" && s.startsWith("data:image/") && s.length < MAX_DATA_URI;
  if (!isImg(image) || (design && !isImg(design))) return json({ error: "bad_image" }, 400);

  const r = await fetch(`https://fal.run/${MODEL}`, {
    method: "POST",
    headers: { Authorization: `Key ${env.FAL_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: prompt(mode === "fresh"),
      image_urls: design ? [image, design] : [image],
      num_images: 1, output_format: "jpeg", aspect_ratio: "auto", resolution: "1K",
    }),
  });
  if (!r.ok) return json({ error: "provider", status: r.status, detail: (await r.text()).slice(0, 300) }, 502);
  const out = await r.json();
  const src = out?.images?.[0]?.url;
  if (!src) return json({ error: "empty" }, 502);
  // Return the bytes ourselves so the page can draw them into a canvas without CORS issues
  if (src.startsWith("data:")) {
    const [meta, b64] = src.split(",");
    const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    return new Response(bytes, { headers: { "Content-Type": meta.slice(5).split(";")[0] || "image/jpeg", "Cache-Control": "no-store" } });
  }
  const img = await fetch(src);
  if (!img.ok) return json({ error: "provider_image", status: img.status }, 502);
  return new Response(img.body, { headers: { "Content-Type": img.headers.get("content-type") || "image/jpeg", "Cache-Control": "no-store" } });
}

function prompt(fresh) {
  return [
    "Image 1 is a close-up photo of skin with a tattoo design composited onto it.",
    `Turn it into a photo of a real, professionally done ${fresh ? "fresh tattoo, a few hours old, with slight redness and a little shine around the lines" : "fully healed tattoo"}:`,
    "the ink sits inside the skin, natural skin texture, pores and fine hairs visible through and over the ink,",
    "ink slightly soft at the edges, colours slightly muted like real tattoo ink, shading and lighting follow the curvature of the body.",
    "Keep the tattoo's exact design, linework, colours, size, position and orientation exactly as in image 1",
    "(image 2, if given, is the original flash design for reference).",
    "Do not change anything else: same skin tone, same body part, same background, same lighting, same framing and crop.",
  ].join(" ");
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
