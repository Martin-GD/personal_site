"use client"

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { ScrollTrigger } from "gsap/ScrollTrigger"

gsap.registerPlugin(ScrollTrigger)

interface FootprintVisit {
  id: string
  adcode: string
  city: string
  province: string
  date: string
  note: string
  image: string
  coordinates: [number, number]
}

interface FootprintData {
  year: number | "all"
  mode: string
  visits: FootprintVisit[]
}

interface StaticCityShape {
  id: string
  name: string
  provinceId: string
  d: string
  x: number
  y: number
  capital: boolean
}

interface StaticProvinceShape {
  id: string
  name: string
  d: string
  viewBox: [number, number, number, number]
}

interface StaticChinaMapData {
  width: number
  height: number
  viewBox: [number, number, number, number]
  provinceShapes: StaticProvinceShape[]
  cityShapes: StaticCityShape[]
}

const isStaticChinaMapData = (value: unknown): value is StaticChinaMapData => {
  if (!value || typeof value !== "object") return false
  const candidate = value as Partial<StaticChinaMapData>
  return Array.isArray(candidate.viewBox) &&
    Array.isArray(candidate.provinceShapes) &&
    Array.isArray(candidate.cityShapes)
}

const formatVisitDate = (date: string) => new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Shanghai"
}).format(new Date(`${date}T12:00:00+08:00`))

const selectWithKeyboard = (event: React.KeyboardEvent<SVGElement>, select: () => void) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault()
    select()
  }
}

const provinceCodeForAdcode = (adcode: string) => adcode.length >= 2 ? `${adcode.slice(0, 2)}0000` : ""

const provinceIdForVisit = (visit: Pick<FootprintVisit, "adcode" | "city">) => {
  const provinceId = provinceCodeForAdcode(visit.adcode)
  if (provinceId) return provinceId
  return visit.city === "Hong Kong" || visit.city === "Macau" ? "440000" : ""
}

interface ChinaFootprintMapProps {
  visits: FootprintVisit[]
  mapData: StaticChinaMapData
  selectedProvinceId: string
  onSelect: (id: string) => void
  onSelectProvince: (id: string) => void
}

const mapWidth = 800
const mapHeight = 560
const mapScale = 700
const mapCenter = [104, 35]
const centerMercatorY = Math.log(Math.tan(Math.PI / 4 + (mapCenter[1] * Math.PI / 180) / 2))

const projectCoordinate = ([longitude, latitude]: [number, number]) => [
  mapWidth / 2 + mapScale * (longitude - mapCenter[0]) * Math.PI / 180,
  mapHeight / 2 - mapScale * (
    Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI / 180) / 2)) - centerMercatorY
  )
]

const ChinaFootprintMap = memo(({ visits, mapData, selectedProvinceId, onSelectProvince }: ChinaFootprintMapProps) => {
  const visitedProvinceIds = useMemo(
    () => new Set(visits.map(provinceIdForVisit)),
    [visits]
  )
  const selectedProvince = mapData.provinceShapes.find(province => province.id === selectedProvinceId)
  const selectedProvinceTransform = selectedProvince
    ? (() => {
      const [x, y, width, height] = selectedProvince.viewBox
      const centerX = x + width / 2
      const centerY = y + height / 2
      return `translate(${centerX} ${centerY}) scale(1.035) translate(${-centerX} ${-centerY})`
    })()
    : undefined

  return (
    <svg
      className="footprint-static-svg"
      viewBox={mapData.viewBox.join(" ")}
      role="img"
      aria-label="China travel footprint map"
    >
      <g className="footprint-province-shapes">
        {mapData.provinceShapes.map(province => (
          <path
            className={`footprint-province-shape ${visitedProvinceIds.has(province.id) ? "is-visited" : ""} ${selectedProvinceId === province.id ? "is-selected" : ""}`}
            d={province.d}
            key={province.id}
            onClick={() => onSelectProvince(province.id)}
            role="button"
            tabIndex={0}
            onKeyDown={event => selectWithKeyboard(event, () => onSelectProvince(province.id))}
          >
            <title>{province.name}</title>
          </path>
        ))}
      </g>
      {selectedProvince ? (
        <path
          className="footprint-province-selected-overlay"
          d={selectedProvince.d}
          transform={selectedProvinceTransform}
          aria-hidden="true"
        />
      ) : null}
    </svg>
  )
})

ChinaFootprintMap.displayName = "ChinaFootprintMap"

interface ProvinceDetailMapProps {
  visits: FootprintVisit[]
  mapData: StaticChinaMapData
  provinceId: string
  onSelect: (id: string) => void
}

const ProvinceDetailMap = memo(({ visits, mapData, provinceId, onSelect }: ProvinceDetailMapProps) => {
  const province = mapData.provinceShapes.find(item => item.id === provinceId)
  const cityShapes = mapData.cityShapes.filter(city => city.provinceId === provinceId)
  const cityShapeByAdcode = useMemo(
    () => new Map(cityShapes.map(city => [city.id, city])),
    [cityShapes]
  )
  const visitsByAdcode = useMemo(
    () => new Map(visits.filter(visit => visit.adcode).map(visit => [visit.adcode, visit])),
    [visits]
  )
  const viewBox = province?.viewBox || mapData.viewBox

  return (
    <svg
      className="footprint-province-detail-svg"
      viewBox={viewBox.join(" ")}
      role="img"
      aria-label={`${province?.name || "Province"} city map`}
    >
      <path className="footprint-detail-province-shape" d={province?.d || ""} />

      <g className="footprint-detail-city-shapes">
        {cityShapes.map(city => {
          const visit = visitsByAdcode.get(city.id)
          return (
            <path
              className={`footprint-detail-city-shape ${visit ? "is-visited" : ""}`}
              d={city.d}
              key={city.id}
              onClick={() => visit && onSelect(visit.id)}
            >
              <title>{city.name}</title>
            </path>
          )
        })}
      </g>

      <g className="footprint-detail-city-points" aria-hidden="true">
        {cityShapes.map(city => (
          <circle
            className={city.capital ? "footprint-city-location is-capital" : "footprint-city-location"}
            cx={city.x}
            cy={city.y}
            key={city.id}
            r={city.capital ? 1.7 : 1.1}
          />
        ))}
      </g>

      <g className="footprint-detail-visit-markers">
        {visits.filter(visit => provinceIdForVisit(visit) === provinceId).map(visit => {
          const city = cityShapeByAdcode.get(visit.adcode)
          // Use the map's own anchor so the visit marker stays on its city boundary.
          const [x, y] = city ? [city.x, city.y] : projectCoordinate(visit.coordinates)
          const markerRadius = city?.capital ? 1.95 : 1.35

          return (
            <g key={visit.id} transform={`translate(${x} ${y})`}>
              <g
                className="footprint-marker"
                role="button"
                tabIndex={0}
                aria-label={`Select ${visit.city}`}
                onClick={() => onSelect(visit.id)}
                onKeyDown={event => selectWithKeyboard(event, () => onSelect(visit.id))}
              >
                <circle className="footprint-marker-hit" r={14} />
                <circle className="footprint-marker-dot" r={markerRadius} />
              </g>
            </g>
          )
        })}
      </g>
    </svg>
  )
})

ProvinceDetailMap.displayName = "ProvinceDetailMap"

interface DeferredFootprintMapProps extends Omit<ChinaFootprintMapProps, "mapData"> {
  className?: string
  onMapReady: (mapData: StaticChinaMapData) => void
}

const DeferredFootprintMap = memo(({ visits, selectedProvinceId, onSelect, onSelectProvince, onMapReady, className = "" }: DeferredFootprintMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null)
  const [shouldRender, setShouldRender] = useState(false)
  const [mapData, setMapData] = useState<StaticChinaMapData | null>(null)

  useEffect(() => {
    const target = mapRef.current
    if (!target) return

    if (!("IntersectionObserver" in window)) {
      const fallbackTimer = setTimeout(() => setShouldRender(true), 0)
      return () => clearTimeout(fallbackTimer)
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) {
        setShouldRender(true)
        observer.disconnect()
      }
    }, { rootMargin: "320px 0px" })

    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!shouldRender) return

    let active = true
    fetch("/maps/china-footprints-map.json?v=3", { cache: "no-store" })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`)
        return response.json() as Promise<unknown>
      })
      .then(payload => {
        if (!isStaticChinaMapData(payload)) {
          throw new Error("Unsupported footprint map data")
        }
        if (active) {
          setMapData(payload)
          onMapReady(payload)
        }
      })
      .catch(() => {
        if (active) setMapData(null)
      })

    return () => {
      active = false
    }
  }, [onMapReady, shouldRender])

  return (
    <div ref={mapRef} className={`footprint-map-shell ${className}`} aria-busy={!shouldRender}>
      {shouldRender && mapData
        ? <ChinaFootprintMap
          visits={visits}
          mapData={mapData}
          selectedProvinceId={selectedProvinceId}
          onSelect={onSelect}
          onSelectProvince={onSelectProvince}
        />
        : <div className="footprint-map-loading" />}
    </div>
  )
})

DeferredFootprintMap.displayName = "DeferredFootprintMap"

export const CalendarSection = () => {
  const sectionRef = useRef<HTMLElement>(null)
  const [visits, setVisits] = useState<FootprintVisit[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [selectedProvinceId, setSelectedProvinceId] = useState("")
  const [mapData, setMapData] = useState<StaticChinaMapData | null>(null)
  const [dataState, setDataState] = useState<"loading" | "ready" | "error">("loading")
  const selectedIdRef = useRef("")
  const scrollDistanceRef = useRef(0)

  useGSAP(() => {
    gsap.fromTo(
      ".calendar-title > *",
      { y: 80, autoAlpha: 0 },
      {
        y: 0,
        autoAlpha: 1,
        duration: 1,
        ease: "power3.out",
        stagger: 0.15,
        scrollTrigger: {
          trigger: ".calendar-title",
          start: "top 85%",
          toggleActions: "restart none restart none"
        }
      }
    )

    gsap.utils.toArray<HTMLElement>(".calendar-highlight, .footprint-highlight").forEach(highlight => {
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
    const loadVisits = async () => {
      try {
        const response = await fetch("/data/china_footprints_2026.json", { cache: "no-store" })
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const payload = await response.json() as FootprintData
        const validVisits = (payload.visits || []).filter(visit => (
          visit &&
          visit.id &&
          typeof visit.adcode === "string" &&
          visit.city &&
          Array.isArray(visit.coordinates) &&
          visit.coordinates.length === 2
        ))
        const firstVisit = validVisits[0]
        setVisits(validVisits)
        selectedIdRef.current = firstVisit?.id || ""
        setSelectedId(firstVisit?.id || "")
        setSelectedProvinceId(firstVisit ? provinceIdForVisit(firstVisit) : "")
        setDataState("ready")
      } catch {
        setDataState("error")
      }
    }

    loadVisits()
  }, [])

  const selectedVisit = visits.find(visit => visit.id === selectedId) || null
  const provinceCount = useMemo(() => new Set(visits.map(visit => visit.province)).size, [visits])

  const selectVisit = useCallback((id: string) => {
    const visit = visits.find(item => item.id === id)
    if (!visit) return
    selectedIdRef.current = visit.id
    setSelectedId(visit.id)
    setSelectedProvinceId(provinceIdForVisit(visit))
  }, [visits])

  const selectProvince = useCallback((id: string) => {
    setSelectedProvinceId(id)
    const firstVisit = visits.find(visit => provinceIdForVisit(visit) === id)
    if (firstVisit) {
      selectedIdRef.current = firstVisit.id
      setSelectedId(firstVisit.id)
    } else {
      selectedIdRef.current = ""
      setSelectedId("")
    }
  }, [visits])

  const selectRandomVisit = useCallback(() => {
    const candidates = visits.filter(visit => visit.id !== selectedIdRef.current)
    if (!candidates.length) return
    const nextVisit = candidates[Math.floor(Math.random() * candidates.length)]
    selectVisit(nextVisit.id)
  }, [selectVisit, visits])

  useEffect(() => {
    const section = sectionRef.current
    if (!section || visits.length < 2) return

    let previousScrollY = window.scrollY
    let frame = 0

    const handleScroll = () => {
      if (frame) return

      frame = window.requestAnimationFrame(() => {
        frame = 0
        const currentScrollY = window.scrollY
        const delta = currentScrollY - previousScrollY
        previousScrollY = currentScrollY

        if (delta <= 0) {
          scrollDistanceRef.current = 0
          return
        }

        const bounds = section.getBoundingClientRect()
        if (bounds.bottom <= 0 || bounds.top >= window.innerHeight) {
          scrollDistanceRef.current = 0
          return
        }

        scrollDistanceRef.current += delta
        if (scrollDistanceRef.current < 260) return

        scrollDistanceRef.current = 0
        selectRandomVisit()
      })
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => {
      window.removeEventListener("scroll", handleScroll)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [selectRandomVisit, visits.length])

  const handleMapReady = useCallback((payload: StaticChinaMapData) => {
    setMapData(payload)
  }, [])

  return (
    <section
      ref={sectionRef}
      className="calendar-section relative w-full bg-white pt-30 pb-10 2xl:pt-20 2xl:pb-10"
      aria-labelledby="calendar-title"
    >
      <div className="px-5">
        <div className="relative h-20 overflow-hidden md:h-41 lg:h-56 xl:h-65 2xl:h-116">
          <h2
            id="calendar-title"
            className="calendar-title relative z-10 flex flex-col font-sans text-[3.6em] uppercase leading-none text-default md:text-[8em] lg:text-[10.8em] xl:text-[13.7em] 2xl:text-[20em]"
          >
            <strong className="font-bungee text-accent">ALL</strong>
            <span className="absolute top-7 font-bold md:top-10 lg:top-14 2xl:top-38">Places</span>
          </h2>
          <span className="calendar-highlight absolute inset-0 z-10 block bg-accent" />
        </div>

        <div className="pt-10 2xl:px-30">
          <div className="relative">
            <h3 className="font-sans text-sm font-bold uppercase tracking-tighter text-default">China travel log</h3>
            <span className="calendar-highlight absolute inset-0 z-10 block bg-accent" />
          </div>
          <div className="relative max-w-2xl">
            <p className="mt-6 font-sans text-2xl text-default lg:max-w-xl">
              A living map of places and pauses. Select a city to hold its story in view.
            </p>
            <span className="calendar-highlight absolute inset-0 z-10 block bg-accent" />
          </div>
        </div>

        <div
          className="footprint-workspace pt-14 2xl:px-30"
        >
          <div className="footprint-map-panel">
            <div className="footprint-map-header">
              <div>
                <span className="footprint-kicker footprint-highlight-target">
                  China / {dataState === "ready" ? "ALL TIME" : "loading"}
                  <i className="footprint-highlight" />
                </span>
                <h3>Places in motion</h3>
              </div>
              <span className="footprint-mode">SCROLL EXPLORE</span>
            </div>

            <div className="footprint-map-stage footprint-map-canvas">
              <DeferredFootprintMap
                visits={visits}
                selectedProvinceId={selectedProvinceId}
                onSelect={selectVisit}
                onSelectProvince={selectProvince}
                onMapReady={handleMapReady}
              />

              <div className="footprint-map-note">
                <i /> PROVINCE LIGHTS <span>CLICK A REGION FOR CITIES</span>
              </div>
            </div>

            <div className="footprint-map-footer">
              <span>{visits.length || "--"} CITIES MAPPED</span>
              <span>{provinceCount || "--"} PROVINCES TOUCHED</span>
              <span>SCROLL TO CHANGE CITY</span>
            </div>
          </div>

          <aside className="footprint-visit-panel" aria-live="polite">
            <div className="footprint-province-selected">
              <span className="footprint-kicker footprint-highlight-target">
                Selected province
                <i className="footprint-highlight" />
              </span>
              <h3>{mapData?.provinceShapes?.find(province => province.id === selectedProvinceId)?.name || "China"}</h3>
              <div className="footprint-province-map">
                {mapData ? (
                  <ProvinceDetailMap
                    visits={visits}
                    mapData={mapData}
                    provinceId={selectedProvinceId}
                    onSelect={selectVisit}
                  />
                ) : (
                  <div className="footprint-map-loading" />
                )}
              </div>
            </div>

            <div className="footprint-visit-selected">
              <span className="footprint-kicker footprint-highlight-target">
                Selected footprint
                <i className="footprint-highlight" />
              </span>

              {selectedVisit ? (
                <div className="footprint-photo-frame" key={selectedVisit.id}>
                  <div className={`footprint-photo-placeholder ${selectedVisit.image ? "has-image" : ""}`}>
                    {selectedVisit.image ? (
                      <img
                        className="footprint-photo-image"
                        src={selectedVisit.image}
                        alt={`${selectedVisit.city} landmark`}
                      />
                    ) : (
                      <span>PHOTO / PLACEHOLDER</span>
                    )}
                    <strong>{selectedVisit.city}</strong>
                  </div>
                  <div className="footprint-photo-details">
                    <time>{formatVisitDate(selectedVisit.date)}</time>
                    <p>{selectedVisit.note}</p>
                  </div>
                </div>
              ) : (
                <p className="footprint-empty">{dataState === "error" ? "Footprint data unavailable." : "No recorded visit in this province."}</p>
              )}
            </div>

          </aside>
        </div>
      </div>
    </section>
  )
}
