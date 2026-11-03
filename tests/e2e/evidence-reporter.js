import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

// Actual runner results, regenerated on each run; never pre-marks a scenario PASS.
export default class EvidenceReporter {
  rows = []

  onBegin() {
    this.startedAt = new Date().toISOString()
  }

  onTestEnd(test, result) {
    const root = path.resolve('test-results')
    const folder = path.join(root, 'browser-evidence', test.id.replace(/[^a-z0-9-]/gi, '_'))
    fs.mkdirSync(folder, { recursive: true })
    const evidence = []
    for (const [index, attachment] of result.attachments.entries()) {
      if (attachment.body) {
        const ext = attachment.contentType === 'image/png' ? '.png' : '.json'
        const file = path.join(folder, `${index}-${attachment.name.replace(/[^a-z0-9.-]/gi, '_')}${ext}`)
        fs.writeFileSync(file, attachment.body)
        evidence.push({ name: attachment.name, path: path.relative(root, file) })
      } else if (attachment.path) {
        evidence.push({ name: attachment.name, path: path.relative(root, attachment.path) })
      }
    }
    this.rows.push({ scenario: test.title, project: test.parent.project().name,
      expected: test.title.includes(': ') ? test.title.split(': ').slice(1).join(': ') : test.title,
      actual: result.status === 'passed' ? 'All assertions passed' : result.status,
      status: result.status, durationMs: result.duration, evidence })
  }

  onEnd(result) {
    const root = path.resolve('test-results')
    fs.mkdirSync(root, { recursive: true })
    const metadata = { startedAt: this.startedAt, finishedAt: new Date().toISOString(),
      status: result.status, baseCommit: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      uncommittedChanges: Boolean(execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()),
      scope: this.rows.some(row => row.project === 'live')
        ? 'Live browser workflow against an explicitly configured Supabase test environment. Real authentication, fixture writes and credit transfers; signup and concurrent requests are outside this scenario.'
        : 'Browser UI checks. Regression project uses synthetic sessions and simulated Supabase; no real backend verification.',
      rows: this.rows }
    const escape = value => value.replace(/\|/g, '\\|').replace(/\n/g, ' ')
    const lines = ['# Browser regression execution evidence', '',
      `Run: ${metadata.startedAt} · Overall: ${metadata.status} · Base commit: ${metadata.baseCommit}`, '',
      'Working tree changes are included in this run; the base commit alone does not identify the tested source.', '',
      metadata.scope, '', '[Interactive HTML report](../playwright-report/index.html)', '',
      '| Scenario | Expected result | Actual result | Status | Supporting evidence |',
      '| --- | --- | --- | --- | --- |',
      ...this.rows.map(row => `| ${escape(row.scenario)} | ${escape(row.expected)} | ${row.actual} (${row.durationMs} ms) | ${row.status.toUpperCase()} | ${row.evidence.map(item => `[${item.name}](${item.path})`).join(', ') || 'HTML report'} |`), '']
    fs.writeFileSync(path.join(root, 'browser-matrix.md'), lines.join('\n'))
    fs.writeFileSync(path.join(root, 'browser-matrix.json'), JSON.stringify(metadata, null, 2) + '\n')
  }
}
