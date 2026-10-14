"use client"
import { useMenuStore, useSectionState } from "@/app/store"
import { GMark } from "../g-mark"

interface LogoProps {
  width: string
  height: string
  fill: string
}

export const Logo = ({ width, height, fill }: LogoProps) => {
  const { open } = useMenuStore()
  const { sectionBackground } = useSectionState()
  const color = open || sectionBackground === "dark" ? "var(--color-white)" : fill

  return (
    <span className="brand-lockup" style={{ width, height, color }}>
      <GMark />
      <span className="brand-name">
        <span>MINGDAO</span>
        <span>GONG</span>
      </span>
    </span>
  )
}
