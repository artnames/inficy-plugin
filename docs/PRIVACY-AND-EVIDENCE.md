# Privacy and evidence

## What this plugin can see

The plugin reaches Inficy only through the hosted MCP server, signed in as you.
Row level security scopes every read to your own workspace. It cannot read any
other workspace, and it never receives Inficy credentials.

Read tools return recorded agent activity you already own: connection status,
executions, activity summaries, anomalies, usage and receipt verification
results.

## Tracking a ChatGPT session is opt-in

Inficy cannot observe ChatGPT passively. Nothing is recorded until you ask for
tracking in a conversation. Tracking then records only the checkpoints the
assistant chooses to write: task starts, completed steps, decisions, failures
and handoffs. Ordinary chat turns are not streamed.

## Self-reported, not certified

A tracked ChatGPT session produces an agent-reported receipt: a digest over the
checkpoints the assistant recorded. It is self-reported evidence. It is not
sealed by an instrumented runtime and it can never be certified. Only executions
captured through an Inficy runtime connector carry sealed evidence eligible for
certification.

## Verification

`verify_receipt` re-verifies stored evidence against its sealed digest offline
and returns an independent verifier URL. It never returns private execution
content and never certifies.

## Data handling

See https://inficy.com/privacy and https://inficy.com/terms. Inficy is operated
by Artnames Ltd.
