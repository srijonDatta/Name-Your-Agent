# session-label

A Claude Code mod that shows your session's name and its full session id, right-aligned in the band just above the prompt:

```
                                   Operation Manager d8300d65-e6e0-4e87-87b5-f14a75cc0ab0
```

The name is whatever you set with Claude Code's built-in `/rename`. The band updates as soon as you rename, and the name comes back when you resume the session. A session with no name shows its full id alone. Use the full id to find a session again, or to tell several sessions apart when you run more than one.

`/session-name` prints the current name and full id.

## Install

At the prompt of a Claude Code terminal session:

```
/plugin install session-label --marketplace srijonDatta/Name-Your-Agent
```

Answer `y` to add the marketplace, then press Enter to install at the user scope. The band appears straight away and in every session you start after that.

From a shell:

```
claude plugin install session-label --marketplace srijonDatta/Name-Your-Agent
```

In the desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `srijonDatta/Name-Your-Agent`, then **Add plugin**.

## Notes

- The `[-]` beside the band is Claude Code's own collapse button (`ctrl+x ctrl+a`), not part of this mod.
- Claude Code gives mods no way to read the session name directly. So the mod picks it up as `/rename` runs, and at start-up reads the newest name `/rename` saved in the session's own file. The last name it saw is also kept as a fallback.
