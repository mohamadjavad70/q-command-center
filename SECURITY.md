# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 1.x     | Yes       |

## Reporting a Vulnerability

Do not report security issues in public issues.

Send reports to: security@qmetaram.com

Include:
- Summary and impact
- Reproduction steps
- Proof of concept (if available)
- Suggested fix (optional)

## Response SLA

- Acknowledgement: within 48 hours
- Triage decision: within 5 business days
- Critical fix target: within 7 days

## Safe Harbor

We will not pursue legal action against good-faith researchers who:
- Avoid privacy violations and data destruction
- Avoid service disruption
- Report findings privately and responsibly

## Secret Handling Rules

- Never commit .env files
- Use runtime env vars for all secrets
- Rotate keys immediately after suspected exposure
