import { test, expect, mock } from 'claude-code/testing'

const ID = 'f14579ec-a094-46cc-ab9e-9fae6aa6e14b'
const BAND = { component: 'AbovePrompt', props: { hasSurvey: false } } as const
const SURFACES = ['terminal', 'desktop'] as const

// The world beneath the plugin: each hook here stands for the engine. A call on
// `$` is answered `{ value }`; an event by its own result. `transcript` is the
// session file's text, or null for "no transcript found".
const world = (
  on: Parameters<Parameters<typeof test>[1]>[1],
  transcript: string | null = null,
  store: Record<string, unknown> = {},
) => {
  mock.store(on, store)
  mock.env(on, {})
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('command.register', () => ({ value: { command: 'session-name' } }))
  on('session.id', () => ({ value: ID }))
  on('fs.list', () => ({ value: [{ name: 'some-project', kind: 'dir', size: 0, mtimeMs: 0, isLink: false }] }))
  on('fs.exists', () => ({ value: transcript !== null }))
  on('fs.read', () => {
    if (transcript === null) throw new Error('missing')
    return { value: transcript }
  })
  // Stands in for the built-in /rename beneath the mod.
  on('command.run', { command: 'rename' }, (_, e) => ({ text: 'Session renamed to: ' + e.args }))
  // Stands in for the engine's own drawing, so a yield is observable.
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine drew this</Text>
  })
}

const start = ($: Parameters<Parameters<typeof test>[1]>[0]) =>
  $.session.start({ cwd: '/', surface: 'terminal', isInteractive: true })

const titleRow = (name: string) => JSON.stringify({ type: 'custom-title', customTitle: name, sessionId: ID })

test('an unnamed session shows its FULL id and no "unnamed" note', async ($, on) => {
  world(on)
  await start($)

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ plugin: 'session-label', surface, ...BAND })
    expect(await ui.find({ type: 'Text', text: new RegExp(ID) })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: /unnamed/ })).toBeUndefined()
    await ui.unmount()
  }
})

test('/rename puts the new name in the band, beside the id', async ($, on) => {
  world(on)
  await start($)

  const answer = await $.command.run({ command: 'rename', args: 'Operation Manager' })
  expect(answer.text).toContain('Operation Manager') // the built-in's own output survives

  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ plugin: 'session-label', surface, ...BAND })
    expect(await ui.find({ type: 'Text', text: /Operation Manager/ })).toBeDefined()
    expect(await ui.find({ type: 'Text', text: new RegExp(ID) })).toBeDefined()
    await ui.unmount()
  }
})

test('a name given before the mod loaded is read from the transcript, newest wins', async ($, on) => {
  const transcript = ['{"type":"user"}', titleRow('Old Name'), '{"type":"user"}', titleRow('Operation Manager'), ''].join('\n')
  world(on, transcript)
  await start($)

  const ui = await $.ui.mount({ plugin: 'session-label', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /Operation Manager/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Old Name/ })).toBeUndefined()
  await ui.unmount()
})

test('an unreadable transcript falls back to the stored name', async ($, on) => {
  world(on, null, { ['name:' + ID]: 'Stored Name' })
  await start($)

  const ui = await $.ui.mount({ plugin: 'session-label', surface: 'terminal', ...BAND })
  expect(await ui.find({ type: 'Text', text: /Stored Name/ })).toBeDefined()
  await ui.unmount()
})

test('/session-name reports, and points a naming attempt at /rename', async ($, on) => {
  world(on)
  await start($)
  await $.command.run({ command: 'rename', args: 'Operation Manager' })

  const report = await $.command.run({ command: 'session-name', args: '' })
  expect(report.text).toContain('Operation Manager')
  expect(report.text).toContain(ID)

  const asked = await $.command.run({ command: 'session-name', args: 'Something Else' })
  expect(asked.text).toContain('/rename Something Else')
})

test('the band yields to a survey', async ($, on) => {
  world(on)
  await start($)

  const ui = await $.ui.mount({
    plugin: 'session-label',
    surface: 'terminal',
    component: 'AbovePrompt',
    props: { hasSurvey: true },
  })
  expect(await ui.find({ type: 'Text', text: /engine drew this/ })).toBeDefined()
  await ui.unmount()
})
