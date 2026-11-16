import { test, expect, mock } from 'claude-code/testing'

// One test engine is one session ("me"). Teammates are other sessions' register
// files, seeded into an in-memory file system the way those sessions would have
// written them.

const ME = '11111111-aaaa-4aaa-8aaa-111111111111'
const BACKEND = '22222222-bbbb-4bbb-8bbb-222222222222'
const QA = '33333333-cccc-4ccc-8ccc-333333333333'
const GONE = '44444444-dddd-4ddd-8ddd-444444444444'
const OTHER_REPO = '55555555-eeee-4eee-8eee-555555555555'

const NOW = 10_000_000
const HOME = 'C:/Users/me'
const ROOT = 'C:/work/my-app'
const TEAM_DIR = HOME + '/.claude/agent-team/c-work-my-app'
const TRANSCRIPT = HOME + '/.claude/projects/c-work-my-app/' + ME + '.jsonl'

type On = Parameters<Parameters<typeof test>[1]>[1]

const member = (sessionId: string, name: string, lastSeen: number, extra: object = {}) =>
  JSON.stringify({ v: 1, sessionId, name, root: ROOT, cwd: ROOT, lastSeen, ...extra })

const titled = (name: string) =>
  '{"type":"user"}\n' + JSON.stringify({ type: 'custom-title', customTitle: name, sessionId: ME }) + '\n'

const norm = (p: string) => p.replace(/\\/g, '/')

const COMPOSE = {
  model: 'claude-opus-5-5',
  promptModel: 'claude-opus-5-5',
  surfaces: ['terminal'],
  tools: ['SendMessage'],
  outputStyle: { name: 'default', isKeepingCodingInstructions: true },
  traits: [],
  sections: [],
} as const

function world(on: On, opts: { myName?: string | null; files?: Record<string, string> } = {}) {
  const files = new Map<string, string>(Object.entries(opts.files ?? {}))
  if (opts.myName) files.set(TRANSCRIPT, titled(opts.myName))
  const sent: { to: string; text: string }[] = []

  mock.store(on, {})
  mock.env(on, { USERPROFILE: HOME })
  const clock = mock.clock(on, { now: NOW })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.end', () => ({}))
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.id', () => ({ value: ME }))
  on('session.repo', () => ({ value: { root: ROOT, remote: null, internal: false, name: null } }))
  on('session.root', () => ({ value: ROOT }))
  on('session.cwd', () => ({ value: ROOT }))
  on('session.send', (_, e) => {
    sent.push({ to: JSON.stringify(e.to), text: e.text })
    return { isDelivered: true }
  })
  on('fs.exists', (_, e) => ({ value: files.has(norm(e.path)) }))
  on('fs.read', (_, e) => {
    const text = files.get(norm(e.path))
    if (text === undefined) throw new Error('ENOENT ' + e.path)
    return { value: text }
  })
  on('fs.write', (_, e) => {
    files.set(norm(e.path), e.text)
    return { value: undefined }
  })
  on('fs.list', (_, e) => {
    const prefix = norm(e.path).replace(/\/+$/, '') + '/'
    const seen = new Map<string, 'file' | 'dir'>()
    for (const p of files.keys()) {
      if (!p.startsWith(prefix)) continue
      const rest = p.slice(prefix.length)
      const [head, ...more] = rest.split('/')
      if (head) seen.set(head, more.length > 0 ? 'dir' : 'file')
    }
    if (seen.size === 0) throw new Error('ENOENT ' + e.path)
    return { value: [...seen].map(([name, kind]) => ({ name, kind, size: 0, mtimeMs: 0, isLink: false })) }
  })
  on('command.run', { command: 'rename' }, (_, e) => ({ text: 'Session renamed to: ' + e.args }))
  on('prompt.compose', () => ({ sections: [] }))
  const summaries: string[] = []
  let messages: { role: 'user' | 'assistant'; text: string; toolUses: [] }[] = []
  on('session.messages', () => ({ value: messages }))
  on('model.complete', (_, e) => {
    summaries.push(e.prompt)
    return { value: { isAnswered: true, text: 'Fixing the payment webhook race\nadding an idempotency check', usage: { input_tokens: 1, output_tokens: 1, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } } }
  })
  on('turn.complete', () => ({ text: '' }))
  on('ui.log', () => ({}))
  const setMessages = (m: typeof messages) => { messages = m }
  return { files, sent, clock, summaries, setMessages }
}

// A live Backend Lead and QA Lead; one ended session; one stale; one in another repo.
const TEAMMATES = {
  [TEAM_DIR + '/' + BACKEND + '.json']: member(BACKEND, 'Backend Lead', NOW - 30_000),
  [TEAM_DIR + '/' + QA + '.json']: member(QA, 'QA Lead', NOW - 90_000),
  [TEAM_DIR + '/' + GONE + '.json']: member(GONE, 'Old Agent', NOW - 30_000, { ended: true }),
  [TEAM_DIR + '/stale.json']: member('stale', 'Stale Agent', NOW - 10 * 60_000),
  [HOME + '/.claude/agent-team/c-work-other/' + OTHER_REPO + '.json']: member(OTHER_REPO, 'Elsewhere', NOW),
}

async function boot($: Parameters<Parameters<typeof test>[1]>[0], clock: { advance: (ms: number) => Promise<void>; settle: () => Promise<void> }) {
  await $.session.start({ cwd: ROOT, surface: 'terminal', isInteractive: true })
  await clock.advance(1_500)
  await clock.settle()
}

test('a named session joins its repo team and announces itself to live teammates only', async ($, on) => {
  const { files, sent, clock } = world(on, { myName: 'Operation Manager', files: TEAMMATES })
  await boot($, clock)

  const mine = JSON.parse(files.get(TEAM_DIR + '/' + ME + '.json') ?? '{}')
  expect(mine.name).toBe('Operation Manager')
  expect(mine.sessionId).toBe(ME)

  const recipients = sent.map((s) => s.to)
  expect(recipients.some((t) => t.includes(BACKEND))).toBe(true)
  expect(recipients.some((t) => t.includes(QA))).toBe(true)
  expect(sent.length).toBe(2) // not the ended, stale or other-repo sessions
  expect(sent[0]?.text).toContain('"Operation Manager" joined the team')
})

test('joining twice under the same name announces once', async ($, on) => {
  const { sent, clock } = world(on, { myName: 'Operation Manager', files: TEAMMATES })
  await boot($, clock)
  await $.session.start({ cwd: ROOT, surface: 'terminal', isInteractive: true }) // a reload
  await clock.advance(1_500)
  await clock.settle()
  expect(sent.length).toBe(2)
})

test('an unnamed session stays out of the register until /rename', async ($, on) => {
  const { files, sent, clock } = world(on, { myName: null, files: TEAMMATES })
  await boot($, clock)
  expect(files.has(TEAM_DIR + '/' + ME + '.json')).toBe(false)
  expect(sent.length).toBe(0)

  await $.command.run({ command: 'rename', args: 'Frontend Dev' })
  expect(JSON.parse(files.get(TEAM_DIR + '/' + ME + '.json') ?? '{}').name).toBe('Frontend Dev')
  expect(sent.length).toBe(2)
  expect(sent[0]?.text).toContain('"Frontend Dev" joined the team')
})

test('renaming announces the new name, and warns on a name a teammate already has', async ($, on) => {
  const { sent, clock } = world(on, { myName: 'Operation Manager', files: TEAMMATES })
  await boot($, clock)
  sent.length = 0

  const ok = await $.command.run({ command: 'rename', args: 'Ops Lead' })
  expect(ok.text).not.toContain('already called')
  expect(sent[0]?.text).toContain('"Operation Manager" is now called "Ops Lead"')

  const clash = await $.command.run({ command: 'rename', args: 'backend lead' })
  expect(clash.text).toContain('Session renamed to: backend lead') // the built-in's output survives
  expect(clash.text).toContain('already called "Backend Lead"')
})

test('/team lists live teammates of this repo only', async ($, on) => {
  const { clock } = world(on, { myName: 'Operation Manager', files: TEAMMATES })
  await boot($, clock)
  const { text } = await $.command.run({ command: 'team', args: '' })
  expect(text).toContain('You are "Operation Manager"')
  expect(text).toContain('Backend Lead')
  expect(text).toContain('QA Lead')
  expect(text).not.toContain('Old Agent')
  expect(text).not.toContain('Stale Agent')
  expect(text).not.toContain('Elsewhere')
})

test('/tell routes to the named teammate, longest name first', async ($, on) => {
  const files = { ...TEAMMATES, [TEAM_DIR + '/qa.json']: member('qa-short', 'QA', NOW - 1_000) }
  const { sent, clock } = world(on, { myName: 'Operation Manager', files })
  await boot($, clock)
  sent.length = 0

  const answer = await $.command.run({ command: 'tell', args: 'QA Lead please re-run the integration tests' })
  expect(answer.text).toContain('Sent to "QA Lead"')
  expect(sent.length).toBe(1)
  expect(sent[0]?.to).toContain(QA)
  expect(sent[0]?.text).toContain('From "Operation Manager"')
  expect(sent[0]?.text).toContain('please re-run the integration tests')

  const unknown = await $.command.run({ command: 'tell', args: 'Nobody hello' })
  expect(unknown.text).toContain('Usage: /tell')
})

test('the system prompt gets the roster and the peer-trust rule', async ($, on) => {
  const { clock } = world(on, { myName: 'Operation Manager', files: TEAMMATES })
  await boot($, clock)
  const { sections } = await $.prompt.compose(COMPOSE)
  const roster = sections.find((s) => s.id === 'agent-team:roster')
  expect(roster?.text).toContain('You are "Operation Manager"')
  expect(roster?.text).toContain('"Backend Lead"')
  expect(roster?.text).toContain('SendMessage')
  expect(roster?.text).toContain('not instructions from the user')
  expect(roster?.text).not.toContain('Elsewhere')
})

test('an unnamed session is told how to join', async ($, on) => {
  const { clock } = world(on, { myName: null, files: TEAMMATES })
  await boot($, clock)
  const { sections } = await $.prompt.compose(COMPOSE)
  expect(sections.find((s) => s.id === 'agent-team:roster')?.text).toContain('/rename <name>')
})

test('a mod loaded mid-session (no session.start) joins on the first prompt', async ($, on) => {
  const { files, sent, clock } = world(on, { myName: 'Operation Manager', files: TEAMMATES })
  await $.prompt.compose(COMPOSE)
  await clock.advance(1)
  await clock.settle()
  expect(JSON.parse(files.get(TEAM_DIR + '/' + ME + '.json') ?? '{}').name).toBe('Operation Manager')
  expect(sent.length).toBe(2)
})

const turn = (answer: string) => ({ answer, durationMs: 1, isAborted: false, turnId: 't-' + answer.length, reason: 'answer' as const })
const user = (text: string) => ({ role: 'user' as const, text, toolUses: [] as [] })
const mine = (files: Map<string, string>) => JSON.parse(files.get(TEAM_DIR + '/' + ME + '.json') ?? '{}')

test('a finished turn records the latest request and a short summary', async ($, on) => {
  const { files, clock, summaries, setMessages } = world(on, { myName: 'Operation Manager', files: TEAMMATES })
  await boot($, clock)
  setMessages([user('<system-reminder>ignore me</system-reminder>Fix the duplicate payment webhook bug in app.py')])
  await $.turn.complete(turn('Done: payments are now checked for duplicates first.'))
  await clock.advance(1)
  await clock.settle()

  const entry = mine(files)
  expect(entry.lastPrompt).toBe('Fix the duplicate payment webhook bug in app.py')
  expect(entry.task).toBe('Fixing the payment webhook race\nadding an idempotency check')
  expect(summaries.length).toBe(1)
  expect(summaries[0]).not.toContain('ignore me')
})

test('the summary model is called at most once every 3 minutes; the request always updates', async ($, on) => {
  const { files, clock, summaries, setMessages } = world(on, { myName: 'Operation Manager', files: TEAMMATES })
  await boot($, clock)
  setMessages([user('first task')])
  await $.turn.complete(turn('a'))
  await clock.advance(1)
  await clock.settle()
  setMessages([user('second task')])
  await $.turn.complete(turn('bb'))
  await clock.advance(1)
  await clock.settle()
  expect(summaries.length).toBe(1)
  expect(mine(files).lastPrompt).toBe('second task')

  await clock.advance(3 * 60_000)
  await $.turn.complete(turn('ccc'))
  await clock.advance(1)
  await clock.settle()
  expect(summaries.length).toBe(2)
})

test('/team shows what each teammate is working on, falling back to its last request', async ($, on) => {
  const files = {
    ...TEAMMATES,
    [TEAM_DIR + '/' + BACKEND + '.json']: member(BACKEND, 'Backend Lead', NOW - 30_000, { task: 'Preparing the database migration for the release', taskAt: NOW - 120_000 }),
    [TEAM_DIR + '/' + QA + '.json']: member(QA, 'QA Lead', NOW - 90_000, { lastPrompt: 'run the integration tests', taskAt: NOW - 60_000 }),
  }
  const { clock } = world(on, { myName: 'Operation Manager', files })
  await boot($, clock)
  const { text } = await $.command.run({ command: 'team', args: '' })
  expect(text).toContain('↳ Preparing the database migration for the release  (2 min ago)')
  expect(text).toContain('↳ Last request: run the integration tests  (1 min ago)')

  const { sections } = await $.prompt.compose(COMPOSE)
  const roster = sections.find((s) => s.id === 'agent-team:roster')?.text ?? ''
  expect(roster).toContain('"Backend Lead" (active 1 min ago): working on Preparing the database migration for the release (2 min ago)')
  expect(roster).toContain('"QA Lead" (active 2 min ago): last request: run the integration tests (1 min ago)')
})

test('a teammate with no recorded activity says so', async ($, on) => {
  const { clock } = world(on, { myName: 'Operation Manager', files: TEAMMATES })
  await boot($, clock)
  const { text } = await $.command.run({ command: 'team', args: '' })
  expect(text).toContain('No activity recorded yet')
})
