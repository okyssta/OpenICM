# Security Policy

## Reporting a Vulnerability

This is an early-stage open-source project. If you discover a security vulnerability, please report it privately by opening a GitHub Security Advisory at:

**https://github.com/okyssta/OpenICM/security/advisories**

Do not report security issues in public GitHub issues.

## Response

I'll acknowledge receipt within 48 hours and work on a fix. For critical vulnerabilities (SSRF, RCE, auth bypass), I'll prioritize a patch release within 7 days.

## Scope

The following are considered in-scope:
- API authentication/authorization bypass
- SQL injection through API inputs
- Path traversal in file/csv import handlers
- Exposure of sensitive compensation data between orgs (multi-tenant readiness)

The following are out of scope:
- Self-inflicted issues (misconfigured environment, weak passwords)
- Denial of service on self-hosted instances
- Dependency CVEs with known fixes (run `npm audit` yourself)
