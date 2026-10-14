(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  window.lucide?.createIcons();
  $('#year').textContent = new Intl.DateTimeFormat('en', { timeZone: 'Asia/Shanghai', year: 'numeric' }).format(new Date());

  const portrait = $('#portraitStage');
  const revealToggle = $('#revealToggle');
  function peek(event) {
    if (portrait.classList.contains('is-pinned')) return;
    const rect = portrait.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    // Restrict the lens to the head, where the two images differ.
    const onHead = x > rect.width * .24 && x < rect.width * .77 && y < rect.height * .34 && y > rect.height * .02;
    portrait.style.setProperty('--reveal-x', `${x}px`);
    portrait.style.setProperty('--reveal-y', `${y}px`);
    portrait.style.setProperty('--reveal-size', onHead ? `${Math.max(48, rect.width * .16)}px` : '0px');
    portrait.classList.toggle('is-peeking', onHead);
  }
  function clearPeek() {
    portrait.classList.remove('is-peeking');
    portrait.style.setProperty('--reveal-size', '0px');
  }
  portrait.addEventListener('pointermove', peek);
  portrait.addEventListener('pointerdown', peek);
  portrait.addEventListener('pointerleave', clearPeek);
  portrait.addEventListener('pointercancel', clearPeek);
  revealToggle.addEventListener('click', () => {
    const pinned = portrait.classList.toggle('is-pinned');
    revealToggle.setAttribute('aria-pressed', String(pinned));
    revealToggle.setAttribute('aria-label', pinned ? '显示头盔' : '显示人脸');
    revealToggle.title = pinned ? '显示头盔' : '显示人脸';
    clearPeek();
  });

  const menu = $('#menuDialog');
  function openDialog(dialog) { dialog.showModal(); document.body.classList.add('dialog-open'); }
  $('#menuToggle').addEventListener('click', () => openDialog(menu));
  document.querySelectorAll('[data-close]').forEach((button) => button.addEventListener('click', () => document.getElementById(button.dataset.close).close()));
  menu.addEventListener('close', () => document.body.classList.remove('dialog-open'));
  menu.addEventListener('click', (event) => {
    const box = menu.getBoundingClientRect();
    if (event.target === menu && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) menu.close();
  });
  menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => menu.close()));
  if (!reducedMotion.matches && 'IntersectionObserver' in window) {
    document.documentElement.classList.add('motion-enabled');
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
    }), { threshold: .08 });
    document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));
  }
  let scrollPending = false;
  function updateScroll() {
    const total = document.documentElement.scrollHeight - innerHeight;
    document.documentElement.style.setProperty('--page-progress', String(total > 0 ? scrollY / total : 0));
    if (!reducedMotion.matches && innerWidth > 620 && scrollY < $('#home').offsetHeight) portrait.style.setProperty('--portrait-scroll', `${Math.min(35, scrollY * .055)}px`);
    scrollPending = false;
  }
  addEventListener('scroll', () => { if (!scrollPending) { scrollPending = true; requestAnimationFrame(updateScroll); } }, { passive: true });
  updateScroll();

  const data = { records: [], months: [], month: '', selectedDate: '' };
  const duration = (seconds) => {
    const value = Math.max(0, Math.round(Number(seconds) || 0));
    return `${Math.floor(value / 3600)}h ${String(Math.floor(value % 3600 / 60)).padStart(2, '0')}m`;
  };
  const exactDuration = (seconds) => {
    const value = Math.max(0, Math.round(Number(seconds) || 0));
    return [Math.floor(value / 3600), Math.floor(value % 3600 / 60), value % 60].map((part) => String(part).padStart(2, '0')).join(':');
  };
  const clock = (seconds) => {
    const value = Math.max(0, Math.min(86400, Math.floor(seconds)));
    return [Math.floor(value / 3600), Math.floor(value % 3600 / 60), value % 60].map((part) => String(part).padStart(2, '0')).join(':');
  };
  function validDate(value) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value; }
  function intervalsFor(record) {
    const midnight = Date.parse(`${record.date}T00:00:00+08:00`);
    return (Array.isArray(record.active_intervals) ? record.active_intervals : []).flatMap((interval) => {
      const start = Math.max(0, (Date.parse(interval?.start) - midnight) / 1000);
      const end = Math.min(86400, (Date.parse(interval?.end) - midnight) / 1000);
      if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];
      // Keep the collector's seconds; rounded timestamps can differ by a second.
      const seconds = Number.isFinite(interval.seconds) && interval.seconds >= 0 ? interval.seconds : end - start;
      return [{ start, end, seconds, open: interval.open === true }];
    }).sort((a, b) => a.start - b.start);
  }
  function levelFor(seconds) { return seconds <= 0 ? 0 : seconds < 7200 ? 1 : seconds < 14400 ? 2 : seconds < 21600 ? 3 : 4; }
  function renderMonth() {
    const records = data.records.filter((record) => record.date.startsWith(data.month));
    const byDate = new Map(records.map((record) => [record.date, record]));
    const total = records.reduce((sum, record) => sum + record.active_total_seconds, 0);
    const best = records.reduce((current, record) => !current || record.active_total_seconds > current.active_total_seconds ? record : current, null);
    $('#monthTotal').textContent = (total / 3600).toFixed(1);
    $('#monthAverage').textContent = (records.length ? total / records.length / 3600 : 0).toFixed(1);
    $('#monthActive').textContent = String(records.filter((record) => record.active_total_seconds > 0).length);
    $('#monthCount').textContent = `${records.length} 天有记录`;
    $('#monthLongest').textContent = ((best?.active_total_seconds || 0) / 3600).toFixed(1);
    $('#monthLongestDate').textContent = best ? `${best.date} / 小时` : '无记录';
    $('#monthSelect').value = data.month;
    const monthIndex = data.months.indexOf(data.month);
    $('#previousMonth').disabled = monthIndex <= 0;
    $('#nextMonth').disabled = monthIndex >= data.months.length - 1;
    if (!data.selectedDate.startsWith(data.month)) data.selectedDate = records.at(-1)?.date || `${data.month}-01`;
    const first = new Date(`${data.month}-01T00:00:00Z`);
    const offset = (first.getUTCDay() + 6) % 7;
    const numberOfDays = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    const cells = [];
    for (let index = 0; index < 42; index += 1) {
      const day = index - offset + 1;
      if (day < 1 || day > numberOfDays) { cells.push('<span aria-hidden="true"></span>'); continue; }
      const date = `${data.month}-${String(day).padStart(2, '0')}`;
      const record = byDate.get(date);
      const seconds = record?.active_total_seconds || 0;
      const label = `${date}，${record ? `在席 ${duration(seconds)}` : '无记录'}`;
      cells.push(`<button type="button" class="calendar-day${record ? '' : ' is-missing'}" data-date="${date}" data-level="${levelFor(seconds)}" aria-pressed="${date === data.selectedDate}" aria-label="${label}" title="${label}"><span>${day}</span><small>${record ? `${(seconds / 3600).toFixed(1)}h` : '—'}</small></button>`);
    }
    $('#calendar').innerHTML = cells.join('');
    renderSession();
  }
  function renderSession() {
    const record = data.records.find((item) => item.date === data.selectedDate);
    $('#sessionDate').textContent = data.selectedDate || '单日记录';
    $('#sessionStatus').textContent = !record ? '无采集记录' : record.active_total_seconds === 0 ? '无激活时段' : '有在席记录';
    $('#sessionDuration').textContent = record ? duration(record.active_total_seconds) : '--';
    const intervals = record ? intervalsFor(record) : [];
    $('#sessionCount').textContent = record ? `${intervals.length} 个在席时段` : '暂无数据';
    $('#sessionTimeline').innerHTML = intervals.map((interval, index) => `<button class="session-segment${interval.open ? ' is-open' : ''}" data-interval="${index}" style="left:${interval.start / 864}%;width:${(interval.end - interval.start) / 864}%" aria-label="第${index + 1}段 ${clock(interval.start)}至${clock(interval.end)}" title="${clock(interval.start)} - ${clock(interval.end)} / ${exactDuration(interval.seconds)}"></button>`).join('');
    $('#sessionList').innerHTML = intervals.length ? intervals.map((interval, index) => `<li data-interval-row="${index}"><span class="interval-index">${String(index + 1).padStart(2, '0')}</span><span class="interval-range">${clock(interval.start)} - ${clock(interval.end)}${interval.open ? '<small>统计至采集时刻</small>' : ''}</span><span class="interval-length">${exactDuration(interval.seconds)}</span></li>`).join('') : `<li class="session-empty">${record ? '当天没有激活时间段。' : '当天没有采集记录，不计为零时长。'}</li>`;
    $('#dayDetailLink').href = `/workstation.html?date=${encodeURIComponent(data.selectedDate)}#activity`;
    $('#dayDetailLink').hidden = !record;
  }
  $('#calendar').addEventListener('click', (event) => {
    const button = event.target.closest('[data-date]');
    if (!button) return;
    data.selectedDate = button.dataset.date;
    $('#calendar').querySelectorAll('[data-date]').forEach((cell) => cell.setAttribute('aria-pressed', String(cell === button)));
    renderSession();
  });
  $('#sessionTimeline').addEventListener('click', (event) => {
    const segment = event.target.closest('[data-interval]');
    if (!segment) return;
    $('#sessionTimeline').querySelectorAll('[data-interval]').forEach((item) => item.classList.toggle('is-selected', item === segment));
    $('#sessionList').querySelectorAll('[data-interval-row]').forEach((row) => {
      const selected = row.dataset.intervalRow === segment.dataset.interval;
      row.classList.toggle('is-selected', selected);
      if (selected) row.scrollIntoView({ block: 'nearest', behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    });
  });
  $('#monthSelect').addEventListener('change', (event) => { data.month = event.target.value; renderMonth(); });
  $('#previousMonth').addEventListener('click', () => { const index = data.months.indexOf(data.month); if (index > 0) { data.month = data.months[index - 1]; renderMonth(); } });
  $('#nextMonth').addEventListener('click', () => { const index = data.months.indexOf(data.month); if (index < data.months.length - 1) { data.month = data.months[index + 1]; renderMonth(); } });
  async function loadData() {
    $('#dataError').hidden = true;
    $('#retryData').disabled = true;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch('/api/workstation', { cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const payload = await response.json();
      if (!Array.isArray(payload)) throw new Error('数据格式不正确');
      const byDate = new Map();
      payload.forEach((record) => {
        if (!record || !validDate(record.date) || !Number.isFinite(record.active_total_seconds) || record.active_total_seconds < 0) return;
        byDate.set(record.date, record);
      });
      data.records = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
      if (!data.records.length) throw new Error('暂无有效的工位记录');
      data.months = [...new Set(data.records.map((record) => record.date.slice(0, 7)))];
      data.month = data.months.at(-1);
      $('#monthSelect').innerHTML = data.months.map((month) => `<option value="${month}">${month.slice(0, 4)} 年 ${Number(month.slice(5))} 月</option>`).join('');
      $('#monthSelect').disabled = false;
      $('#dataAsOf').textContent = `记录截至 ${data.records.at(-1).date}`;
      renderMonth();
    } catch (error) {
      $('#dataError').hidden = false;
      $('#dataErrorMessage').textContent = `工位记录暂时无法读取：${error.name === 'AbortError' ? '请求超时' : error.message}`;
      $('#dataAsOf').textContent = '数据暂不可用';
      $('#sessionList').innerHTML = '<li class="session-empty">等待工位数据。</li>';
    } finally {
      clearTimeout(timeout);
      $('#retryData').disabled = false;
    }
  }
  $('#retryData').addEventListener('click', loadData);
  loadData();
})();
