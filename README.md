# ID Stitcher

Interactive **Adobe CJA identity stitching** explorer: pick scenarios, tune FBS/GBS-style settings, and see timeline, graph, and per-event outcomes side by side.

## Quick start

```bash
npm ci
npm run dev
```

Production build:

```bash
npm run build
```

## Docker (port 3100)

```bash
docker build -t id-stitcher:latest .
docker run --rm -p 3100:3100 id-stitcher:latest
```

Open **http://localhost:3100** (nginx listens on 3100 inside the image).

## What you can explore

- **Scenarios** — Saved journeys (cross-device, Marketo, Tealium, replay windows, etc.).
- **Scenario lens** — Filter scenarios by “CJA reporting paths” vs “Tealium CDP identity edges.”
- **Stitch method** — None / FBS / GBS, person & persistent IDs, replay window, GBS graph options.
- **Tealium → AEP modeling**
  - **Ingest-time Tealium payloads** — Re-models Tealium steps so each row only includes person-level identifiers that first appear on that visitor (same TVID or ECID) at or before that step—aligned with time-of-ingestion behavior. Mutually exclusive with **Tealium Cross-Device** enrichment.
  - **Tealium Cross-Device** — Simulates server-side profile enrichment on every Tealium hit (off when ingest-time is on).
- **Events table** — **Ingest semantics** column describes how each dataset behaves at ingest (Tealium send-time snapshot vs other sources).
- **Full notes** — Link at the top of the left nav opens a modal with the Tealium CDP ↔ CJA diagram and explanatory cards (coverage, `stitched_id`, analytics vs activation framing).

Details of what shipped when live in **[CHANGELOG.md](./CHANGELOG.md)**.

## Tech stack

React 19, TypeScript, Vite, Tailwind CSS v4, D3 (graph view).

## Repo

**https://github.com/rodan32/id_stitcher**

Recoverable pre–Tealium CDP UI work: git tag `backup/pre-tealium-cdp-concerns-2026-04-30`.
