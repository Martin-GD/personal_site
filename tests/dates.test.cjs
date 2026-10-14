const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

process.env.TZ = 'America/New_York';
const elements = new Map();
const context = vm.createContext({
  document: {
    querySelector(selector) {
      if (!elements.has(selector)) elements.set(selector, { addEventListener() {}, classList: { add() {} } });
      return elements.get(selector);
    },
    querySelectorAll() { return []; },
  },
  fetch: () => new Promise(() => {}),
});
vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/app.js'), 'utf8'), context);
const evaluate = (code) => vm.runInContext(code, context);

test('calendar weekday is independent of the browser timezone', () => {
  assert.equal(evaluate('formatDate("2026-09-01", true)'), '09/01 周二');
});

test('record intervals preserve start-of-day and end-of-day boundaries', () => {
  assert.equal(evaluate('minutesOfDay("2026-09-03T00:00:00+08:00", "2026-09-03")'), 0);
  assert.equal(evaluate('minutesOfDay("2026-09-04T00:00:00+08:00", "2026-09-03")'), 1440);
  assert.equal(evaluate('minutesOfDay("2026-09-03T14:00:00Z", "2026-09-03")'), 1320);
  assert.equal(evaluate('formatClock(1440)'), '24:00');
});

test('seven-day presets retain calendar dates outside Beijing', () => {
  assert.equal(evaluate('(() => { const date = new Date("2026-10-12T00:00:00Z"); date.setUTCDate(date.getUTCDate() - 6); return toIsoDate(date); })()'), '2026-10-06');
});

test('a late-night interval fills the final two hours of the timeline', () => {
  evaluate(`state.filtered = [{ date: '2026-09-03', active_total_seconds: 7200, day_final_state: 'on', active_intervals: [{ start: '2026-09-03T22:00:00+08:00', end: '2026-09-04T00:00:00+08:00', seconds: 7200 }] }]; renderDayDetail('2026-09-03'); renderTimeDistribution(state.filtered);`);
  assert.equal(elements.get('#dayLastEnd').textContent, '24:00');
  const width = Number(elements.get('#dayTimeline').innerHTML.match(/width:([\d.]+)%/)[1]);
  assert.ok(Math.abs(width - 100 / 12) < .01);
  assert.match(elements.get('#timeDistribution').innerHTML, /23:00 · 60 分钟/);
});
