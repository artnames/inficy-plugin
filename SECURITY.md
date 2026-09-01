# Security policy

## Reporting

Report suspected vulnerabilities to security@artnames.io. Please include steps
to reproduce and do not include third-party personal data. We aim to acknowledge
within 3 working days.

## Scope

This repository holds packaging metadata only: manifests, a skill document,
assets, documentation and an offline validation script. It contains no server
code, no database access and no credentials.

Issues in the hosted Inficy service, including the MCP endpoint at
`https://inficy.com/mcp`, are also in scope for reports sent to the address
above. See https://inficy.com/security and https://inficy.com/.well-known/security.txt.

## Credential handling

The plugin never stores or transports Inficy credentials. Authentication is the
OAuth 2.1 authorization-code flow with PKCE S256 against the Inficy
authorization server; tokens are held by ChatGPT and are never written into this
repository. Any file in this repository containing a token, setup code, cookie,
client secret or workspace identifier is a defect: the validation script fails
the package if one is found.
