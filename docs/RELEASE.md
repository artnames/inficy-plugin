# Release process

Status: prerelease. Canonical repository: https://github.com/artnames/inficy-plugin

## Gates before any prerelease (all passed for v0.1.0-beta.1)

1. All 21 tools resolve on the production MCP server, including the five
   tracked-session tools.
2. OAuth login from ChatGPT succeeds against a real Inficy account.
3. The real `plugin_asdk_app` connection ID replaces the placeholder in
   `plugins/inficy/.app.json`.
4. The final GitHub repository URL replaces the placeholder in
   `plugins/inficy/.codex-plugin/plugin.json`.

## Validate

```
node scripts/validate-plugin-package.mjs
node scripts/validate-plugin-package.mjs --release
```

Release mode fails while any placeholder remains.

## Tracked files

Every file in this repository is tracked. There are no generated artefacts and
no build step. Never commit a workspace-specific URL, token, setup code, OAuth
token, client secret, API key, cookie, workspace identifier or `.env` file.

## Prerelease

```
git tag -a v0.1.0-beta.1 -m "Inficy plugin 0.1.0-beta.1"
git push origin v0.1.0-beta.1
codex plugin marketplace add artnames/inficy-plugin --ref v0.1.0-beta.1
```

## Final 0.1.0

Cut only after the real ChatGPT OAuth login, marketplace installation, all
starter prompts and a complete tracked session with accurate analytics all pass
end to end, with Hermes and OpenAI Agents SDK connectors unchanged.

## Public directory

Adding a repository marketplace source does not publish Inficy to OpenAI's
public directory. That is a separate later submission with its own review.
