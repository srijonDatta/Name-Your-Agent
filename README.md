# Name Your Agent

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
![Claude Code mods](https://img.shields.io/badge/Claude%20Code-mods-d97757)
![Tested on Claude Code 2.1.325](https://img.shields.io/badge/tested%20on-2.1.325-blue)

> Claude Code mods for running several named agents side by side: see each session's name and ID, and link the agents on one repository into a team that can message each other.

| Mod | What it does |
| --- | --- |
| [**session-label**](plugins/session-label) | Pins the session's `/rename` name and full session ID above the prompt, so you always know which session you're in. |
| [**agent-team**](plugins/agent-team) | Links the named sessions in the same git repository into a team. Agents are introduced to each other, know their teammates, and can message them with `SendMessage`, `/team` and `/tell`. |

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

1. In two terminals, `cd` into the same repository and run `claude`.
2. Name them: `/rename Backend Lead` in one and `/rename QA Lead` in the other. Each prompt shows its name, and Backend Lead is told that QA Lead joined.
3. Type `/team` to see your teammates, and `/tell Backend Lead hi` to message one.
4. Ask either agent, in plain English, to hand work to the other.

Add more agents the same way at any time. See [agent-team](plugins/agent-team#linking-your-agents-a-walkthrough) for the full walkthrough.

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

## License

[MIT](LICENSE) © 2026 srijonDatta
