# agent-team

> Links the named Claude Code sessions working in the same git repository into a team: each agent knows its teammates and can message them.

Run a "Backend Lead", a "QA Lead" and an "Operation Manager" side by side on one repository, and they can hand work to each other, ask for reviews and report results, without you copying messages between terminals.

## Features

- **Teams per repository.** A session's team is set by the folder it **starts** in: the git repository that folder belongs to, or, outside a git repository, the folder itself. Sessions started anywhere in the same repository are one team. Changing directory after starting doesn't move a session to another team; restarting it in another folder does.
- **Name to join.** A session joins when it has a name: run `/rename <name>`. Unnamed sessions stay out.
- **Automatic introductions.** When an agent joins or is renamed, every live teammate gets a short message: *"QA Lead" joined the team…*. Each name is announced once.
- **Agents know their team.** Each agent's instructions list its live teammates and tell it to coordinate through Claude Code's `SendMessage`. Ask in plain English, e.g. *"Ask Backend Lead whether the webhook changes are done"*, and the agent messages them itself.
- **See what everyone is working on, or last worked on.** `/team` shows each teammate's current or most recent task in one or two lines, even for teammates that have been idle a while, and each agent's teammate list includes it too, so agents know who's doing what. The most recently active teammate is listed first.
- **Works with long sessions.** Session history files are read from the end in small pieces, so a session that has been running for days, with a history of any size, stays on the team.
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

1. **Open two terminals in the same repository** and start Claude Code in each. Start every agent from inside the repository: the folder a session starts in decides its team.
   ```
   cd path/to/your-repo
   claude
   ```
2. **Name each agent.** Run `/rename Backend Lead` in the first and `/rename QA Lead` in the second. The first agent receives *"QA Lead" joined the team*.
3. **Check the team.** Type `/team` in either session. It lists the other session, when it was last active, its session ID, and what it's working on:
   ```
   Teammates:
     Backend Lead  ·  active 1 min ago  ·  6db75129-258d-4a73-a701-74f7f0cbef10
         ↳ Preparing the database migration for the release
           adding the missing index on orders  (2 min ago)
   ```
4. **Send a message.** In QA Lead, type `/tell Backend Lead can you re-run the integration tests?`. Names aren't case-sensitive. Backend Lead receives the message and can reply on its own.
5. **Let them coordinate.** Ask either agent to hand work to the other in plain English. It uses `SendMessage` with the teammate's name.

New agents join the same way at any time: start Claude Code in the repository and `/rename` it.

## Commands

| Command | What it does |
| --- | --- |
| `/rename <name>` | Claude Code's built-in rename. Joins the team, or announces the new name. |
| `/team` | Lists this repository's live teammates, most recently active first, with last-seen time, session ID and current task. The first line names the team you're on. |
| `/tell <name> <message>` | Sends a teammate a message. With teammates "QA" and "QA Lead", `/tell QA Lead …` goes to "QA Lead". |

## How it works

Claude Code lets a mod *message* another session, but not *list* the sessions on a project, and its own session list covers every project on the machine. So the team is a small register on disk:

```
~/.claude/agent-team/<repository key>/<session id>.json
```

Each named session writes only its own file, with its name, session ID, folder and a last-seen time, and refreshes it every minute. A session that ends marks its file as ended; one not refreshed for 3 minutes is treated as gone.

**Finding a session's name.** The name is the latest `/rename` recorded in the session's history file (`~/.claude/projects/…/<session id>.jsonl`), or, if there is none, the `custom-title.json` Claude Code keeps beside it. History files grow by megabytes a day, and a mod may read at most 4 MiB at a time, so they are read from the end, 1 MiB at a time, as raw bytes, and only whole lines are decoded. Messages travel over Claude Code's own session messaging, the same path the `SendMessage` tool uses.

**Current task.** After each turn of the main conversation, the agent records its latest request in its file, for free. To write a short summary of the task, it also asks a small, cheap model (Haiku), using the latest request and reply. This happens **at most once every 3 minutes per session**, and the call counts toward that session's usage. Until a summary exists, `/team` shows *Last request: …*.

**Idle or restarted teammates.** A session that joins with nothing recorded, after a restart or resume, fills in its last work from its own transcript right away. For a teammate that still has nothing recorded, for example one running an older version, `/team` reads that teammate's transcript (`~/.claude/projects/…/<session id>.jsonl`) and summarizes its last request and reply, so you see what it last worked on instead of a blank. The summary is cached until that teammate's transcript changes, so repeated `/team` calls don't ask the model again. The agents' own teammate list only ever uses cached summaries. Activity stays on your machine, in the register files, and is shown only to teammates on the same repository.

## Troubleshooting

- **`/tell` or `/team` says "unknown skill".** The mod isn't loaded in that session. Restart the session. If you load mods through `CLAUDE_CODE_PLUGIN_DIRS` rather than `/plugin install`, add the mod's folder to that list.
- **A teammate doesn't appear in `/team`.** Both sessions need the mod, a name (`/rename`), the same team, and to be open (a closed session drops off within 3 minutes; while the computer sleeps, teammates disappear and come back when it wakes).
- **Agents are split across two teams.** They were started in different folders. For example, a session started in a parent folder that isn't a git repository is on that folder's team, while one started inside a repository nested under it is on the repository's team. The first line of `/team` names each session's team. Restart the odd one out from the right folder, keeping its conversation:
  ```
  cd path/to/your-repo
  claude --resume <session id>
  ```
- **A teammate sees you, but you don't see it** (versions before 0.3.1). Its history file grew past 4 MiB, so it lost its name and stopped refreshing its entry; its own `/team` says "This session has no name yet". Update the mod and restart that session.
- **`/team` says "This session has no name yet" after a restart.** A brand-new session starts unnamed, even if an earlier one in that terminal had a name. Run `/rename <name>` to join the team. Resuming the earlier session with `claude --resume` keeps its name.
- **A teammate shows "No recent activity found".** Its session history has no request or reply to summarize yet, or can't be read. It fills in after that teammate's next turn.
- **A dim `agent-team:` line in the transcript** means the session couldn't join. The line says why.

## Development

```bash
claude plugin validate plugins/agent-team
claude plugin test plugins/agent-team     # runs hooks/team.test.ts
```

## License

[MIT](../../LICENSE) © 2026 srijonDatta
