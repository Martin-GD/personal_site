"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import gsap from "gsap"
import ReactCountup from "react-countup"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { useGSAP } from "@gsap/react"

gsap.registerPlugin(ScrollTrigger)

interface PresenceInterval {
  start: string
  end: string
  seconds: number
  duration?: string
  open?: boolean
}

interface PresenceRecord {
  date: string
  active_total_seconds: number
  active_total_duration: string
  active_intervals: PresenceInterval[]
}

const formatHours = (seconds: number) => `${(seconds / 3600).toFixed(1)}h`

const formatDate = (date: string) => new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "2-digit",
  timeZone: "Asia/Shanghai"
}).format(new Date(`${date}T12:00:00+08:00`))

const formatClock = (value: string) => new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Shanghai"
}).format(new Date(value))

const intervalsFor = (record: PresenceRecord) => {
  const midnight = Date.parse(`${record.date}T00:00:00+08:00`)

  return (record.active_intervals || []).flatMap(interval => {
    const start = Math.max(0, (Date.parse(interval.start) - midnight) / 1000)
    const end = Math.min(86400, (Date.parse(interval.end) - midnight) / 1000)
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      return []
    }
    return [{ ...interval, startSeconds: start, endSeconds: end }]
  })
}

export const PartnersSection = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const [records, setRecords] = useState<PresenceRecord[]>([])
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedMonth, setSelectedMonth] = useState("")
  const [dataState, setDataState] = useState<"loading" | "ready" | "error">("loading")

  useGSAP(() => {
    gsap.fromTo(
      ".presence-title > *",
      { y: 80, autoAlpha: 0 },
      {
        y: 0,
        autoAlpha: 1,
        duration: 1,
        ease: "power3.out",
        stagger: 0.15,
        scrollTrigger: {
          trigger: ".presence-title",
          start: "top 85%",
          toggleActions: "restart none restart none"
        }
      }
    )

    gsap.utils.toArray<HTMLElement>(".presence-highlight").forEach(highlight => {
      gsap.set(highlight, { scaleX: 0, transformOrigin: "left center" })
      gsap.timeline({
        scrollTrigger: {
          trigger: highlight.parentElement,
          start: "top 90%",
          toggleActions: "restart none restart none"
        }
      }).to(highlight, {
        scaleX: 1,
        duration: 0.6,
        ease: "power3.out"
      }).to(highlight, {
        scaleX: 0,
        transformOrigin: "right center",
        duration: 0.6,
        ease: "power3.in",
        delay: 0.15
      })
    })
  }, { scope: sectionRef })

  useEffect(() => {
    const loadRecords = async () => {
      try {
        const response = await fetch("/api/workstation", { cache: "no-store" })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const payload = await response.json() as PresenceRecord[]
        const validRecords = payload
          .filter(record => record && /^\d{4}-\d{2}-\d{2}$/.test(record.date))
          .sort((a, b) => a.date.localeCompare(b.date))
        setRecords(validRecords)
        setSelectedDate(validRecords.at(-1)?.date || "")
        setSelectedMonth(validRecords.at(-1)?.date.slice(0, 7) || "")
        setDataState("ready")
      } catch {
        setDataState("error")
      }
    }

    loadRecords()
  }, [])

  const summary = useMemo(() => {
    const total = records.reduce((sum, record) => sum + record.active_total_seconds, 0)
    const activeDays = records.filter(record => record.active_total_seconds > 0).length
    const longest = records.reduce<PresenceRecord | null>(
      (best, record) => !best || record.active_total_seconds > best.active_total_seconds ? record : best,
      null
    )

    return { total, activeDays, average: records.length ? total / records.length : 0, longest }
  }, [records])

  const selectedRecord = records.find(record => record.date === selectedDate)
  const selectedIntervals = selectedRecord ? intervalsFor(selectedRecord) : []
  const months = useMemo(() => [...new Set(records.map(record => record.date.slice(0, 7)))], [records])
  const monthRecords = useMemo(() => records.filter(record => record.date.startsWith(selectedMonth)), [records, selectedMonth])
  const monthRecordMap = useMemo(() => new Map(monthRecords.map(record => [record.date, record])), [monthRecords])
  const calendarCells = useMemo(() => {
    if (!selectedMonth) return []
    const [year, month] = selectedMonth.split("-").map(Number)
    const firstDay = new Date(Date.UTC(year, month - 1, 1))
    const offset = (firstDay.getUTCDay() + 6) % 7
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
    return Array.from({ length: offset + daysInMonth }, (_, index) => {
      if (index < offset) return null
      const day = index - offset + 1
      return `${selectedMonth}-${String(day).padStart(2, "0")}`
    })
  }, [selectedMonth])

  const changeMonth = (month: string) => {
    setSelectedMonth(month)
    const monthLastRecord = records.filter(record => record.date.startsWith(month)).at(-1)
    setSelectedDate(monthLastRecord?.date || `${month}-01`)
  }

  const monthLabel = selectedMonth
    ? new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "Asia/Shanghai" }).format(new Date(`${selectedMonth}-15T12:00:00+08:00`))
    : "Monthly record"

  return (
    <section ref={sectionRef} className="presence-section py-30 2xl:pt-20 2xl:pb-40 w-full overflow-hidden" aria-labelledby="presence-title">
      <div className="px-5">
        <div className="relative h-20 md:h-41 lg:h-56 xl:h-65 2xl:h-116 overflow-hidden">
          <h2 id="presence-title" className="presence-title flex flex-col font-sans text-[3.6em] md:text-[8em] lg:text-[10.8em] xl:text-[13.7em] 2xl:text-[20em] uppercase leading-none text-white relative z-10">
            <strong className="font-bungee text-accent">My</strong>
            <span className="absolute top-7 md:top-10 lg:top-14 2xl:top-38 font-bold">Presence</span>
          </h2>
          <span className="presence-highlight absolute inset-0 block bg-accent z-10" />
        </div>

        <div className="pt-10 2xl:px-30">
          <div className="relative">
            <h3 className="font-sans text-sm font-bold uppercase tracking-tighter text-white">Workstation telemetry</h3>
            <span className="presence-highlight absolute inset-0 block bg-accent z-10" />
          </div>
          <div className="relative max-w-2xl">
            <p className="mt-6 font-sans text-2xl text-white lg:max-w-xl">
              One detector, every session. A running record of time spent at the desk, translated into a rhythm I can read.
            </p>
            <span className="presence-highlight absolute inset-0 block bg-accent z-10" />
          </div>
        </div>

        <div className="presence-metrics pt-14 2xl:pt-20 2xl:px-30" aria-live="polite">
          <div className="presence-metric">
            <div className="presence-metric-label">
              <span>ACCUMULATED<i className="presence-highlight" /></span>
              <span>HOURS<i className="presence-highlight" /></span>
            </div>
            <strong className="presence-counter">{dataState === "ready" ? <ReactCountup key={`total-${summary.total}`} end={summary.total / 3600} decimals={1} suffix="h" duration={3} enableScrollSpy /> : "--"}</strong>
          </div>
          <div className="presence-metric">
            <div className="presence-metric-label">
              <span>DAILY<i className="presence-highlight" /></span>
              <span>AVERAGE<i className="presence-highlight" /></span>
            </div>
            <strong className="presence-counter">{dataState === "ready" ? <ReactCountup key={`average-${summary.average}`} end={summary.average / 3600} decimals={1} suffix="h" duration={3} enableScrollSpy /> : "--"}</strong>
          </div>
          <div className="presence-metric">
            <div className="presence-metric-label">
              <span>ACTIVE<i className="presence-highlight" /></span>
              <span>DAYS<i className="presence-highlight" /></span>
            </div>
            <strong className="presence-counter">{dataState === "ready" ? <><ReactCountup key={`active-${summary.activeDays}`} end={summary.activeDays} duration={3} enableScrollSpy /><em>/{records.length}</em></> : "--"}</strong>
          </div>
          <div className="presence-metric">
            <div className="presence-metric-label">
              <span>LONGEST<i className="presence-highlight" /></span>
              <span>DAY<i className="presence-highlight" /></span>
            </div>
            <strong className="presence-counter">{dataState === "ready" && summary.longest ? <ReactCountup key={`longest-${summary.longest.date}`} end={summary.longest.active_total_seconds / 3600} decimals={1} suffix="h" duration={3} enableScrollSpy /> : "--"}</strong>
          </div>
        </div>

        <div className="presence-data-layout 2xl:mx-30">
        <div className="presence-calendar-shell">
          <div className="presence-calendar-heading">
            <div>
              <span className="presence-detail-kicker presence-highlight-target">MONTHLY LOG<i className="presence-highlight" /></span>
              <h3><span className="presence-highlight-target">{monthLabel}<i className="presence-highlight" /></span></h3>
            </div>
            <label>
              <span>SELECT MONTH</span>
              <select value={selectedMonth} onChange={event => changeMonth(event.target.value)} disabled={dataState !== "ready"}>
                {months.map(month => <option value={month} key={month}>{month}</option>)}
              </select>
            </label>
          </div>
          {dataState === "error" ? <p className="presence-empty">Workstation data is unavailable.</p> : (
            <>
              <div className="presence-calendar-weekdays" aria-hidden="true">
                {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map(day => <span key={day}>{day}</span>)}
              </div>
              <div className="presence-calendar-grid" aria-label={`${monthLabel} workstation presence calendar`}>
                {calendarCells.map((date, index) => {
                  if (!date) return <span className="presence-calendar-empty" aria-hidden="true" key={`empty-${index}`} />
                  const record = monthRecordMap.get(date)
                  const seconds = record?.active_total_seconds || 0
                  const level = !record ? "missing" : seconds === 0 ? "zero" : seconds < 7200 ? "low" : seconds < 14400 ? "medium" : seconds < 21600 ? "high" : "peak"
                  const selected = date === selectedDate
                  return <button type="button" className={`presence-calendar-day is-${level} ${selected ? "is-selected" : ""}`} key={date} onClick={() => setSelectedDate(date)} aria-pressed={selected} title={`${date} · ${record ? record.active_total_duration : "无记录"}`}>
                    <strong>{Number(date.slice(-2))}</strong>
                    <small>{record ? formatHours(seconds) : "—"}</small>
                  </button>
                })}
              </div>
              <div className="presence-calendar-legend"><span>LESS</span><i className="is-zero" /><i className="is-low" /><i className="is-medium" /><i className="is-high" /><i className="is-peak" /><span>MORE</span></div>
            </>
          )}
        </div>

        <div className="presence-detail" aria-live="polite">
          <div className="presence-detail-heading">
            <div><span className="presence-detail-kicker presence-highlight-target">DAY INSPECTOR<i className="presence-highlight" /></span><h3><span className="presence-highlight-target">{selectedRecord ? `${formatDate(selectedRecord.date)} · presence` : "Waiting for data"}<i className="presence-highlight" /></span></h3></div>
            <span>{selectedIntervals.length} SESSION{selectedIntervals.length === 1 ? "" : "S"}</span>
          </div>
          <div className="presence-detail-main"><strong>{selectedRecord ? selectedRecord.active_total_duration : "--:--:--"}</strong><span>在席总时长 / TOTAL PRESENCE</span></div>
          <div className="presence-timeline" aria-label="当天24小时在席时间轴">
            {selectedIntervals.map((interval, index) => <span className={interval.open ? "is-open" : ""} key={`${interval.start}-${index}`} style={{ left: `${interval.startSeconds / 864}%`, width: `${Math.max(0.5, (interval.endSeconds - interval.startSeconds) / 864)}%` }} title={`${formatClock(interval.start)} - ${formatClock(interval.end)} · ${interval.duration || "在席"}`} />)}
          </div>
          <div className="presence-timeline-labels"><span>00:00</span><span>12:00</span><span>24:00</span></div>
          <div className="presence-intervals">
            {selectedIntervals.length ? selectedIntervals.map((interval, index) => <span key={`${interval.end}-${index}`}><b>{String(index + 1).padStart(2, "0")}</b>{formatClock(interval.start)} - {formatClock(interval.end)}<em>{interval.duration || "presence"}</em></span>) : <span className="presence-empty">No active interval recorded for this day.</span>}
          </div>
        </div>
        </div>
      </div>
    </section>
  )
}
