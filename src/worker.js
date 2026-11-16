// Static site from public/ plus one route: /hf/* serves the depth model's files from our own domain.
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/hf/")) return modelFile(url);
    return env.ASSETS.fetch(req);
  },
};

// Same-origin mirror for the studio's depth model. Hugging Face redirects file downloads to another
// domain, which Safari can refuse ("Load failed"); fetching here and streaming it back avoids that.
// Only this one model may pass, so the route is not an open proxy. Cloudflare caches the files.
const MODEL_PREFIX = "onnx-community/depth-anything-v2-small/resolve/";
async function modelFile(url) {
  const path = url.pathname.slice("/hf/".length);
  if (!path.startsWith(MODEL_PREFIX) || path.includes("..")) return json({ error: "not_allowed" }, 404);
  const r = await fetch(`https://huggingface.co/${path}`, { redirect: "follow", cf: { cacheEverything: true, cacheTtl: 2592000 } });
  const headers = new Headers({ "Content-Type": r.headers.get("content-type") || "application/octet-stream", "Cache-Control": "public, max-age=2592000" });
  const len = r.headers.get("content-length"); if (len) headers.set("Content-Length", len);
  return new Response(r.body, { status: r.status, headers });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
}
