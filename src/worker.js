// Static site from public/ plus a few routes:
//   /hf/*            the depth model's files from our own domain
//   /mp/*            the MediaPipe models (skin, hand, pose) from our own domain – no visitor IP reaches Google
//   /api/share       store an encrypted flash share for a limited time (POST)
//   /api/share/:id   read it (GET) or end it early (DELETE)
//   /api/share/:id/preview  optional chat preview (title, text, image) – NOT encrypted, the artist opts in (POST)
//   /f/:id           the page a client opens (public/share.html); the key sits in the URL fragment
//   /f/:id/og.jpg    the preview image for chat apps (iMessage, WhatsApp …)
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    // Nur eine Adresse: die technische workers.dev-Adresse leitet dauerhaft auf stencit.com um
    // (Google-Anmeldung, Kamera-Erlaubnis und Speicher hängen an der Adresse). Vorschau-Versionen bleiben erreichbar.
    // Nur https://stencit.com ist bei Google als Ursprung erlaubt: workers.dev, www und http dorthin umleiten
    if (url.hostname === "tryonflash.jopassenberg.workers.dev" || url.hostname === "www.stencit.com" || (url.hostname === "stencit.com" && url.protocol === "http:"))
      return Response.redirect("https://stencit.com" + url.pathname + url.search + url.hash, 301);
    if (url.pathname.startsWith("/hf/")) return modelFile(url);
    if (url.pathname.startsWith("/mp/")) return mediapipeFile(url);
    if (url.pathname === "/api/share" || url.pathname.startsWith("/api/share/")) return share(req, env, url);
    const og = url.pathname.match(/^\/f\/([A-Za-z0-9_-]{16,64})\/og\.jpg$/);
    if (og) return previewImage(env, og[1]);
    const f = url.pathname.match(/^\/f\/([A-Za-z0-9_-]{16,64})\/?$/);
    if (f) {
      // Cloudflare liefert HTML-Dateien ohne Endung aus (/share.html leitet auf /share um)
      const page = await env.ASSETS.fetch(new Request(new URL("/share", url), { headers: req.headers }));
      const headers = new Headers(page.headers);
      for (const [k, v] of Object.entries(PRIVATE)) headers.set(k, v);
      const p = env.SHARES ? await env.SHARES.get("p:" + f[1], { type: "json" }).catch(() => null) : null;
      return new HTMLRewriter().on("head", { element: el => el.append(ogTags(url, f[1], p), { html: true }) })
        .transform(new Response(page.body, { status: page.status, headers }));
    }
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

// Same idea for the three MediaPipe models; only these exact files may pass.
const MP_FILES = new Set([
  "image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite",
  "hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task",
  "pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.task",
]);
async function mediapipeFile(url) {
  const path = url.pathname.slice("/mp/".length);
  if (!MP_FILES.has(path)) return json({ error: "not_allowed" }, 404);
  const r = await fetch(`https://storage.googleapis.com/mediapipe-models/${path}`, { cf: { cacheEverything: true, cacheTtl: 2592000 } });
  const headers = new Headers({ "Content-Type": r.headers.get("content-type") || "application/octet-stream", "Cache-Control": "public, max-age=2592000" });
  const len = r.headers.get("content-length"); if (len) headers.set("Content-Length", len);
  return new Response(r.body, { status: r.status, headers });
}

// ---------- Flash-Links ----------
// The browser encrypts the flashes (AES-GCM, 256 bit) before upload; the key never reaches us, it only
// lives in the link's #fragment. We store ciphertext under a random 128-bit id with a fixed lifetime
// (KV deletes it on its own), plus the hash of a separate delete token so the artist can end it early.
const TTLS = { 3600: "1 h", 86400: "24 h", 259200: "3 d", 604800: "7 d", 2592000: "30 d", 0: "bis beendet" };
const MAX_BYTES = 15 * 1024 * 1024;
const PRIVATE = { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Robots-Tag": "noindex, nofollow", "X-Content-Type-Options": "nosniff" };

async function share(req, env, url) {
  if (!env.SHARES) return json({ error: "not_configured" }, 503);
  const id = url.pathname.split("/")[3] || "";
  // Rate Limit für alles, was schreibt (neuer Link, Vorschau): pro IP-Adresse, siehe wrangler.jsonc
  if (req.method === "POST" && env.SHARE_LIMIT) {
    const { success } = await env.SHARE_LIMIT.limit({ key: req.headers.get("cf-connecting-ip") || "unknown" }).catch(() => ({ success: true }));
    if (!success) return json({ error: "rate_limited" }, 429);
  }
  if (req.method === "POST" && !id) {
    const ttl = Number(url.searchParams.get("ttl"));
    if (!url.searchParams.has("ttl") || !(ttl in TTLS)) return json({ error: "bad_ttl" }, 400);
    const len = Number(req.headers.get("content-length") || 0);
    if (len > MAX_BYTES) return json({ error: "too_large" }, 413);
    const body = await req.arrayBuffer();
    if (!body.byteLength || body.byteLength > MAX_BYTES) return json({ error: body.byteLength ? "too_large" : "empty" }, body.byteLength ? 413 : 400);
    const sid = token(16), del = token(24), exp = ttl ? Date.now() + ttl * 1000 : 0; // 0 = unbegrenzt, bis der Artist ihn beendet
    await env.SHARES.put("s:" + sid, body, { ...(ttl ? { expirationTtl: ttl } : {}), metadata: { exp, del: await sha256(del) } });
    return json({ id: sid, del, exp });
  }
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(id)) return json({ error: "not_found" }, 404);
  if (url.pathname.endsWith("/preview")) return savePreview(req, env, id);
  if (req.method === "GET") {
    const { value, metadata } = await env.SHARES.getWithMetadata("s:" + id, { type: "arrayBuffer" });
    if (!value || !metadata || (metadata.exp && metadata.exp < Date.now())) return json({ error: "expired" }, 404);
    return new Response(value, { headers: { ...PRIVATE, "Content-Type": "application/octet-stream", "X-Expires": String(metadata.exp) } });
  }
  if (req.method === "DELETE") {
    const { metadata } = await env.SHARES.getWithMetadata("s:" + id);
    if (!metadata) return json({ ok: true });
    if (metadata.del !== await sha256(req.headers.get("x-delete-token") || "")) return json({ error: "forbidden" }, 403);
    await env.SHARES.delete("s:" + id);
    await env.SHARES.delete("p:" + id);
    return json({ ok: true });
  }
  return json({ error: "method" }, 405);
}
function token(bytes) {
  const b = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function sha256(s) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(h)].map(x => x.toString(16).padStart(2, "0")).join("");
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...PRIVATE } });
}

// ---------- Link-Vorschau für Chat-Apps ----------
// Chat-Apps holen die Seite ohne #Schlüssel, sehen also nur, was hier unverschlüsselt liegt: Titel, Text und ein
// kleines Vorschaubild, die der Artist ausdrücklich freigibt. Ohne Freigabe nur ein neutraler Stencit-Text.
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
function ogTags(url, id, p) {
  const title = p?.title || "Flashes für dich – Stencit", desc = p?.desc || "Tippe, um die Flashes anzusehen und anzuprobieren.";
  let t = `<meta property="og:type" content="website"><meta property="og:site_name" content="Stencit"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta name="description" content="${esc(desc)}">`;
  if (p?.img) t += `<meta property="og:image" content="${url.origin}/f/${id}/og.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image">`;
  return t;
}
async function savePreview(req, env, id) {
  if (req.method !== "POST") return json({ error: "method" }, 405);
  const { metadata } = await env.SHARES.getWithMetadata("s:" + id);
  if (!metadata) return json({ error: "not_found" }, 404);
  if (metadata.del !== await sha256(req.headers.get("x-delete-token") || "")) return json({ error: "forbidden" }, 403);
  const b = await req.json().catch(() => null); if (!b) return json({ error: "bad" }, 400);
  const title = String(b.title || "").slice(0, 80), desc = String(b.desc || "").slice(0, 160), img = typeof b.img === "string" ? b.img : "";
  if (img && (img.length > 400000 || !/^[A-Za-z0-9+/=]+$/.test(img))) return json({ error: "bad_image" }, 400);
  const ttl = metadata.exp ? Math.max(60, Math.ceil((metadata.exp - Date.now()) / 1000)) : 0;
  await env.SHARES.put("p:" + id, JSON.stringify({ title, desc, img }), ttl ? { expirationTtl: ttl } : {});
  return json({ ok: true });
}
async function previewImage(env, id) {
  const p = env.SHARES ? await env.SHARES.get("p:" + id, { type: "json" }).catch(() => null) : null;
  if (!p?.img) return new Response("", { status: 404 });
  const bytes = Uint8Array.from(atob(p.img), c => c.charCodeAt(0));
  return new Response(bytes, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=300", "X-Content-Type-Options": "nosniff" } });
}
