// Stencit zweisprachig: Deutsch ist die Quelle im Code, Englisch wird beim Anzeigen ersetzt.
// Sprache: gespeicherte Wahl (Konto-Blatt) > Gerätesprache (de* → Deutsch, sonst Englisch).
// Ein MutationObserver übersetzt jeden Text und jedes Attribut (aria-label, placeholder, title, alt), sobald es im DOM
// erscheint – auch alles, was die App später per innerHTML/textContent erzeugt. Nur exakte Treffer und Muster unten,
// Nutzerinhalte (Namen, Notizen) bleiben unberührt.

export const LANG_KEY = "stencit-lang";
export function getLang() {
  let v = null; try { v = localStorage.getItem(LANG_KEY); } catch {}
  if (v === "de" || v === "en") return v;
  return (navigator.languages?.[0] || navigator.language || "en").toLowerCase().startsWith("de") ? "de" : "en";
}
export function setLang(v) { try { localStorage.setItem(LANG_KEY, v); } catch {} location.reload(); }

const EN = {
  // Kopf, Schritte, Umschalter
  "Schritte": "Steps", "Foto": "Photo", "Analyse": "Scan", "Platzieren": "Place", "Stechen": "Ink", "Studio": "Studio", "Flashes": "Flashes",
  "Konto": "Account", "Dein Konto": "Your account", "Anmelden": "Sign in", "Abmelden": "Sign out", "Ansicht": "View",
  // Kamera / Start
  "Auslöser tippen: Kamera an": "Tap the shutter to start the camera", "Blitz": "Flash", "Aus Galerie": "From library", "Kamera wechseln": "Switch camera",
  "Foto aufnehmen": "Take photo", "Stencil aus den Flashes wählen": "Choose a stencil from your Flashes", "Stencil entfernen": "Remove stencil",
  "Flash anprobieren": "Try on flash", "Kein Kamerazugriff · im Browser erlauben": "No camera access · allow it in your browser",
  "Kamera nicht verfügbar · Galerie nutzen": "Camera not available · use your library",
  "Blitz geht hier nicht: Safari gibt die Lampe nicht frei. Mehr Licht oder Frontkamera nutzen.": "Flash isn’t available here: Safari doesn’t allow the torch. Use more light or the front camera.",
  "Bildschirm-Blitz an": "Screen flash on", "Blitz an": "Flash on", "Bild nicht lesbar": "Can’t read this image", "Motiv nicht lesbar": "Can’t read this design",
  // Scan
  "Scan wird vorbereitet …": "Preparing scan …", "Misst die Tiefe …": "Measuring depth …", "Erkennt deine Haut …": "Detecting your skin …",
  "Formt deinen Arm in 3D …": "Shaping your arm in 3D …", "Misst die Größe …": "Measuring size …", "Fast fertig …": "Almost done …", "Wird gestochen …": "Inking …",
  "Kein Arm erkannt – Arm größer und gut beleuchtet ins Bild": "No arm found – fill the frame with your arm in good light",
  "zu wenig Speicher": "not enough memory", "Download fehlgeschlagen": "download failed",
  "Modell laden": "Loading model", "Modelle laden": "Loading models", "Tiefe berechnen": "Depth", "Haut erkennen": "Skin", "3D-Modell": "3D model", "Maßstab": "Scale",
  "Tiefe": "Depth", "Haut-Modell": "Skin model", "Haut aufräumen": "Skin cleanup", "Hand/Pose": "Hand/pose", "Scan-Ende": "Scan end", "Motiv platzieren": "Placing design",
  // Platzieren / Dock
  "Motiv hinzufügen": "Add a design", "Ziehen · zwei Finger drehen und zoomen": "Drag · two fingers to rotate and zoom",
  "Motiv tauschen": "Swap design", "Motiv tauschen oder hinzufügen": "Swap or add a design", "Neues Foto": "New photo", "Zurück zum Platzieren": "Back to placing",
  "Vorher / Nachher": "Before / after", "Speichern": "Save", "Zusammenfassung": "Summary", "Drehung": "Rotation", "Stelle": "Spot",
  "Breite an der Stelle": "Width at this spot", "Mit Maßband nachmessen und eintragen, dann stimmt die Größe genau.": "Measure with a tape and enter it for an exact size.",
  "Selbst gemessen": "Measured by you", "Hand erkannt": "Hand detected", "Annahme: Armbreite 7,5 cm": "Assumed: arm width 7.5 cm", "Körperproportionen": "Body proportions",
  "Unterarm": "Forearm", "Oberarm": "Upper arm", "Oberschenkel": "Thigh", "Unterschenkel": "Lower leg", "Oberkörper": "Torso", "Schulter": "Shoulder",
  // Zusammenfassung
  "für Linien": "for lines", "für Flächen": "for fills", "für kleine Flächen": "for small fills", "für Schatten": "for shading",
  "Schwarz": "Black", "Grau": "Grey", "Rot": "Red", "Orange": "Orange", "Gelb": "Yellow", "Grün": "Green", "Türkis": "Turquoise", "Blau": "Blue", "Lila": "Purple",
  "Violett": "Violet", "Pink": "Pink", "Braun": "Brown", "Weiß": "White", "Flash-Sheet drucken": "Print flash sheet",
  // Editor
  "Anpassen": "Adjust", "Übernehmen": "Apply", "Abbrechen": "Cancel", "Fertig": "Done", "Stil": "Style", "Original": "Original", "Graustufen": "Greyscale",
  "Ohne Schatten": "No shading", "Nur Linien": "Lines only", "Farben und Schatten wie im Bild": "Colours and shading as in the image",
  "Farben bleiben, weiche Schatten fallen weg": "Colours stay, soft shading is removed", "ohne Farbe, Schatten werden grau": "no colour, shading turns grey",
  "nur die Konturen in Schwarz, z. B. als Vorlage": "only the outlines in black, e.g. as a template",
  "Hintergrund entfernen": "Remove background", "Papier oder Haut um das Motiv wird durchsichtig": "Paper or skin around the design becomes transparent",
  "Grün umrandet = erkanntes Motiv": "Green outline = detected design", "Motiv erkannt · mit Lasso oder Radierer anpassen": "Design detected · adjust with lasso or eraser",
  "Alles außerhalb fällt weg. Passt es nicht? Anpassen.": "Everything outside is removed. Not quite right? Adjust.",
  "Auswahl anpassen: Lasso, Radierer, Pinsel": "Adjust selection: lasso, eraser, brush", "Feinschliff: Radierer, Pinsel, zoomen": "Fine-tune: eraser, brush, zoom",
  "Auswahl ist leer": "Selection is empty", "Lasso": "Lasso", "Radierer": "Eraser", "Pinsel": "Brush", "Pinselgröße": "Brush size", "Rückgängig": "Undo", "Einpassen": "Fit",
  "Bereiche": "Areas", "Tattoo umfahren": "Trace the tattoo", "Wegwischen, was nicht dazugehört": "Erase what doesn’t belong", "Fehlende Teile zurückmalen": "Paint back missing parts",
  // Flashes
  "Flashes hochladen": "Upload flashes", "Neu anordnen": "Rearrange", "Auswählen": "Select", "Alle": "All", "Keine": "None", "Auswahl beenden": "End selection",
  "Link teilen": "Share link", "Geteilte Links": "Shared links", "Anprobieren": "Try on", "Löschen": "Delete", "Per Link teilen": "Share via link", "Bearbeiten": "Edit",
  "Flash-Sheet": "Flash sheet", "Schließen": "Close", "Flash": "Flash",
  // Teilen
  "Gültig für": "Valid for", "Kürzer": "Shorter", "Länger": "Longer", "Unbegrenzt": "Unlimited", "unbegrenzt": "unlimited",
  "Speichern erlauben": "Allow saving", "Kunde darf die Flashes herunterladen": "Client may download the flashes",
  "Nachricht an deinen Kunden (optional)": "Message to your client (optional)",
  "Die Flashes werden auf diesem Gerät verschlüsselt. Der Schlüssel steckt nur im Link, unser Server sieht die Bilder nie. Nach Ablauf wird alles gelöscht.":
    "Your flashes are encrypted on this device. The key lives only in the link – our server never sees the images. Everything is deleted when it expires.",
  "Link erstellen": "Create link", "Verschlüsselt …": "Encrypting …", "Nochmal versuchen": "Try again", "Link ist bereit": "Link is ready", "Kopieren": "Copy",
  "Link kopieren": "Copy link", "Senden": "Send", "Link beenden": "End link",
  "Teilen ist auf dem Server noch nicht eingerichtet.": "Sharing isn’t set up on the server yet.", "Zu groß für einen Link. Wähle weniger Flashes.": "Too large for one link. Choose fewer flashes.",
  "Gültig, bis du ihn beendest (unter „Geteilte Links“).": "Valid until you end it (under “Shared links”).", "Flashes von deinem Artist": "Flashes from your artist",
  "Name und Profilbild": "Name and profile picture", "Erscheinen als kleiner Tag an deinen Stencils": "Shown as a small tag on your stencils",
  "Als Tag an deinen Stencils · ändern": "Shown as a tag on your stencils · edit", "Dein Name oder Studio": "Your name or studio", "Profilbild wählen": "Choose profile picture",
  // Flash-Sheet
  "Papier": "Paper", "Hochformat": "Portrait", "Querformat": "Landscape", "Größen": "Sizes", "Gewählt": "Selected", "Größe · längste Seite": "Size · longest side",
  "Kleiner": "Smaller", "Größer": "Larger", "Größe beschriften": "Label sizes", "Tag mit Breite × Höhe unter jedem Stencil": "Width × height tag under each stencil",
  "Gespiegelt": "Mirrored", "Für Thermo-Stencil und Umdruckpapier": "For thermal stencil and transfer paper", "Drucken oder senden": "Print or send", "Nichts zu drucken": "Nothing to print",
  // Konto
  "Kostenlos weitermachen": "Keep going for free", "Dein erstes Tattoo war gratis. Mit einem kostenlosen Konto geht es weiter:": "Your first tattoo was on us. Keep going with a free account:",
  "Mit einem kostenlosen Konto bekommst du:": "With a free account you get:", "Flashes per Link teilen": "Share flashes via link",
  "Deine E-Mail-Adresse": "Your email address", "Anmelde-Mail senden": "Send sign-in email", "Später": "Later", "Wird gesendet …": "Sending …",
  "Kein Passwort nötig. Fotos deiner Haut bleiben immer nur auf deinem Gerät.": "No password needed. Photos of your skin always stay on your device.",
  "Schau in dein Postfach": "Check your inbox", "Andere Adresse": "Different address", "Prüfe …": "Checking …", "oder mit E-Mail": "or with email", "oder": "or", "name@beispiel.de": "name@example.com", "E-Mail": "Email", "Weiter mit Google": "Continue with Google", "Weiter mit E-Mail": "Continue with email",
  "Code stimmt nicht": "That code isn’t right", "Code abgelaufen · neu senden": "Code expired · send a new one", "Link konnte nicht gesendet werden": "Couldn’t send the email",
  "Zu viele Versuche · kurz warten": "Too many attempts · wait a moment", "Google-Anmeldung hat nicht geklappt": "Google sign-in didn’t work",
  "Angemeldet": "Signed in", "Neuen Code senden": "Send new code", "Keinen Code bekommen?": "Didn’t get a code?", "Neu senden": "Resend", "Ändern": "Change", "Der Code gilt 10 Minuten": "The code is valid for 10 minutes", "Gib den 6‑stelligen Code aus der Mail ein – oder tipp dort auf den Link.": "Enter the 6-digit code from the email – or tap the link in it.", "Neuer Code ist unterwegs": "New code is on its way", "Code stimmt nicht oder ist abgelaufen": "Wrong or expired code", "Code stimmt nicht · versuch's noch mal": "That code isn’t right · try again", "Code abgelaufen · fordere einen neuen an": "Code expired · request a new one", "Mail konnte nicht gesendet werden": "Couldn’t send the email", "6-stelliger Code": "6-digit code", "Abgemeldet": "Signed out", "Konto gerade nicht erreichbar": "Account not reachable right now",
  "Konto gerade nicht erreichbar · später nochmal": "Account not reachable · try again later", "Sichern gerade nicht möglich": "Can’t back up right now",
  "Unlimited": "Unlimited", "aktiv": "active", "Freie Motive diesen Monat": "Free designs this month", "Tokens": "Tokens", "Gesicherte Stencils": "Backed-up stencils",
  "Tokens & Unlimited – bald": "Tokens & Unlimited – coming soon",
  "Deine freien Motive für diesen Monat sind aufgebraucht. Bereits angeprobierte Motive kannst du weiter frei verwenden.": "You’ve used your free designs for this month. Designs you’ve already tried on stay free to use.",
  "Sprache": "Language",
  // Link-Seite (Kunde)
  "Verschlüsselt": "Encrypted", "Flashes werden entschlüsselt …": "Decrypting flashes …", "Auf der Haut ansehen": "See it on your skin", "Sichern": "Save",
  "Link unvollständig": "Incomplete link", "Bitte den Link ganz kopieren, inklusive allem nach dem #-Zeichen.": "Please copy the whole link, including everything after the # sign.",
  "Keine Verbindung": "No connection", "Bitte später noch einmal öffnen.": "Please try again later.", "Link abgelaufen": "Link expired",
  "Dieser Link ist abgelaufen oder wurde vom Artist beendet. Frag einfach nach einem neuen.": "This link has expired or was ended by the artist. Just ask for a new one.",
  "Die Zeit für diesen Link ist um. Frag einfach nach einem neuen.": "This link’s time is up. Just ask for a new one.",
  "Link beschädigt": "Damaged link", "Die Flashes ließen sich nicht entschlüsseln. Bitte den Link ganz kopieren.": "The flashes couldn’t be decrypted. Please copy the whole link.",
};

// Texte mit Zahlen/Namen
const EN_RX = [
  [/^(\d+) ausgewählt$/, "$1 selected"],
  [/^Link für (\d+) Flash(es)?$/, (m, n) => `Link for ${n} flash${n === "1" ? "" : "es"}`],
  [/^(\d+) Flash(es)? · noch (.+)$/, (m, n, _, t) => `${n} flash${n === "1" ? "" : "es"} · ${en(t)} left`],
  [/^· noch (.+)$/, (m, t) => `· ${en(t)} left`],
  [/^Scan wird geladen · (\d+) %$/, "Loading scan · $1 %"],
  [/^Absturz bei: (.+)$/, (m, s) => `Crashed at: ${EN[s] || s}`],
  [/^(\d+) neue Motive pro Monat anprobieren$/, "Try on $1 new designs per month"],
  [/^Bis zu (\d+) Stencils gesichert, auf allen Geräten$/, "Up to $1 stencils backed up, on all your devices"],
  [/^Free-Konto: (\d+) Stencils gesichert, weitere bleiben auf diesem Gerät$/, "Free account: $1 stencils backed up, more stay on this device"],
  [/^Free-Konto: (\d+) Stencils gesichert · dieses bleibt auf dem Gerät$/, "Free account: $1 stencils backed up · this one stays on this device"],
  [/^(\d+) von (\d+)$/, "$1 of $2"], [/^(\d+) von (\d+)( .*)?$/, "$1 of $2$3"],
  [/^Wir haben dir an$/, "We sent an email to"],
  [/^eine Mail geschickt\. Tipp darin auf den Link – oder gib hier den Code ein, falls einer drinsteht\.$/, ". Tap the link in it – or enter the code here if there is one."],
  [/^einen 6‑stelligen Code geschickt\. Gib ihn hier ein – oder tipp in der Mail auf den Link\. Er gilt 10 Minuten\.$/, "a 6-digit code. Enter it here – or tap the link in the email. It’s valid for 10 minutes."],
  [/^Noch (\d+) Ziffern? fehlen$/, (_, n) => `${n} more digit${n === "1" ? "" : "s"} needed`],
  [/^Neu senden · (\d:\d+)$/, (_, n) => `Resend · ${n}`],
  [/^Gültig bis (.+) Uhr, danach gelöscht\. Du kannst ihn jederzeit früher beenden\.$/, "Valid until $1, then deleted. You can end it earlier at any time."],
  [/^(\d+) Seiten? · im Druckdialog „100 %“ wählen$/, (m, n) => `${n} page${n === "1" ? "" : "s"} · choose “100 %” in the print dialog`],
  [/^(\d+) Seiten? · (.+) passt nicht auf (\S+)( hoch, Querformat probieren)? · im Druckdialog „100 %“ wählen$/, (m, n, list, p, hoch) =>
    `${n} page${n === "1" ? "" : "s"} · ${list} doesn’t fit on ${p}${hoch ? " portrait – try landscape" : ""} · choose “100 %” in the print dialog`],
  [/^Stencit · Flash-Sheet · (\S+)( · gespiegelt)?$/, (m, p, g) => `Stencit · Flash sheet · ${p}${g ? " · mirrored" : ""}`],
  [/^5 cm · mit 100 % drucken$/, "5 cm · print at 100 %"],
  [/^(.+) anprobieren$/, (m, n) => `Try on ${n}`],
  [/^(.+) anprobieren · tippen zum Wechseln$/, (m, n) => `Try on ${n} · tap to change`],
  [/^Link konnte nicht erstellt werden\. Bitte nochmal versuchen\. \((.*)\)$/, "Couldn’t create the link. Please try again. ($1)"],
  [/^Maßstab · (.+)$/, (m, p) => `Scale · ${EN[p] || p}`],
  [/^(.+) · (.+)$/, (m, a, b) => (EN[a] && EN[b] ? `${EN[a]} · ${EN[b]}` : null)],
];
// Zeitangaben wie „2 Tage 3 Std“, „5 Std 10 Min“, „1 Tag 0 Std“
function en(t) {
  return t.replace(/(\d+) Tage?n?/g, (m, n) => `${n} day${n === "1" ? "" : "s"}`).replace(/ Std/g, " h").replace(/ Min/g, " min");
}
EN_RX.push([/^(\d+ Tage?n? \d+ Std|\d+ Std \d+ Min|\d+ Min|\d+ Std|\d+ Tage?)$/, (m, t) => en(t)]);

function tr(s) {
  const k = s.trim(); if (!k || k.length > 400) return null;
  let v = EN[k];
  if (v == null) for (const [rx, rep] of EN_RX) { if (!rx.test(k)) continue; const r = k.replace(rx, rep); if (r && r !== "null") { v = r; break; } }
  return v == null || v === k ? null : s.replace(k, v);
}
const ATTRS = ["aria-label", "placeholder", "title", "alt"];
function trNode(n) {
  if (n.nodeType === 3) { const p = n.parentNode; if (!p || /^(SCRIPT|STYLE|TEXTAREA)$/.test(p.nodeName) || p.isContentEditable) return; const v = tr(n.data); if (v != null) n.data = v; return; }
  if (n.nodeType !== 1) return;
  for (const a of ATTRS) if (n.hasAttribute(a)) { const v = tr(n.getAttribute(a)); if (v != null) n.setAttribute(a, v); }
}
function trTree(root) {
  if (root.nodeType === 3) return trNode(root);
  if (root.nodeType !== 1 || /^(SCRIPT|STYLE)$/.test(root.nodeName)) return;
  trNode(root);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = w.nextNode(); n; n = w.nextNode()) trNode(n);
}
export function startI18n() {
  const lang = getLang(); document.documentElement.lang = lang;
  if (lang !== "en") return lang;
  document.title = document.title.replace("Studio", "Studio").replace("Flashes · Stencit", "Flashes · Stencit");
  trTree(document.body);
  new MutationObserver(ms => { for (const m of ms) {
    if (m.type === "childList") m.addedNodes.forEach(trTree);
    else if (m.type === "characterData") trNode(m.target);
    else if (m.type === "attributes") trNode(m.target);
  } }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  return lang;
}
// für Texte, die nicht im DOM landen (z. B. confirm/alert, Canvas)
export const t = s => (getLang() === "en" ? tr(s) ?? s : s);
