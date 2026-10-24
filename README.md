# Flash Try-On

Interaktiver Tattoo-Try-On-Prototyp: Flash-Motiv wählen, Kamera an, das Motiv wird per Body-Tracking (MediaPipe Pose + Hand) auf die Haut gelegt. Enthält einen Konverter, der Fotos von Flash-Sheets in transparente PNGs verwandelt.

- Alles läuft im Browser auf dem Gerät, keine Bilder verlassen das Handy.
- Kein Build-Schritt: `public/index.html` ist die ganze App.

## Lokal starten

```bash
python3 -m http.server 5173 --directory public
```

Dann http://localhost:5173 öffnen.

## Deployment

Der Cloudflare Worker `tryonflash` ist mit diesem Repo verbunden (Workers Builds). Er liefert nur die statischen Dateien aus `public/` aus, konfiguriert in `wrangler.jsonc`. Jeder Push auf `main` wird automatisch veröffentlicht.
