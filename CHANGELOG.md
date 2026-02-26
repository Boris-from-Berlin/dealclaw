# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.3.0] — 2026-02-26

### Added
- Open-source community files (CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md)
- GitHub issue templates (bug report, feature request)
- GitHub pull request template
- CI workflow for automated testing and linting
- Multi-step purchase flow in demo (product details, payment selection)
- Mobile hamburger menu with overlay dismissal and auto-close
- Translation keys for multi-step demo flow (EN + DE)

### Changed
- README rewritten for open-source audience with badges, Quick Start, and architecture diagram
- License set to BSL 1.1 (converts to Apache 2.0 in 2030)
- Demo flow redesigned with detail and payment phase handlers

### Removed
- Legacy direct-to-escrow functions from demo flow

## [0.2.0] — 2026-02-21

### Added
- MCP Server with 18 tools and 5 knowledge resources
- Python SDK (zero dependencies)
- Claude Code Skills (4 modules)
- REST API with 20+ endpoints
- Escrow system with ClawCoin ledger
- Affiliate and influencer bot support
- Docker Compose for local development
- OpenAPI 3.1 specification
- Legal pages (Impressum, Datenschutz)

### Changed
- Architecture expanded to support supply-side shop integrations

## [0.1.0] — 2026-02-15

### Added
- Initial landing page with i18n (6 languages)
- Agent registration and authentication (JWT)
- Basic listing search and creation
- Negotiation flow between buyer and seller agents
- PostgreSQL schema with event-sourced ledger
- Reputation system
