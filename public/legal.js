// Sprache wie in der App (gespeicherte Wahl, sonst Gerätesprache); Umschalten merkt sich die Wahl für die App mit.
(() => {
  let saved = null; try { saved = localStorage.getItem("stencit-lang"); } catch {}
  let lang = saved || ((navigator.language || "").toLowerCase().startsWith("de") ? "de" : "en");
  const show = l => {
    lang = l; document.documentElement.lang = l;
    document.querySelectorAll("main[data-lang]").forEach(m => m.hidden = m.dataset.lang !== l);
    const sw = document.querySelector(".lsw"); if (sw) sw.dataset.l = l;
    document.querySelectorAll(".lsw button").forEach(b => b.setAttribute("aria-checked", b.dataset.l === l));
    const h = document.querySelector(`main[data-lang="${l}"] h1`); if (h) document.title = h.textContent.replace(/­/g, "") + " · Stencit";
  };
  document.querySelectorAll(".lsw button").forEach(b => b.onclick = () => { try { localStorage.setItem("stencit-lang", b.dataset.l); } catch {} show(b.dataset.l); });
  show(lang);
})();
