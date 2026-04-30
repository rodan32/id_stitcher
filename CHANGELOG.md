# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html) where practical.

## [0.1.0] - 2026-04-30

### Added

- **Tealium CDP ↔ CJA** context: scenario lens filter (`CJA reporting paths` vs `Tealium CDP identity edges`) via `src/data/scenarioPerspective.ts`.
- **Ingest semantics** column on the events table plus `src/lib/ingestSemantics.ts` for dataset-specific copy.
- **Time-of-ingestion** messaging on the timeline when a journey includes Tealium stream events; extra line when **Ingest-time Tealium payloads** is enabled.
- **`tealiumIngestTimeSemantics`** on `StitchConfig`: engine strips person-level IDs on early Tealium hits until they first appear for the same visitor (TVID / ECID grouping); exported **`getStitchingScenario()`** for UI parity with stitch preprocessing.
- **CdpExplainerModal** + **CdpExplainerContent**: left-nav link opens a modal (diagram, concern cards, CJA vs activation framing)—no accordion in the nav.
- Git annotated tag **`backup/pre-tealium-cdp-concerns-2026-04-30`** marking a recoverable checkpoint before the CDP-focused UI work.

### Changed

- **Tealium Cross-Device** is disabled automatically when ingest-time Tealium is on; graph cross-device bridges respect the same rule.
- **README** replaced the default Vite boilerplate with project-specific run instructions and feature overview.

### Removed

- Inline **CdpRealityPanel** accordion stack in the sidebar in favor of the modal + slimmer nav.
