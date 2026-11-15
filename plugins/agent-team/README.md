# agent-team

> Links the named Claude Code sessions working in the same git repository into a team: each agent knows its teammates and can message them.

Run a "Backend Lead", a "QA Lead" and an "Operation Manager" side by side on one repository, and they can hand work to each other, ask for reviews and report results, without you copying messages between terminals.

## Features

- **Teams per repository.** Sessions working anywhere in the same git repository are one team. Outside a git repository, the folder the session started in is the team.
- **Name to join.** A session joins when it has a name: run `/rename <name>`. Unnamed sessions stay out.
- **Automatic introductions.** When an agent joins or is renamed, every live teammate gets a short message: *"QA Lead" joined the team…*. Each name is announced once.
- **Agents know their team.** Each agent's instructions list its live teammates and tell it to coordinate through Claude Code's `SendMessage`. Ask in plain English, e.g. *"Ask Backend Lead whether the webhook changes are done"*, and the agent messages them itself.
- **Commands for you:** `/team` lists your teammates, and `/tell <name> <message>` sends one a message directly.
- **Duplicate-name warning.** Renaming to a name a teammate already uses still works, but shows a warning, since messages to that name could reach the wrong session.
- **Peers aren't the user.** A teammate's message arrives as a peer request, never as your instruction. A teammate cannot approve actions or grant permissions on your behalf.

## Installation

At the prompt of a Claude Code terminal session:

```
/plugin install agent-team --marketplace srijonDatta/Name-Your-Agent
```

Answer `y` to add the marketplace, then press **Enter** to install at the user scope. **Restart any sessions that were already running.** A session that started before the install won't have the mod.

It pairs well with [`session-label`](../session-label), which shows each session's name and ID above the prompt.

## Linking your agents: a walkthrough

1. **Open two terminals in the same repository** and start Claude Code in each:
   ```
   cd path/to/your-repo
   claude
   ```
2. **Name each agent.** Run `/rename Backend Lead` in the first and `/rename QA Lead` in the second. The first agent receives *"QA Lead" joined the team*.
3. **Check the team.** Type `/team` in either session. It lists the other session, when it was last active, and its session ID.
4. **Send a message.** In QA Lead, type `/tell Backend Lead can you re-run the integration tests?`. Names aren't case-sensitive. Backend Lead receives the message and can reply on its own.
5. **Let them coordinate.** Ask either agent to hand work to the other in plain English. It uses `SendMessage` with the teammate's name.

New agents join the same way at any time: start Claude Code in the repository and `/rename` it.

## Commands

| Command | What it does |
| --- | --- |
| `/rename <name>` | Claude Code's built-in rename. Joins the team, or announces the new name. |
| `/team` | Lists this repository's live teammates, with last-seen time and session ID. |
| `/tell <name> <message>` | Sends a teammate a message. With teammates "QA" and "QA Lead", `/tell QA Lead …` goes to "QA Lead". |

## How it works

Claude Code lets a mod *message* another session, but not *list* the sessions on a project, and its own session list covers every project on the machine. So the team is a small register on disk:

```
~/.claude/agent-team/<repository key>/<session id>.json
```

Each named session writes only its own file, with its name, session ID, folder and a last-seen time, and refreshes it every minute. A session that ends marks its file as ended; one not refreshed for 3 minutes is treated as gone. Messages travel over Claude Code's own session messaging, the same path the `SendMessage` tool uses.

## Troubleshooting

- **`/tell` or `/team` says "unknown skill".** The mod isn't loaded in that session. Restart the session. If you load mods through `CLAUDE_CODE_PLUGIN_DIRS` rather than `/plugin install`, add the mod's folder to that list.
- **A teammate doesn't appear in `/team`.** Both sessions need the mod, a name (`/rename`), and the same git repository. A session started in a parent folder outside the repository is on a different team.
- **A dim `agent-team:` line in the transcript** means the session couldn't join. The line says why.

## Development

```bash
claude plugin validate plugins/agent-team
claude plugin test plugins/agent-team     # runs hooks/team.test.ts
```

## License

[MIT](../../LICENSE) © 2026 srijonDatta
