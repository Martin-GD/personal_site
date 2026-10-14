const state = { records: [], filtered: [], selectedDay: "" };

const $ = (selector) => document.querySelector(selector);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;",
  }[character]));
}

function formatSeconds(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

function formatDate(date, withWeekday = false) {
  const parsed = new Date(`${date}T00:00:00Z`);
  const text = `${date.slice(5).replace("-", "/")}`;
  return withWeekday ? `${text} ${["周日", "周一", "周二", "周三", "周四", "周五", "周六"][parsed.getUTCDay()]}` : text;
}

function setText(selector, value) {
  const element = $(selector);
  if (element) element.textContent = value;
}

function minutesOfDay(value, date) {
  const minutes = (Date.parse(value) - Date.parse(`${date}T00:00:00+08:00`)) / 60000;
  return Number.isFinite(minutes) ? Math.max(0, Math.min(1440, minutes)) : 0;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function formatClock(minutes) {
  if (minutes === null) return "--:--";
  const rounded = Math.max(0, Math.min(1440, Math.round(minutes)));
  return `${String(Math.floor(rounded / 60)).padStart(2, "0")}:${String(rounded % 60).padStart(2, "0")}`;
}

function renderDailyBars(records) {
  const target = $("#dailyBars");
  const recent = records.slice(-14);
  const maximum = Math.max(...recent.map((record) => record.active_total_seconds), 3600);
  target.innerHTML = recent.map((record) => {
    const height = record.active_total_seconds ? Math.max(record.active_total_seconds / maximum * 100, 3) : 2;
    const hours = (record.active_total_seconds / 3600).toFixed(1);
    return `<div class="daily-bar-column" title="${escapeHtml(formatDate(record.date, true))} · ${formatSeconds(record.active_total_seconds)}">
      <span class="daily-bar-value">${hours}h</span>
      <span class="daily-bar-track"><i class="daily-bar ${record.active_total_seconds ? "" : "is-zero"}" style="--bar-height:${height}%"></i></span>
      <span class="daily-bar-label">${escapeHtml(formatDate(record.date))}</span>
    </div>`;
  }).join("");
}

function renderWeekdayBars(records) {
  const labels = ["日", "一", "二", "三", "四", "五", "六"];
  const groups = Array.from({ length: 7 }, () => []);
  records.forEach((record) => groups[new Date(`${record.date}T00:00:00Z`).getUTCDay()].push(record.active_total_seconds));
  const averages = groups.map((values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);
  const maximum = Math.max(...averages, 1);
  $("#weekdayBars").innerHTML = labels.map((label, index) => `
    <div class="weekday-row ${index === 0 || index === 6 ? "weekend" : ""}">
      <span>${label}</span>
      <span class="weekday-track"><i class="weekday-fill" style="--bar-width:${averages[index] / maximum * 100}%"></i></span>
      <span class="weekday-value">${averages[index] ? formatSeconds(averages[index]) : "--"}</span>
    </div>`).join("");
}

function renderTimeDistribution(records) {
  const minutes = Array(24).fill(0);
  records.forEach((record) => (record.active_intervals || []).forEach((interval) => {
    const start = minutesOfDay(interval.start, record.date);
    const end = Math.max(start, minutesOfDay(interval.end, record.date));
    for (let hour = 0; hour < 24; hour += 1) {
      minutes[hour] += Math.max(0, Math.min(end, (hour + 1) * 60) - Math.max(start, hour * 60));
    }
  }));
  const maximum = Math.max(...minutes, 1);
  $("#timeDistribution").innerHTML = minutes.map((value, hour) => {
    const ratio = value / maximum;
    const level = value === 0 ? 0 : ratio < 0.25 ? 1 : ratio < 0.5 ? 2 : ratio < 0.75 ? 3 : 4;
    const height = value ? Math.max(ratio * 100, 4) : 2;
    return `<span class="time-cell time-level-${level}" style="--time-height:${height}%" title="${String(hour).padStart(2, "0")}:00 · ${Math.round(value)} 分钟"></span>`;
  }).join("");
}

function renderDurationBuckets(records) {
  const buckets = [
    { label: "0h", test: (seconds) => seconds === 0 },
    { label: "0–2h", test: (seconds) => seconds > 0 && seconds < 7200 },
    { label: "2–4h", test: (seconds) => seconds >= 7200 && seconds < 14400 },
    { label: "4–6h", test: (seconds) => seconds >= 14400 && seconds < 21600 },
    { label: "6–8h", test: (seconds) => seconds >= 21600 && seconds < 28800 },
    { label: "8h+", test: (seconds) => seconds >= 28800 },
  ];
  const counts = buckets.map((bucket) => records.filter((record) => bucket.test(record.active_total_seconds)).length);
  const maximum = Math.max(...counts, 1);
  $("#durationBuckets").innerHTML = buckets.map((bucket, index) => `
    <div class="duration-row"><span>${bucket.label}</span><span class="duration-track"><i class="duration-fill" style="--bar-width:${counts[index] / maximum * 100}%"></i></span><b class="duration-count">${counts[index]}</b></div>`).join("");
}

function daysBetween(first, second) {
  return Math.round((new Date(`${second}T00:00:00+08:00`) - new Date(`${first}T00:00:00+08:00`)) / 86400000);
}

function renderInsights(records) {
  const active = records.filter((record) => record.active_total_seconds > 0);
  const starts = active.flatMap((record) => record.active_intervals?.length ? [minutesOfDay(record.active_intervals[0].start, record.date)] : []);
  const ends = active.flatMap((record) => record.active_intervals?.length ? [minutesOfDay(record.active_intervals[record.active_intervals.length - 1].end, record.date)] : []);
  let bestStreak = 0;
  let currentStreak = 0;
  records.forEach((record, index) => {
    const previous = records[index - 1];
    const consecutive = previous && daysBetween(previous.date, record.date) === 1;
    currentStreak = record.active_total_seconds > 0 && (consecutive && previous.active_total_seconds > 0 ? currentStreak + 1 : 1);
    bestStreak = Math.max(bestStreak, currentStreak);
  });

  const weekdayGroups = Array.from({ length: 7 }, () => []);
  records.forEach((record) => weekdayGroups[new Date(`${record.date}T00:00:00Z`).getUTCDay()].push(record.active_total_seconds));
  const weekdayAverages = weekdayGroups.map((values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0);
  const bestWeekday = weekdayAverages.indexOf(Math.max(...weekdayAverages));
  const labels = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const longest = records.reduce((best, record) => record.active_total_seconds > best.active_total_seconds ? record : best, records[0]);
  const insightData = [
    ["ACTIVE RATE", `${records.length ? Math.round(active.length / records.length * 100) : 0}%`, `${active.length} / ${records.length} 天有在席记录`],
    ["TYPICAL WINDOW", `${formatClock(median(starts))} — ${formatClock(median(ends))}`, "首段开始至末段结束"],
    ["BEST RHYTHM", labels[bestWeekday] || "--", `平均 ${formatSeconds(weekdayAverages[bestWeekday] || 0)}`],
    ["BEST STREAK", `${bestStreak} 天`, longest ? `最长日 ${formatDate(longest.date)} · ${formatSeconds(longest.active_total_seconds)}` : "暂无数据"],
  ];
  $("#workstationInsights").innerHTML = insightData.map(([label, value, note]) => `<div class="insight-card"><span>${label}</span><strong>${escapeHtml(value)}</strong><small>${escapeHtml(note)}</small></div>`).join("");
}

function renderDayOptions(records) {
  const select = $("#daySelect");
  if (!records.length) {
    select.innerHTML = '<option value="">没有可选日期</option>';
    select.disabled = true;
    state.selectedDay = "";
    return;
  }
  select.disabled = false;
  if (!records.some((record) => record.date === state.selectedDay)) state.selectedDay = records[records.length - 1].date;
  select.innerHTML = records.map((record) => `<option value="${record.date}">${formatDate(record.date, true)} · ${formatSeconds(record.active_total_seconds)}</option>`).join("");
  select.value = state.selectedDay;
}

function renderDayDetail(date) {
  const record = state.filtered.find((item) => item.date === date);
  if (!record) {
    setText("#dayDetailTitle", "当天在席分布");
    setText("#dayDetailState", "请选择日期");
    ["#dayTotal", "#daySegments", "#dayFirstStart", "#dayLastEnd"].forEach((selector) => setText(selector, "--"));
    $("#dayTimeline").innerHTML = '<div class="empty-state">当前时间范围内没有可查看的日期</div>';
    $("#dayIntervals").innerHTML = "";
    return;
  }

  const intervals = record.active_intervals || [];
  const first = intervals[0];
  const last = intervals[intervals.length - 1];
  setText("#dayDetailTitle", `${formatDate(record.date, true)} · 在席分布`);
  setText("#dayDetailState", record.day_final_state === "on" ? "最后状态：在线" : "最后状态：离线");
  setText("#dayTotal", formatSeconds(record.active_total_seconds));
  setText("#daySegments", `${intervals.length} 段`);
  setText("#dayFirstStart", first ? formatClock(Math.floor(minutesOfDay(first.start, record.date))) : "--:--");
  setText("#dayLastEnd", last ? formatClock(Math.floor(minutesOfDay(last.end, record.date))) : "--:--");
  $("#dayTimeline").innerHTML = intervals.map((interval, index) => {
    const start = minutesOfDay(interval.start, record.date);
    const end = Math.max(start, minutesOfDay(interval.end, record.date));
    const left = start / 1440 * 100;
    const width = Math.max((end - start) / 1440 * 100, 0.25);
    return `<span class="day-segment ${interval.open ? "is-open" : ""}" style="left:${left}%;width:${Math.min(width, 100 - left)}%" title="第 ${index + 1} 段 · ${interval.duration || formatSeconds(interval.seconds)}"></span>`;
  }).join("") || '<div class="empty-state">当天没有激活时间段</div>';
  $("#dayIntervals").innerHTML = intervals.map((interval, index) => {
    const start = formatClock(Math.floor(minutesOfDay(interval.start, record.date)));
    const end = formatClock(Math.floor(minutesOfDay(interval.end, record.date)));
    return `<div class="day-interval"><b class="day-interval-number">${index + 1}</b><span class="day-interval-time">${start} — ${end}${interval.open ? " · 未闭合" : ""}</span><span class="day-interval-duration">${escapeHtml(interval.duration || formatSeconds(interval.seconds))}</span></div>`;
  }).join("");
}

function renderFilteredDashboard() {
  const records = state.filtered;
  renderMetrics(records);
  renderHeatmap(records);
  renderDailyBars(records);
  renderWeekdayBars(records);
  renderTimeDistribution(records);
  renderDurationBuckets(records);
  renderInsights(records);
  renderActivity(records);
  renderDayOptions(records);
  renderDayDetail(state.selectedDay);
  setText("#selectedRangeLabel", records.length ? `${records.length} 天 · ${formatDate(records[0].date)} — ${formatDate(records[records.length - 1].date)}` : "当前范围没有记录");
  setText("#dataStatus", `RANGE · ${records.length}/${state.records.length} days · LIVE`);
}

function toIsoDate(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function applyDateRange(start, end) {
  let rangeStart = start || state.records[0]?.date || "";
  let rangeEnd = end || state.records[state.records.length - 1]?.date || "";
  if (rangeStart > rangeEnd) [rangeStart, rangeEnd] = [rangeEnd, rangeStart];
  $("#rangeStart").value = rangeStart;
  $("#rangeEnd").value = rangeEnd;
  state.filtered = state.records.filter((record) => record.date >= rangeStart && record.date <= rangeEnd);
  document.querySelectorAll("[data-range]").forEach((button) => button.classList.remove("is-active"));
  renderFilteredDashboard();
}

function renderMetrics(records) {
  const total = records.reduce((sum, record) => sum + record.active_total_seconds, 0);
  const active = records.filter((record) => record.active_total_seconds > 0);
  const average = records.length ? total / records.length : 0;
  const longest = records.reduce((best, record) => record.active_total_seconds > best.active_total_seconds ? record : best, records[0]);

  setText("#statActiveDays", `${active.length}`);
  setText("#statTotalHours", `${(total / 3600).toFixed(1)}h`);
  setText("#statLastDate", records.length ? formatDate(records[records.length - 1].date) : "--");
  setText("#statAverage", formatSeconds(average));
  setText("#statLongest", formatSeconds(longest?.active_total_seconds));
  setText("#statLongestDate", longest ? formatDate(longest.date, true) : "--");
  setText("#contributionSummary", `${records.length} 天工位检测记录 · ${formatSeconds(total)} 累计在席`);
  setText("#heatmapRange", records.length ? `${formatDate(records[0].date)} — ${formatDate(records[records.length - 1].date)}` : "暂无数据");
}

function colorFor(seconds, maximum) {
  if (!seconds) return "heat-0";
  const ratio = seconds / Math.max(maximum, 1);
  if (ratio < 0.2) return "heat-1";
  if (ratio < 0.45) return "heat-2";
  if (ratio < 0.7) return "heat-3";
  return "heat-4";
}

function renderHeatmap(records) {
  const heatmap = $("#heatmap");
  const byDate = new Map(records.map((record) => [record.date, record]));
  const maximum = Math.max(...records.map((record) => record.active_total_seconds), 1);
  const lastDate = records.length ? new Date(`${records[records.length - 1].date}T00:00:00Z`) : new Date();
  const startDate = new Date(lastDate);
  startDate.setUTCDate(startDate.getUTCDate() - 20 * 7 + 1);
  startDate.setUTCDate(startDate.getUTCDate() - startDate.getUTCDay());

  const cells = [];
  for (let week = 0; week < 21; week += 1) {
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const date = new Date(startDate);
      date.setUTCDate(startDate.getUTCDate() + week * 7 + weekday);
      const iso = toIsoDate(date);
      const record = byDate.get(iso);
      const seconds = record?.active_total_seconds || 0;
      cells.push(`<span class="heat-cell ${colorFor(seconds, maximum)}" title="${formatDate(iso, true)} · ${record ? formatSeconds(seconds) : "无记录"}"></span>`);
    }
  }
  heatmap.innerHTML = cells.join("");
}

function renderActivity(records) {
  const target = $("#recentActivity");
  const recent = [...records].reverse().slice(0, 7);
  if (!recent.length) {
    target.innerHTML = '<div class="empty-state">暂时没有工位记录</div>';
    return;
  }
  target.innerHTML = recent.map((record) => `
    <div class="activity-item">
      <span class="activity-dot">⌁</span>
      <div class="activity-text"><strong>${escapeHtml(formatDate(record.date, true))}</strong><br><span>工位检测器 · ${record.active_intervals.length} 个激活时间段</span></div>
      <span class="activity-time">${formatSeconds(record.active_total_seconds)}</span>
    </div>`).join("");
}

async function loadWorkstationData() {
  try {
    const response = await fetch(`/api/workstation?t=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload)) throw new Error("JSON 顶层不是数组");
    state.records = payload
      .filter((record) => record && /^\d{4}-\d{2}-\d{2}$/.test(record.date || ""))
      .map((record) => ({ ...record, active_total_seconds: Number(record.active_total_seconds) || 0, active_intervals: Array.isArray(record.active_intervals) ? record.active_intervals : [] }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const firstDate = state.records[0]?.date || "";
    const lastDate = state.records[state.records.length - 1]?.date || "";
    $("#rangeStart").min = firstDate;
    $("#rangeStart").max = lastDate;
    $("#rangeEnd").min = firstDate;
    $("#rangeEnd").max = lastDate;
    const requestedDate = new URLSearchParams(location.search).get("date");
    state.selectedDay = state.records.some((record) => record.date === requestedDate) ? requestedDate : lastDate;
    applyDateRange(firstDate, lastDate);
    $("#dataStatus").classList.add("is-live");
  } catch (error) {
    setText("#dataStatus", "DATA OFFLINE · JSON unavailable");
    setText("#contributionSummary", "等待本地工位数据接口");
    $("#heatmap").innerHTML = '<div class="empty-state">Node API 尚未连接</div>';
    $("#recentActivity").innerHTML = `<div class="empty-state">无法读取数据：${escapeHtml(error.message)}</div>`;
  }
}

setText("#year", new Date().getFullYear());

$("#rangeStart").addEventListener("change", () => applyDateRange($("#rangeStart").value, $("#rangeEnd").value));
$("#rangeEnd").addEventListener("change", () => applyDateRange($("#rangeStart").value, $("#rangeEnd").value));
$("#daySelect").addEventListener("change", (event) => {
  state.selectedDay = event.target.value;
  renderDayDetail(state.selectedDay);
});
document.querySelectorAll("[data-range]").forEach((button) => button.addEventListener("click", () => {
  const lastDate = state.records[state.records.length - 1]?.date;
  if (!lastDate) return;
  if (button.dataset.range === "all") {
    applyDateRange(state.records[0].date, lastDate);
  } else {
    const start = new Date(`${lastDate}T00:00:00Z`);
    start.setUTCDate(start.getUTCDate() - Number(button.dataset.range) + 1);
    applyDateRange(toIsoDate(start), lastDate);
  }
  button.classList.add("is-active");
}));
loadWorkstationData();
