import { atom, read, update } from 'claude-code'
import type { EngineInterface as Engine, Register } from 'claude-code'

import type { SessionLabel } from '../types'

// Shows the session's name beside its FULL session id, right-aligned in the band
// directly above the prompt. With no name, the id alone.
//
// WHERE THE NAME COMES FROM. Claude Code's own `/rename` is the source of truth.
// The engine gives a plugin no getter for that name (`$.session` has the id but
// no title), so this mod learns it two ways:
//   1. Live: it wraps the built-in `/rename` (`command.run` reaches built-ins),
//      lets it run, then takes the name from what it printed.
//   2. At start: `/rename` writes a `{"type":"custom-title"}` record into the
//      session's transcript file, so the newest one there is the current name.
//      That covers resumed sessions and names given while this mod was off.
// The last name seen is also kept in `$.store` under the session id, the fallback
// when the transcript cannot be read (moved, or past `$.fs.read`'s 4 MiB cap).
//
// History: an earlier version kept a name of its own, set only by its own
// `/session-name`, and drew "unnamed" otherwise, so a `/rename` never reached
// the band. `/session-name` now only reports; naming is `/rename`'s.
//
// WHERE IT CAN GO. The band above the prompt is the only site that stays (the
// status line sits under the prompt, a toast fades, a Pane docks). Its `[-]` is
// the engine's collapse control for the band (ctrl+x ctrl+a), not this mod's.

// Written on hydration and on every /rename; a write redraws the band, which
// `$.store` alone does not.
const label = atom({ plugin: 'session-label', key: 'label' } as const, null)

const storeKey = (id: string) => 'name:' + id

// What `/rename` prints: "Session renamed to: <name>".
const RENAMED = /renamed to:\s*(.+?)\s*$/im

// The config dir is the one holding `mods/<this mod>`; transcripts live in its
// `projects/<project>/<session id>.jsonl`. CLAUDE_CONFIG_DIR wins when set.
async function projectsDir($: Engine): Promise<string | null> {
  try {
    const configured = await $.env.get('CLAUDE_CONFIG_DIR')
    if (typeof configured === 'string' && configured.length > 0) {
      return configured.replace(/[\\/]+$/, '') + '/projects'
    }
  } catch {
    // fall through to the path beside this mod
  }
  const parts = $.plugin.root.split(/[\\/]+/)
  if (parts.length < 3) return null
  return parts.slice(0, -2).join('/') + '/projects'
}

// The newest `/rename` name recorded in this session's transcript, or null.
// Never throws: any failure means "not found here", and the store is used.
async function titleFromTranscript($: Engine, id: string): Promise<string | null> {
  try {
    const projects = await projectsDir($)
    if (projects === null) return null
    for (const entry of await $.fs.list(projects)) {
      if (entry.kind !== 'dir') continue
      const file = projects + '/' + entry.name + '/' + id + '.jsonl'
      if (!(await $.fs.exists(file))) continue
      const lines = (await $.fs.read(file)).split('\n')
      for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i]
        if (!line.includes('"custom-title"')) continue
        try {
          const row = JSON.parse(line)
          if (row?.type === 'custom-title' && typeof row.customTitle === 'string') {
            const title = row.customTitle.trim()
            return title.length > 0 ? title : null
          }
        } catch {
          // a torn line: keep looking further up
        }
      }
      return null // the transcript was found and holds no name
    }
  } catch {
    // unreadable: the store answers instead
  }
  return null
}

async function remember($: Engine, id: string, name: string) {
  await $.store.set(storeKey(id), name)
  await update($, label, () => ({ id, name }) as SessionLabel)
}

// The label to draw. Reads the id and the stored name directly when no hook has
// filled the atom yet, so nothing can leave the band blank except having no id.
async function currentLabel($: Engine): Promise<SessionLabel | null> {
  const held = await read($, label)
  if (held !== null) return held as SessionLabel

  try {
    const id = await $.session.id()
    if (typeof id !== 'string' || id.length === 0) return null
    const stored = await $.store.get(storeKey(id))
    const name = typeof stored === 'string' && stored.length > 0 ? stored : null
    return { id, name } as SessionLabel
  } catch {
    return null
  }
}

export const register: Register = (on) => {
  on('session.start', async ($, e, next) => {
    try {
      await $.command.register({
        name: 'session-name',
        description: "Show this session's name and full id (rename with /rename)",
      })
    } catch {
      // The band draws without the command.
    }
    try {
      const id = await $.session.id()
      const title = await titleFromTranscript($, id)
      if (title !== null) await remember($, id, title)
    } catch {
      // The band falls back to the stored name, or the id alone.
    }
    return next(e)
  })

  // The built-in /rename runs first and untouched; the band follows what it set.
  on('command.run', { command: 'rename' }, async ($, e, next) => {
    const result = await next(e)
    try {
      const printed = typeof result?.text === 'string' ? RENAMED.exec(result.text)?.[1] : undefined
      const name = (printed ?? e.args).trim()
      if (name.length > 0) await remember($, await $.session.id(), name)
    } catch {
      // The rename itself already happened; only the band would lag.
    }
    return result
  })

  on('command.run', { command: 'session-name' }, async ($, e) => {
    const id = await $.session.id()
    const current = await currentLabel($)
    const name = current?.name
    const asked = e.args.trim()
    return {
      text:
        (asked.length > 0 ? 'Names now follow Claude Code: use /rename ' + asked + '\n\n' : '') +
        (name ? 'This session is "' + name + '"\nFull id: ' + id : 'This session has no name yet.\nFull id: ' + id) +
        (asked.length > 0 ? '' : '\n\nRename with /rename <name>'),
    }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const current = await currentLabel($)

    // Yield the band to a survey, and draw nothing when there is no id to show.
    if (e.props.hasSurvey || current === null) return next(e)

    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box justifyContent="flex-end">
        {current.name ? <Text bold>{current.name} </Text> : null}
        <Text dimColor>{current.id}</Text>
      </Box>
    )
  })
}
