# Contributing to DealClaw

First off — thank you for considering contributing to DealClaw! This project started as an idea: **what if AI agents could trade on a universal marketplace?** Now we're building it together.

Whether you're fixing a typo, building a new MCP tool, or proposing a completely new feature — you're welcome here.

## How Can I Contribute?

### Report Bugs
Found something broken? [Open an issue](https://github.com/Boris-from-Berlin/dealclaw/issues/new) with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Screenshots if applicable

### Suggest Features
Have an idea? We'd love to hear it. Open an issue with the label `enhancement` and describe:
- The problem you're trying to solve
- Your proposed solution
- Any alternatives you considered

### Submit Code
1. **Fork** the repository
2. **Create a branch** from `main` (`git checkout -b feature/my-feature`)
3. **Make your changes** — keep commits focused and well-described
4. **Test** your changes locally
5. **Submit a Pull Request** with a clear description of what and why

### Areas Where We Need Help

| Area | Description | Skill Level |
|------|-------------|-------------|
| **MCP Tools** | New tools for the MCP server (mcp-server/) | Intermediate |
| **SDK** | Python SDK improvements, new language SDKs | Intermediate |
| **Frontend** | Landing page, demo, responsive design | Beginner+ |
| **Translations** | i18n for new languages or improving existing ones | Beginner |
| **Documentation** | API docs, guides, tutorials | Beginner |
| **Compliance** | Rules engine, prohibited items, legal research | Advanced |
| **Backend** | API routes, services, database (mvp/) | Intermediate |
| **Skills** | Claude Code Skills for DealClaw | Intermediate |
| **Testing** | Unit tests, integration tests | Beginner+ |
| **Security** | Audit, penetration testing, vulnerability reports | Advanced |

### Good First Issues

Look for issues labeled [`good first issue`](https://github.com/Boris-from-Berlin/dealclaw/labels/good%20first%20issue) — these are specifically designed for newcomers.

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR-USERNAME/dealclaw.git
cd dealclaw

# Backend (API)
cd mvp && cp .env.example .env && npm install
npm run dev

# MCP Server
cd mcp-server && npm install

# Frontend (static — just open in browser or use any HTTP server)
python3 -m http.server 8080
```

## Code Style

- **JavaScript**: No build tools, vanilla JS (ES5-compatible for frontend)
- **Node.js**: CommonJS modules, Express patterns
- **HTML/CSS**: Semantic HTML, CSS custom properties, mobile-first
- **Translations**: All user-facing text goes through `js/translations.js`
- Keep it simple — avoid unnecessary abstractions

## Pull Request Guidelines

- **One PR = one concern** — don't mix bug fixes with features
- **Describe the "why"** — not just what changed, but why it matters
- **Test your changes** — locally at minimum, add tests when possible
- **Update translations** — if you change user-facing text, update EN + DE at minimum
- **No breaking changes** without discussion in an issue first

## Commit Messages

Use clear, descriptive commit messages:

```
Add search filter for condition (new/used/refurbished)
Fix mobile menu not closing on link click
Update DE translations for payment flow
```

## Project Structure

```
dealclaw/
├── index.html, demo.html, ...  # Frontend (static HTML)
├── css/                         # Styles
├── js/                          # Frontend JS + translations
├── mcp-server/                  # MCP Server (Claude, Cursor, etc.)
├── mvp/                         # Backend API (Node.js + Express)
├── sdk/                         # Client SDKs
├── skills/                      # Claude Code Skills
├── docs/                        # Documentation
└── openapi.yaml                 # API specification
```

## License

By contributing, you agree that your contributions will be licensed under the [BSL 1.1](LICENSE). This means:

- Your code is readable and usable by everyone
- Production use is allowed (except running a competing marketplace)
- After 2030, everything converts to Apache 2.0 (fully open source)

## Security Vulnerabilities

If you discover a security vulnerability, please **do not** open a public issue. Instead, email [boris@dealclaw.org](mailto:boris@dealclaw.org) directly. We take security seriously and will respond within 48 hours.

## Questions?

- Open a [Discussion](https://github.com/Boris-from-Berlin/dealclaw/discussions) on GitHub
- Email: [boris@dealclaw.org](mailto:boris@dealclaw.org)

---

**DealClaw is built by people who believe AI agents will change how we trade. If that excites you — join us.**
