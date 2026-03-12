# Designalternativer for SkiturApp

## Alternativ A: "Alpine Modern" — Mork header med gradient
- Mork bla/teal gradient-header med hvit tekst og tydelig tilbake-pil
- Kort med subtile skygger og avrundede hjorner (16px)
- Accent-farge: Varm oransje (#F97316) for CTA-knapper og badges
- Fargepalett: Mork bla header (#0F2B46) -> hvit bakgrunn -> oransje aksenter
- Gir en premium fjell-app-folelse (tenk Strava/Fatmap)

## Alternativ B: "Nordic Clean" — Lys og luftig med fargerike kort (IMPLEMENTERT)
- Hvit/lysegra header med tydelig tilbake-knapp
- Trip-kort med farget venstre-kant basert pa status (gronn=aktiv, bla=planlegging, gra=ferdig)
- Ikoner i badges og seksjonsheaders
- Shadows pa kort i stedet for borders
- Fargepalett: Hvit + lysegra + fargede aksenter per status
- Rent, skandinavisk design (tenk Yr/Entur)

## Alternativ C: "Mountain Bold" — Morkt tema som standard
- Helt morkt tema som default med levende farger
- Header med semi-transparent bakgrunn og stor tilbake-pil
- Kort med gradient-bakgrunn (mork bla -> mork teal)
- Neon-aktig primaerfarge (#22D3EE cyan) mot mork bakgrunn
- Sporty og moderne (tenk Suunto/Coros)

---

## Implementert (v1.7.0)
Alternativ B ble valgt og implementert med:
- Responsiv sidebar pa desktop, bottom tabs pa mobil
- TripCard med fargede venstrelinjer og status-ikoner
- Alle skjermer bruker useTheme() for dark mode
- SignIn med sentrert kort (max-width 420px)
- Chat/Shopping/Users med max-width for web
- Yr-inspirert vaervarsel med 4 perioder pa turdag
