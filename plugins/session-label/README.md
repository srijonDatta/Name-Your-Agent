# session-label

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](../../LICENSE)
![Claude Code mod](https://img.shields.io/badge/Claude%20Code-mod-d97757)
![Tested on Claude Code 2.1.325](https://img.shields.io/badge/tested%20on-2.1.325-blue)

> A Claude Code mod that keeps your session's `/rename` name and full session ID pinned above the prompt, so you always know which session you're in.

```
                                   Operation Manager d8300d65-e6e0-4e87-87b5-f14a75cc0ab0
───────────────────────────────────────────────────────────────────────────────────────────
> _
```

## Why

When you run several Claude Code sessions side by side, it's easy to lose track of which terminal is which. `/rename` gives a session a name, but Claude Code doesn't keep that name on screen. This mod adds a persistent label above the prompt showing:

- **The session name** you set with `/rename`.
- **The full session ID**, the stable identifier you need to resume or reference a session. Short addresses can change between sessions; the full ID doesn't.

## Features

- **Follows `/rename` live.** The label updates the moment you rename the session. There's no separate command to learn.
- **Survives restarts and resumes.** On start-up the mod reads the most recent name saved by `/rename`, so a resumed session gets its name back straight away.
- **Stays out of the way.** An unnamed session shows only its ID. The label steps aside while Claude Code is showing a survey.
- **Terminal and desktop app.** The label is drawn and tested in both.

## Installation

At the prompt of a Claude Code terminal session:

```
/plugin install session-label --marketplace srijonDatta/Name-Your-Agent
```

Answer `y` to add the marketplace, then press **Enter** to install at the user scope. The label appears straight away, and in every session you start after that.

It pairs well with [`agent-team`](../agent-team), which links the named sessions on one repository into a team that can message each other.

<details>
<summary>Other ways to install</summary>

**From a shell:**

```
claude plugin install session-label --marketplace srijonDatta/Name-Your-Agent
```

**In the desktop app** (where `/plugin` isn't available): click **+** next to the prompt box, then **Plugins**, then **Add marketplace** with `srijonDatta/Name-Your-Agent`, then **Add plugin**.

</details>

## Usage

| Command | What it does |
| --- | --- |
| `/rename <name>` | Claude Code's built-in rename. The label updates immediately. |
| `/session-name` | Prints the current name and the full session ID, handy for copying. |

## How it works

Claude Code doesn't give mods a way to read a session's name directly, so the mod gets it from two places:

1. **Live:** it wraps the built-in `/rename` command, lets it run unchanged, then reads the new name from the command's output.
2. **At start-up:** `/rename` records each new name in the session's own file under `~/.claude/projects/`. The mod reads the most recent one, which covers resumed sessions and names set while the mod wasn't installed.

The last name seen is also kept in the mod's own storage, as a fallback if the session file can't be read. The mod only reads files; it never changes your sessions.

## Troubleshooting

- **The label shows only the ID after installing.** Names set before you installed the mod are picked up at start-up. Restart the session, or run `/rename` again.
- **What is the `[-]` next to the label?** It's Claude Code's own button for collapsing the band above the prompt (`ctrl+x ctrl+a`). It isn't part of this mod.

## Development

```bash
git clone https://github.com/srijonDatta/Name-Your-Agent.git
cd Name-Your-Agent
claude plugin validate plugins/session-label   # check the manifest and hooks module
claude plugin test plugins/session-label       # run the test suite in hooks/label.test.tsx
```

| Path (under `plugins/session-label/`) | What it holds |
| --- | --- |
| `hooks/register.tsx` | The mod itself: the `/rename` hook, start-up name lookup and label rendering |
| `hooks/label.test.tsx` | Tests |
| `types/index.d.ts` | The mod's state contract |
| `.claude-plugin/plugin.json` | Plugin manifest |

## License

[MIT](../../LICENSE) © 2026 srijonDatta
