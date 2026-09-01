# Installation

## Requirements

- An Inficy account at https://inficy.com
- ChatGPT desktop app with Developer Mode enabled

## 1. Register the remote MCP server

1. Open ChatGPT desktop, Settings, Connectors, and enable Developer Mode.
2. Add a remote MCP server with URL `https://inficy.com/mcp`, transport
   Streamable HTTP, authentication OAuth 2.1.
3. Complete the sign-in. You approve the connection on an Inficy consent screen
   and the connection then acts as your own Inficy workspace user.
4. Copy the generated technical connection ID beginning `plugin_asdk_app`.

## 2. Point the package at your connection

Copy `plugins/inficy/.app.example.json` to `plugins/inficy/.app.json` and replace
`plugin_asdk_app_REPLACE_ME` with the real ID. Keep `server.url` at the stable
public endpoint `https://inficy.com/mcp`.

## 3. Install from this marketplace source

```
codex plugin marketplace add artnames/inficy-plugin --ref v0.1.0-beta.2
```

Restart the desktop app, open the Plugins Directory, select Inficy Plugins and
install Inficy.

## 4. Verify

Ask ChatGPT:

- "Use Inficy to check which agents are connected."
- "Use Inficy to verify my latest receipt."

Both are read-only. Session tracking only starts when you explicitly ask for it.
