"use client"
import gsap from "gsap"
import clsx from "clsx"
import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import { useMenuStore } from "@/app/store"
import { Logo } from "../vectors/logo"
import Link from "next/link"

export const Header = () => {
  const { open, setOpen } = useMenuStore()
  const topLineRef = useRef<HTMLDivElement>(null)
  const bottomLineRef = useRef<HTMLDivElement>(null)

  const handleMenuOpen = () => {
    setOpen(!open)
  }

  useGSAP(() => {
    if (!topLineRef.current || !bottomLineRef.current) {
      return
    }

    const tl = gsap.timeline({ paused: true })

    tl.to(topLineRef.current, {
      y: 6,
      rotation: 45,
      duration: 0.35,
      ease: "power2.out"
    }).to(bottomLineRef.current, {
      y: -6,
      rotation: -45,
      duration: 0.35,
      ease: "power2.out"
    }, "<")

    tl.to([topLineRef.current, bottomLineRef.current], {
      backgroundColor: "#fff",
      duration: 0.2
    }, "<")

    if (open) {
      tl.play()
    } else {
      gsap.to(topLineRef.current, {
        y: 0,
        rotation: 0,
        backgroundColor: "#1748d6",
        duration: 0.35,
        ease: "power2.out"
      })

      gsap.to(bottomLineRef.current, {
        y: 0,
        rotation: 0,
        backgroundColor: "#1748d6",
        duration: 0.35,
        ease: "power2.out"
      })
    }
  }, [open])

  return (
    <header className={clsx(
      "px-6 w-full h-30 flex justify-between items-center bg-transparent z-999",
      open ? "fixed" : "absolute"
    )}>
      <Link href="/" aria-label="Mingdao Gong home">
        <Logo width="190" height="64" fill="var(--color-default)" />
      </Link>
      <div className="flex items-center gap-x-2">
        <button
          type="button"
          aria-label="menu"
          aria-expanded={open}
          aria-controls="site-menu"
          onClick={handleMenuOpen}
          className={clsx(
            "w-18 h-14 flex flex-col justify-center items-center gap-2",
            open ? "bg-black" : "bg-transparent"
          )}
        >
          <div
            ref={topLineRef}
            className="w-6 h-0.75 bg-default"
          />
          <div
            ref={bottomLineRef}
            className="w-6 h-0.75 bg-default"
          />
        </button>
      </div>
    </header>
  )
}
