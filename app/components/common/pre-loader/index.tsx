"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"
import { GMark } from "../vectors/g-mark"

export const PreLoader = () => {
  const rootRef = useRef<HTMLDivElement>(null)
  const counterRef = useRef<HTMLSpanElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const audioUnlocked = useRef(false)

  useEffect(() => {
    const unlockAudio = () => {
      if (!audioRef.current || audioUnlocked.current) {
        return
      }

      audioRef.current.play().then(() => {
        audioRef.current!.pause()
        audioRef.current!.currentTime = 0
        audioUnlocked.current = true
      }).catch(() => {})

      window.removeEventListener("pointerdown", unlockAudio)
    }

    window.addEventListener("pointerdown", unlockAudio)

    return () => {
      window.removeEventListener("pointerdown", unlockAudio)
    }
  }, [])

  useEffect(() => {
    if (!rootRef.current || !counterRef.current) {
      return
    }

    const layers = gsap.utils.toArray<HTMLElement>(
      rootRef.current.querySelectorAll("[class^='pre-loader-layer']")
    )

    const counter = { value: 0 }
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    const duration = reducedMotion ? 0.2 : 4
    const brand = rootRef.current.querySelector(".loader-brand")
    const mark = rootRef.current.querySelector(".loader-mark-fill")
    gsap.set(layers, { xPercent: 0 })
    gsap.set(counterRef.current, { x: 0 })
    const tl = gsap.timeline({ delay: 0.5 })

    tl.to(counter, {
      value: 100,
      duration,
      ease: "none",
      onUpdate: () => {
        counterRef.current!.innerText = `${Math.floor(counter.value)}%`
      },
      onComplete: () => {
        if (audioRef.current && audioUnlocked.current) {
          audioRef.current.currentTime = 0
          audioRef.current.play().catch(() => {})
        }
      }
    })

    tl.fromTo(mark, {
      clipPath: "inset(100% 0 0)"
    }, {
      clipPath: "inset(0% 0 0)",
      duration,
      ease: "none"
    }, 0)

    tl.addLabel("counterDone")

    const textDuration = reducedMotion ? 0.1 : 0.9

    tl.to(brand, {
      autoAlpha: 0,
      y: reducedMotion ? 0 : -24,
      duration: textDuration,
      ease: "power2.in"
    }, "counterDone")

    tl.to(
      counterRef.current,
      {
        x: "110vw",
        duration: textDuration,
        ease: "power4.inOut"
      },
      "counterDone"
    )

    tl.addLabel("layersOut", `counterDone+=${textDuration}`)

    tl.to(
      layers,
      {
        xPercent: -100,
        duration: reducedMotion ? 0.1 : 0.9,
        ease: "power4.inOut",
        stagger: reducedMotion ? 0 : 0.25
      },
      "layersOut"
    )

    tl.to(rootRef.current, {
      autoAlpha: 0,
      duration: 0.6,
      pointerEvents: "none"
    })

    return () => {
      tl.kill()
    }
  }, [])

  return (
    <div
      ref={rootRef}
      className="pre-loader fixed inset-0 w-full h-dvh overflow-hidden z-9999"
      role="status"
      aria-label="Loading Mingdao Gong"
    >
      <audio ref={audioRef} preload="auto">
        <source src="/audio/f1.mp3" type="audio/mp3" />
      </audio>
      <div className="relative w-full h-full flex flex-col">
        <div className="pre-loader-layer-1 flex-1 bg-default" />
        <div className="pre-loader-layer-2 flex-1 bg-default" />
        <div className="pre-loader-layer-3 flex-1 bg-default" />
        <div className="pre-loader-layer-4 flex-1 bg-default" />
        <div className="pre-loader-layer-5 flex-1 bg-default" />
        <div className="loader-brand" aria-hidden="true">
          <div className="loader-mark">
            <GMark className="loader-mark-track" />
            <GMark className="loader-mark-fill" />
          </div>
          <span className="loader-name">MINGDAO GONG</span>
        </div>
        <span
          ref={counterRef}
          aria-hidden="true"
          className="absolute bottom-2 right-6 font-bungee text-[5.5em] md:text-[9em] lg:text-[11em] 2xl:text-[16em] leading-none text-white font-extrabold z-10"
        >
          0%
        </span>
      </div>
    </div>
  )
}
