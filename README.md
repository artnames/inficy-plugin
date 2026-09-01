# Inficy plugin for ChatGPT

This repository distributes the **Inficy** plugin package only. It contains no
Inficy application code, backend, database or deployment configuration.

Inficy records what AI agents did and lets you verify the evidence. This plugin
connects ChatGPT to the hosted Inficy remote MCP server at
`https://inficy.com/mcp` over Streamable HTTP with OAuth 2.1. Each user signs in
to their own Inficy workspace; the plugin never carries credentials.

## Contents

```
.agents/plugins/marketplace.json      marketplace source, resolves ./plugins/inficy
plugins/inficy/.codex-plugin/plugin.json
plugins/inficy/.app.json              registered ChatGPT connection mapping
plugins/inficy/.app.example.json      documented example of the above
plugins/inficy/tools.json             advertised MCP tools and their scopes
plugins/inficy/skills/                opt-in session tracking skill
plugins/inficy/assets/                icon and logo
docs/                                 installation, privacy, release process
scripts/validate-plugin-package.mjs   offline package validation
```

## Status

In development. The package is not published to any marketplace and the
ChatGPT connection ID in `.app.json` is still a guarded placeholder.

## Validate

```
node scripts/validate-plugin-package.mjs            # structural checks
node scripts/validate-plugin-package.mjs --release  # also rejects placeholders
```

Validation is pure filesystem reads: no network, no dependency on the Inficy
application repository.

## Licence

MIT, see `LICENSE`. The licence covers every file in this repository.
