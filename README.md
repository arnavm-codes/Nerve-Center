# Nerve-Center

A modular, personal home-base dashboard for Obsidian: calendar, tasks, Claude
Code usage, and a text/voice Q&A widget that answers questions about your own
vault using the `claude` CLI - no custom RAG/embeddings layer.

Design doc and progress log: `Projects/SecondBrain-Dashboard.md` in the vault
(the plugin's internal id and this note's filename still say
"secondbrain-dashboard" - only the user-facing name changed to Nerve-Center).

## Widgets

- **Tasks** - scans open/closed checkboxes across the vault, refreshes on any
  vault file change.
- **Claude Usage** - reads local `~/.claude` session logs for today's/this
  week's token usage and recent activity, no auth. Polls every 60s.
- **Calendar** - Google Calendar agenda via an OAuth 2.0 loopback + PKCE flow
  (RFC 8252). Needs a Google Cloud OAuth "Desktop app" client with the
  Calendar API enabled; configure under the widget's settings. Polls every
  5 min.
- **Ask your Vault** - spawns `claude -p --add-dir <vault> --allowedTools
  "Read Glob Grep"` so it can only search/read vault files, never the
  internet or shell. Fed live open-tasks/upcoming-events context alongside
  the question. Supports voice in (Web Speech API) and voice out
  (speechSynthesis) when asked by voice.

## Development

```
npm install
npm run dev      # watch mode, rebuilds main.js on change
npm run build    # type-check + production build
```

Dev-symlink the project folder into a vault's `.obsidian/plugins/` and
enable it in Community plugins to test changes.

## Manually installing

Copy `main.js`, `styles.css`, `manifest.json` into
`VaultFolder/.obsidian/plugins/secondbrain-dashboard/`.
