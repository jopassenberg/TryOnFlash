# Flash Try-On

Interaktiver Tattoo-Try-On-Prototyp: Flash-Motiv wählen, Kamera an, das Motiv wird per Body-Tracking (MediaPipe Pose + Hand) auf die Haut gelegt. Enthält einen Konverter, der Fotos von Flash-Sheets in transparente PNGs verwandelt.

- Tracking: MediaPipe Pose/Hand für das Skelett, Körpersilhouette für das Arm-Profil (9 Messpunkte über die Tattoo-Höhe), Multiclass-Segmenter für Haut. Das Motiv erscheint nur auf Haut und verschwindet unter Kleidung.
- Alles läuft im Browser auf dem Gerät, keine Bilder verlassen das Handy.
- Kein Build-Schritt: `public/index.html` ist die ganze App.

## Lokal starten

```bash
python3 -m http.server 5173 --directory public
```

Dann http://localhost:5173 öffnen.

## Deployment

Der Cloudflare Worker `tryonflash` ist mit diesem Repo verbunden (Workers Builds). Er liefert nur die statischen Dateien aus `public/` aus, konfiguriert in `wrangler.jsonc`. Jeder Push auf `main` wird automatisch veröffentlicht.

## Studio (`/studio`) und KI-Finish

`/studio`: Foto vom Arm hochladen → Tiefe (Depth Anything V2) + Haut (MediaPipe) → Motiv oberflächentreu
platzieren → „Stechen“ (lokales Rendering). Alles im Browser.

„KI-Finish“ schickt nur den Bildausschnitt ums Tattoo plus das Flash an `POST /api/ink` (`src/worker.js`),
der Worker ruft fal.ai (`fal-ai/nano-banana-2/edit`) auf. Das Ergebnis wird im Studio nur im Tattoo-Bereich
eingeblendet.

Einrichtung:
1. Account auf https://fal.ai, Guthaben aufladen, unter *Keys* einen API-Key anlegen.
2. Cloudflare → Workers & Pages → `tryonflash` → Settings → Variables and Secrets → **Add**:
   Typ **Secret**, Name `FAL_KEY`, Wert = der fal-Key → Deploy.
3. Ohne Key antwortet `/api/ink` mit `503 {"error":"no_key"}`, das Studio zeigt „KI nicht eingerichtet“.

Schutz: Rate-Limit 5 Anfragen pro Minute und IP (`INK_LIMIT` in `wrangler.jsonc`).
