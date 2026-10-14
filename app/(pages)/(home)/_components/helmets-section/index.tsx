"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"

import { Grid } from "@/app/components/common/vectors/grid"
import { Pattern } from "@/app/components/common/vectors/pattern"

interface FootprintVisit {
  id: string
  city: string
  province: string
  date: string
  image: string
  coordinates: [number, number]
}

interface FootprintData {
  visits: FootprintVisit[]
}

const formatDate = (date: string) => new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Shanghai"
}).format(new Date(`${date}T12:00:00+08:00`))

export const HelmetsSection = () => {
  const [visits, setVisits] = useState<FootprintVisit[]>([])
  const [selectedYear, setSelectedYear] = useState("2026")
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dataState, setDataState] = useState<"loading" | "ready" | "error">("loading")

  useEffect(() => {
    let cancelled = false

    fetch("/data/china_footprints_2026.json", { cache: "no-store" })
      .then(response => {
        if (!response.ok) throw new Error("Unable to load city archive.")
        return response.json() as Promise<FootprintData>
      })
      .then(data => {
        if (cancelled) return
        setVisits(data.visits)
        setDataState("ready")
      })
      .catch(() => {
        if (!cancelled) setDataState("error")
      })

    return () => {
      cancelled = true
    }
  }, [])

  const years = useMemo(
    () => [...new Set(visits.map(visit => visit.date.slice(0, 4)))].sort((left, right) => right.localeCompare(left)),
    [visits]
  )

  const filteredVisits = useMemo(
    () => visits.filter(visit => selectedYear === "all" || visit.date.startsWith(selectedYear)),
    [selectedYear, visits]
  )

  return (
    <section
      id="helmets"
      className="city-archive-section mt-0 mb-30 w-full bg-white overflow-hidden"
      onClick={() => setActiveId(null)}
    >
      <div className="relative py-10 lg:py-40 px-5">
        <div className="hidden md:block absolute left-0 top-0 w-full h-full">
          <Pattern height="100%" stroke="var(--color-line)" />
        </div>
        <div className="md:hidden absolute left-0 top-0 w-full h-full">
          <Pattern height="40%" stroke="var(--color-line)" />
        </div>

        <div className="city-archive-toolbar relative z-10">
          <div>
            <span className="city-archive-kicker">CITY ARCHIVE</span>
            <strong>{selectedYear === "all" ? "ALL PLACES" : selectedYear}</strong>
          </div>
          <div className="city-archive-filters" role="group" aria-label="Filter city archive by year">
            <button
              type="button"
              className={selectedYear === "all" ? "is-selected" : ""}
              onClick={() => {
                setSelectedYear("all")
                setActiveId(null)
              }}
              aria-pressed={selectedYear === "all"}
            >
              ALL
            </button>
            {years.map(year => (
              <button
                type="button"
                className={selectedYear === year ? "is-selected" : ""}
                key={year}
                onClick={() => {
                  setSelectedYear(year)
                  setActiveId(null)
                }}
                aria-pressed={selectedYear === year}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        <div className="city-archive-grid relative z-10">
          {dataState === "loading" ? <p className="city-archive-status">LOADING CITY ARCHIVE</p> : null}
          {dataState === "error" ? <p className="city-archive-status">CITY ARCHIVE UNAVAILABLE</p> : null}
          {dataState === "ready" && filteredVisits.length === 0 ? <p className="city-archive-status">NO CITIES IN THIS FILTER</p> : null}
          {filteredVisits.map((visit, index) => {
            const visitKey = `${visit.id}-${visit.date}-${index}`
            const isActive = activeId === visitKey
            return (
              <article
                key={visitKey}
                className={`city-archive-card ${index % 2 === 1 ? "city-archive-card-offset" : ""} ${isActive ? "is-active" : ""}`}
                onClick={event => {
                  event.stopPropagation()
                  setActiveId(isActive ? null : visitKey)
                }}
              >
                <div className="city-archive-card-grid" aria-hidden="true">
                  <Grid width="100%" height="100%" stroke="var(--color-line)" />
                </div>
                <div className="city-archive-city">{visit.city}</div>
                <div className="city-archive-photo" aria-hidden={!isActive}>
                  {visit.image ? (
                    <Image
                      src={visit.image}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                      alt={`${visit.city} landmark`}
                      className="city-archive-photo-image"
                    />
                  ) : (
                    <span className="city-archive-photo-placeholder">PHOTO / PLACEHOLDER</span>
                  )}
                  <span className="city-archive-photo-shade" />
                  <strong>{visit.city}</strong>
                </div>
                <time className="city-archive-date" dateTime={visit.date}>{formatDate(visit.date)}</time>
              </article>
            )
          })}
        </div>
      </div>
    </section>
  )
}
