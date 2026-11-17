# Name Your Agent

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Claude Code mods](https://img.shields.io/badge/Claude%20Code-mods-d97757)
![Tested on Claude Code 2.1.325](https://img.shields.io/badge/tested%20on-2.1.325-blue)

> Claude Code mods for running several named agents side by side: see each session's name and ID, and link the agents on one repository into a team. A new agent is welcomed by each teammate with a brief of what it's working on, `/team` shows who's doing what, and `/tell` messages a teammate directly.

| Mod | What it does |
| --- | --- |
| [**session-label**](plugins/session-label) | Pins the session's `/rename` name and full session ID above the prompt, so you always know which session you're in. |
| [**agent-team**](plugins/agent-team) | Links the named sessions in the same git repository into a team. **Welcome:** when an agent joins, each teammate says hi with a brief of the work it's on, so the newcomer starts linked to its colleagues. **`/team`** lists your teammates and what each one is (or was last) working on. **`/tell`** messages a teammate directly, and agents coordinate on their own with `SendMessage`. |

The two work independently, and best together: name a session, see the name, and have it join its repository's team.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install session-label --marketplace srijonDatta/Name-Your-Agent
/plugin install agent-team --marketplace srijonDatta/Name-Your-Agent
```

Answer `y` to add the marketplace the first time, then press **Enter** to install at the user scope. Restart sessions that were already running.

<details>
<summary>Other ways to install</summary>

**From a shell:**

```
claude plugin install session-label --marketplace srijonDatta/Name-Your-Agent
claude plugin install agent-team --marketplace srijonDatta/Name-Your-Agent
```

**In the desktop app** (where `/plugin` isn't available): click **+** next to the prompt box, then **Plugins**, then **Add marketplace** with `srijonDatta/Name-Your-Agent`, then **Add plugin** for each mod.

</details>

## Quick start: a team of two agents

1. In two terminals, `cd` into the same repository and run `claude`. The folder a session starts in decides its team, so start every agent from inside the repository.
2. Name them: `/rename Backend Lead` in one and `/rename QA Lead` in the other. Each prompt shows its name, and Backend Lead is told that QA Lead joined. Within a minute, Backend Lead welcomes the newcomer with a brief of its own work, so QA Lead knows what its colleague is doing:
   ```
   [agent-team] Hi "QA Lead", I'm "Backend Lead" — welcome to the my-app team. What I'm working on:
   Preparing the database migration for the release / adding the missing index on orders.
   Message me by name with SendMessage.
   ```
3. Type `/team` to see your teammates, most recently active first, and what each one is working on, or last worked on if it's been idle:
   ```
   /team
   agent-team: You are "Backend Developer" on the my-app team (C:/work/my-app).

   Teammates:
     Backend Lead  ·  active now  ·  709328ba-f4c1-4b5e-bf7c-a05559eb7b10
         ↳ Waiting on you to approve the database migration plan: new index on orders, no downtime window needed.
           Staging deploy #214 still needs a smoke test, or re-sign the GitHub connector via /mcp.  (16 min ago)

     Operation Manager  ·  active 1 min ago  ·  93bddbb5-6441-4dc2-baf7-165f3a520f68
         ↳ Sent Backend Developer a briefing on the deploy freeze, staging branch rules and open tickets; next step is Part A (rel…
           Waiting on the release checklist sign-off before tagging v2.4.  (17 min ago)
   ```
4. Type `/tell Backend Lead can you re-run the integration tests?` to message a teammate directly, or ask either agent, in plain English, to hand work to the other.

Add more agents the same way at any time: each newcomer gets a hi from every agent already on the team. See [agent-team](plugins/agent-team#linking-your-agents-a-walkthrough) for the full walkthrough.

## Privacy and cost

- **Everything stays on your machine.** Session names come from Claude Code's own `/rename`. The team register lives in `~/.claude/agent-team/`, and activity is shown only to teammates on the same repository.
- **No extra service.** Messages travel over Claude Code's own session messaging, the same path its `SendMessage` tool uses.
- **Small, bounded model use.** agent-team writes the one- or two-line task summaries with a small model (Haiku): at most once every 3 minutes per session, plus one summary for an idle teammate when `/team` first shows it, cached until that teammate's history changes. Welcomes reuse the summary a teammate already has, so they cost no model call to send; the newcomer's agent reads each one like any other message. `/team` and `/tell` themselves make no model calls. session-label makes no model calls.
- **Peers aren't you.** A teammate's message arrives as a peer request. It can never approve actions or grant permissions on your behalf.

## Repository layout

```
.claude-plugin/marketplace.json   lists both mods, making this repository installable
plugins/session-label/            name and ID above the prompt
plugins/agent-team/               per-repository agent teams and messaging
```

## Development

```bash
git clone https://github.com/srijonDatta/Name-Your-Agent.git
cd Name-Your-Agent
claude plugin validate plugins/session-label && claude plugin test plugins/session-label
claude plugin validate plugins/agent-team && claude plugin test plugins/agent-team
```

## Changelog

**agent-team**
- **0.4.0:** Welcome from the team: when an agent joins, each live teammate sends it a hi with a brief of what it's working on, once per newcomer. Teammates already present when a session joins or restarts aren't greeted, and a rename isn't a new join.
- **0.3.1:** Fix: a session whose history file grew past 4 MiB (about a day of work) lost its name, stopped refreshing its entry and vanished from its teammates' `/team`, while still seeing them itself. History files are now read from the end in 1 MiB pieces. `/team` and the teammate list show the most recently active teammate first.
- **0.3.0:** Idle or restarted teammates show what they last worked on, summarized from their session history, instead of "No activity recorded yet". A session that joins backfills its own last work straight away.
- **0.2.0:** `/team` and each agent's teammate list show every teammate's current task in one or two lines.
- **0.1.0:** Per-repository teams, join and rename announcements, a duplicate-name warning, `/team` and `/tell`.

**session-label**
- **0.1.0:** The session's `/rename` name and full session ID are pinned above the prompt, follow `/rename` live, and come back on resume.

## License

[MIT](LICENSE) © 2026 srijonDatta
