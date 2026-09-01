---
name: inficy-session-analytics
description: Use only when the user explicitly asks Inficy to verify a receipt, list connected agents, track this ChatGPT session, or show Inficy session analytics or productivity summaries. Do not activate for ordinary conversation.
version: 0.1.0
license: MIT
---

# Inficy session analytics

Inficy records what AI agents did and seals each execution as evidence that can be
verified independently. This skill covers the ChatGPT surface of Inficy: reading
existing records, and optionally tracking one selected ChatGPT session.

## When to activate

Activate only when the user names Inficy, or names one of the actions below in a
context where Inficy is already the subject. Examples that activate:

- "Use Inficy to verify my latest receipt."
- "Use Inficy to check which agents are connected."
- "Use Inficy to track this session."
- "Use Inficy to show my session analytics."
- "Use Inficy to show my productivity this week."

Do not activate for casual conversation, general coding help, or any request that
does not mention Inficy. Never start tracking on your own initiative.

## What this skill can do

| Intent | Action |
| --- | --- |
| Verify a receipt | Call `verify_receipt` with the execution id. Report the verdict and the independent verifier URL. |
| Check connected agents | Call `get_connection_status`. Report which agents reported at least one execution and what ran last. |
| Inspect activity | Call `list_executions` and `get_execution` for outcome, actions, actors and evidence digests. |
| Explain activity to a person | Call `get_activity_summary` or `get_anomalies`. |
| Usage and entitlement | Call `get_usage`. |
| Track this session | Call `start_session` once, then `record_checkpoint` for each meaningful checkpoint with its `activity_category`, then `finish_session` to close it and obtain the agent-reported receipt digest. |
| Session analytics | Call `get_session_analytics`. Report only recorded numbers. |
| Productivity summary | Call `get_productivity_summary`. Never estimate or fabricate numbers. |

## Categorising checkpoints

Every meaningful checkpoint must include `activity_category`, the best applicable
value from this list:

| Reported value | Recorded as | Use for |
| --- | --- | --- |
| `web` | Web & research | Web browsing, search, research |
| `code` | Code & commands | Writing, reading or reviewing code |
| `command` | Code & commands | Shell, terminal or command execution |
| `file` | Files & data | Reading, writing or organising files and documents |
| `communication` | Communication | Drafting or sending messages, email, chat |
| `decision` | Decision & planning | Planning, analysis and decisions with no external call |
| `tool` | Other tools | An external tool that fits none of the buckets above |
| `other` | Other | Nothing above applies |

Two deterministic rules, state them if asked:

- **Commands are recorded with code.** `command`, `shell` and `terminal` are
  stored under the same category as `code` and shown as "Code & commands". This
  matches how Inficy classifies shell steps in runtime-verified executions, so
  the two evidence classes stay comparable. Still report `command` when that is
  what happened; the distinction is preserved in the checkpoint label.
- **`tool` versus `other`.** `tool` means you positively used an external tool
  that fits no other bucket. `other` is the fallback. A checkpoint sent with no
  category, or with a value Inficy does not recognise, is stored as "Other",
  never as "Other tools".

State plainly that the category is **reported by ChatGPT**. Inficy did not observe
ChatGPT's internal tools and cannot confirm which tool ran. Inficy stores category,
label, outcome and server timestamps only, never prompts, responses or reasoning.

Time shown per category in the Inficy dashboard is the elapsed interval between
reported checkpoints. Call it "reported elapsed time", never verified
tool-execution time, and never invent a precise duration.

## Honesty rules, always state these when relevant

- **Tracking begins only when selected.** Nothing is recorded until the user asks
  in that specific conversation. There is no background capture.
- **Inficy cannot observe every ChatGPT conversation.** ChatGPT gives Inficy no
  passive runtime hook. Only what this skill explicitly reports is recorded.
- **Recorded session information is agent-reported.** A tracked ChatGPT session is
  self-reported evidence, labelled as such wherever it appears.
- **Runtime-verified receipts are a different evidence class.** Hermes and SDK
  connectors seal evidence inside the runtime and can be certified. Self-reported
  session records are excluded from the certification path.
- **Hidden reasoning, system prompts and unreported actions are unavailable.**
  Never imply Inficy saw them.
- **Record meaningful checkpoints, not every message.** A checkpoint is a task
  start, a completed step with a concrete outcome, a decision, or a failure. Do
  not stream ordinary chat turns.

## Boundaries

- Read paths return metadata and digests only, never private execution content.
- Workspace scope comes from the signed-in OAuth subject, never from an argument
  the model supplies.
- This skill never certifies, deletes, spends, or issues credentials.
- If the user is not signed in, say so and point at the connector's sign-in flow
  rather than guessing at data.
