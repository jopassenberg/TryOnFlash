// Static site from public/ plus a few routes:
//   /hf/*            the depth model's files from our own domain
//   /api/share       store an encrypted flash share for a limited time (POST)
//   /api/share/:id   read it (GET) or end it early (DELETE)
//   /f/:id           the page a client opens (public/share.html); the key sits in the URL fragment
export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/hf/")) return modelFile(url);
    if (url.pathname === "/api/share" || url.pathname.startsWith("/api/share/")) return share(req, env, url);
    if (/^\/f\/[A-Za-z0-9_-]{16,64}\/?$/.test(url.pathname)) {
      // Cloudflare liefert HTML-Dateien ohne Endung aus (/share.html leitet auf /share um)
      const page = await env.ASSETS.fetch(new Request(new URL("/share", url), { headers: req.headers }));
      const headers = new Headers(page.headers);
      for (const [k, v] of Object.entries(PRIVATE)) headers.set(k, v);
      return new Response(page.body, { status: page.status, headers });
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
