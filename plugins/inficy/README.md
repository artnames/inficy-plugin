# Inficy plugin for ChatGPT

Read what your AI agents did, verify receipts, and see which agents are connected,
from inside ChatGPT. Packaged for the ChatGPT desktop app using the current OpenAI
plugin format (no legacy `ai-plugin.json` manifest).

Operating entity: Artnames Ltd, trading as Inficy. Contact: contact@artnames.io.

## What the plugin does

The plugin registers the **existing hosted Inficy remote MCP server**
(`https://inficy.com/mcp`, MCP Streamable HTTP, OAuth 2.1). It adds no new backend,
no new auth model and no new data path.

Available today, read-only:

| Tool | Purpose |
| --- | --- |
| `get_connection_status` | Which agents are connected, and what last ran |
| `list_executions` | Recent executions, filterable by agent and time window |
| `get_execution` | One execution: outcome, actions, actors, evidence digest |
| `verify_receipt` | Offline verification against the sealed digest, plus the independent verifier URL |
| `get_activity_summary`, `get_anomalies` | Plain-language activity explanation |
| `get_usage`, `get_account`, `get_plans`, `list_agents` | Workspace context |

In development: opt-in tracking of a selected ChatGPT session.

## Evidence limitations

- Inficy cannot observe ChatGPT. There is no passive runtime hook, and this plugin
  ships no lifecycle hooks that would imply one.
- Anything submitted through this plugin is stored as **self-reported** and is
  excluded from the certification path.
- Runtime-verified Hermes and SDK receipts are a different, stronger evidence class.
- Hidden reasoning, system prompts and unreported actions are never available.
- Receipts return metadata and digests, never private execution content.

## Authentication behaviour

Authentication happens on install (`"authentication": "ON_INSTALL"`). Each user
signs in to **their own** Inficy account through the MCP OAuth 2.1 flow. Workspace
scope comes from the OAuth subject and row-level security, never from a tool
argument. No workspace URL, token, setup code or key is committed to this
repository. The `plugin_asdk_app...` value in `.app.json` is a ChatGPT connection
identifier, not user authentication and not a secret credential.

## Privacy summary

- Privacy notice: https://inficy.com/privacy
- Terms of service: https://inficy.com/terms
- Cookie policy: https://inficy.com/cookies
- Subprocessors: https://inficy.com/subprocessors
- Security: https://inficy.com/security

## Install: developer-mode registration

1. Enable Developer Mode in the ChatGPT desktop app.
2. Register the Inficy MCP endpoint `https://inficy.com/mcp` as a connector.
3. Complete its OAuth authentication flow against your Inficy account.
4. Copy the generated technical connection ID beginning `plugin_asdk_app`.
5. Paste it into `plugins/inficy/.app.json` at `apps[0].connection.id`,
   replacing `plugin_asdk_app_REPLACE_ME`.
6. Run the package validation: `node scripts/validate-plugin-package.mjs --release`.
7. Install from the repository marketplace and test.

`.app.example.json` is the committed template; keep it with the placeholder.

## Install from the repo marketplace

After the repository is pushed and tagged:

```
codex plugin marketplace add GITHUB_OWNER/GITHUB_REPOSITORY --ref v0.1.0
```

Then restart the ChatGPT desktop app, open the Plugins Directory, select the
**Inficy Plugins** source and install **Inficy**. Always pin a tag; do not point
wider testing at an unpinned `main`.

## Uninstall or disable

Disable or remove the plugin from the ChatGPT desktop Plugins Directory, then
remove the marketplace source with
`codex plugin marketplace remove inficy-plugins`. Revoke the Inficy connector's
OAuth access from your Inficy account if you also want to end data access.

## Current status and known limitations

- Read receipts and connection status: **Available**
- Tracked ChatGPT sessions: **In development**
- GitHub plugin package: **In development**

Release blockers before version 0.1.0 are listed in `docs/INFICY-PLUGIN-RELEASE.md`.
Publishing to GitHub does not publish Inficy to OpenAI's public Plugins Directory;
that is a separate later submission.
