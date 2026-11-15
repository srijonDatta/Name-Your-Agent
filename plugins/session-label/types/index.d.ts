// The label this mod draws: the session's own id, and the name given to it (null
// until one is set). One value, so a write redraws the band and nothing else.
export type SessionLabel = { id: string; name: string | null }

declare module 'claude-code' {
  interface PluginState {
    'session-label': { label: SessionLabel | null }
  }
}
