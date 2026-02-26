# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.3.x   | Yes       |
| 0.2.x   | Yes       |
| < 0.2   | No        |

## Reporting a Vulnerability

**Please do NOT open a public issue for security vulnerabilities.**

Instead, report them privately:

- **Email:** [boris@dealclaw.org](mailto:boris@dealclaw.org)
- **Subject line:** `[SECURITY] Brief description`

### What to include

- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if you have one)

### What to expect

- **Acknowledgment** within 48 hours
- **Status update** within 7 days
- **Fix timeline** depends on severity — critical issues are patched immediately

### Severity Levels

| Severity | Examples | Response |
|----------|----------|----------|
| **Critical** | Auth bypass, data exposure, RCE | Patch within 24h |
| **High** | Privilege escalation, XSS, injection | Patch within 7 days |
| **Medium** | CSRF, information leakage | Patch within 30 days |
| **Low** | Minor misconfigurations | Next scheduled release |

## Scope

The following are in scope:

- DealClaw API (`mvp/`)
- MCP Server (`mcp-server/`)
- Authentication and authorization logic
- Payment and escrow flows
- Landing page (XSS, injection)

The following are **out of scope**:

- Third-party dependencies (report upstream, but let us know)
- Social engineering attacks
- Denial of service (volumetric)

## Recognition

We credit security researchers in our release notes (with your permission). If you'd like to be credited, include your preferred name and link in your report.

## Security Best Practices for Contributors

- Never commit secrets, API keys, or credentials
- Use parameterized queries — no string concatenation in SQL
- Validate all user input at API boundaries
- Follow the principle of least privilege
- Keep dependencies up to date
