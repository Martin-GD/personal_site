"use client"
import { useEffect, useRef, useState } from "react"
import { motion, useAnimationFrame, useMotionTemplate, useMotionValue, useSpring, useTransform } from "framer-motion"

interface HeroCursorLensProps {
  parallaxStrength?: number
  blobSize?: number
  previewCursor?: boolean
}

export const HeroSection = ({
  parallaxStrength = 3,
  blobSize = 200,
  previewCursor = false
}: HeroCursorLensProps) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isHovering, setIsHovering] = useState<boolean>(false)
  const [heroScale, setHeroScale] = useState(1)
  const isActive = isHovering || previewCursor
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)
  const mouseXRatio = useMotionValue(0)
  const mouseYRatio = useMotionValue(0)
  const smooth = { stiffness: 300, damping: 40 }
  const smoothX = useSpring(mouseXRatio, smooth)
  const smoothY = useSpring(mouseYRatio, smooth)
  const baseX = useTransform(smoothX, [-1, 1], [parallaxStrength, -parallaxStrength])
  const baseY = useTransform(smoothY, [-1, 1], [parallaxStrength, -parallaxStrength])
  const revealX = useTransform(smoothX, [-1, 1], [parallaxStrength * 2, -parallaxStrength * 2])
  const revealY = useTransform(smoothY, [-1, 1], [parallaxStrength * 2, -parallaxStrength * 2])
  const baseImage = "/images/hero/mingdao-race-face-upper.png"
  const revealImage = "/images/hero/mingdao-race-helmet-upper.png"

  useEffect(() => {
    const element = containerRef.current
    if (!element) {
      return
    }

    const updateScale = () => {
      setHeroScale(Math.min(1.2, Math.max(0.78, element.clientHeight / 820)))
    }

    updateScale()
    const observer = new ResizeObserver(updateScale)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!containerRef.current) {
        return
      }
      const rect = containerRef.current.getBoundingClientRect()
      const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom

      setIsHovering(inside)

      if (!inside) {
        mouseXRatio.set(0)
        mouseYRatio.set(0)
        return
      }

      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      mouseX.set(x)
      mouseY.set(y)
      mouseXRatio.set((x / rect.width) * 2 - 1)
      mouseYRatio.set((y / rect.height) * 2 - 1)
    }

    window.addEventListener("mousemove", handleMove)
    return () => window.removeEventListener("mousemove", handleMove)
  }, [])

  const wake = (index: number) => ({
    x: useSpring(mouseX, {
      stiffness: 250 - index * 30,
      damping: 30 + index * 4
    }),
    y: useSpring(mouseY, {
      stiffness: 250 - index * 30,
      damping: 30 + index * 4
    })
  })

  const head = wake(0)
  const body1 = wake(1)
  const body2 = wake(2)
  const responsiveBlobSize = blobSize * heroScale
  const ambientBlobSize = 88 * heroScale
  const ambientMask = useMotionValue("radial-gradient(ellipse 16px 10px at 50% 35%, #fff 0 58%, transparent 100%)")
  const ambientBlobs = useRef([
    { phaseX: 0.2, phaseY: 1.4, speedX: 0.00032, speedY: 0.00041, orbitX: 0.26, orbitY: 0.32, radiusX: 0.48, radiusY: 0.32 },
    { phaseX: 1.8, phaseY: 2.7, speedX: 0.00045, speedY: 0.00029, orbitX: 0.34, orbitY: 0.22, radiusX: 0.4, radiusY: 0.52 },
    { phaseX: 3.3, phaseY: 0.6, speedX: 0.00027, speedY: 0.00053, orbitX: 0.2, orbitY: 0.4, radiusX: 0.6, radiusY: 0.35 },
    { phaseX: 4.6, phaseY: 3.8, speedX: 0.00051, speedY: 0.00036, orbitX: 0.3, orbitY: 0.28, radiusX: 0.36, radiusY: 0.48 },
    { phaseX: 5.4, phaseY: 5.1, speedX: 0.00038, speedY: 0.00047, orbitX: 0.37, orbitY: 0.35, radiusX: 0.5, radiusY: 0.3 },
    { phaseX: 2.5, phaseY: 4.4, speedX: 0.00058, speedY: 0.00031, orbitX: 0.24, orbitY: 0.25, radiusX: 0.55, radiusY: 0.38 }
  ]).current

  useAnimationFrame(time => {
    const element = containerRef.current
    if (!element) {
      return
    }

    const width = element.clientWidth
    const height = element.clientHeight
    const slowTime = time * 0.7
    const gradients = ambientBlobs.map(blob => {
      const x = width * (0.5 + Math.sin(slowTime * blob.speedX + blob.phaseX) * blob.orbitX)
      const y = height * (0.42 + Math.cos(slowTime * blob.speedY + blob.phaseY) * blob.orbitY)
      const squeeze = Math.sin(time * 0.002 + blob.phaseX)
      const stretchX = 1 + squeeze * 0.3
      const stretchY = 1 - squeeze * 0.22
      return `radial-gradient(ellipse ${blob.radiusX * ambientBlobSize * stretchX}px ${blob.radiusY * ambientBlobSize * stretchY}px at ${x}px ${y}px, #fff 0 58%, transparent 100%)`
    })

    ambientMask.set(gradients.join(","))
  })

  const activeRevealMask = useMotionTemplate`
    radial-gradient(ellipse ${responsiveBlobSize * 0.88}px ${responsiveBlobSize * 0.54}px at ${head.x}px ${head.y}px, #fff 0 58%, transparent 100%),
    radial-gradient(ellipse ${responsiveBlobSize * 0.66}px ${responsiveBlobSize * 0.42}px at ${body1.x}px ${body1.y}px, #fff 0 62%, transparent 100%),
    radial-gradient(ellipse ${responsiveBlobSize * 0.42}px ${responsiveBlobSize * 0.28}px at ${body2.x}px ${body2.y}px, #fff 0 66%, transparent 100%)
  `
  const revealMask = useMotionTemplate`${ambientMask}, ${isActive ? activeRevealMask : "radial-gradient(circle 0px at 50% 50%, transparent 0 100%)"}`
  const scrollY = useMotionValue(0)
  const minInset = 50
  const maxInset = 152
  const insetTop = useTransform(scrollY, [0, 500], [maxInset, minInset])
  const insetTopStr = useTransform(insetTop, v => `${v}px 0px 0`)

  useEffect(() => {
    const onScroll = () => scrollY.set(window.scrollY)
    window.addEventListener("scroll", onScroll)
    return () => window.removeEventListener("scroll", onScroll)
  }, [scrollY])

  const imageLayer: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "center bottom",
    backgroundSize: "contain",
    backgroundColor: "transparent",
    imageRendering: "auto",
    willChange: "transform"
  }

  return (
    <section aria-labelledby="hero-name" className="hero-section w-full flex justify-center items-center overflow-hidden">
      <h1 id="hero-name" className="hero-name uppercase">
        <span>Mingdao</span>
        <span>Gong</span>
      </h1>
      <div className="w-full h-full relative">
        <div
          ref={containerRef}
          className="relative w-full h-full overflow-hidden z-10"
          data-lens-active={isActive}
        >
          <motion.div className="hero-base-layer" style={{ ...imageLayer, backgroundImage: `url(${baseImage})`, x: baseX, y: baseY }} />
          <motion.div
            className="hero-reveal-layer hidden lg:block"
            style={{
              ...imageLayer,
              width: "100%",
              height: "100%",
              inset: 0,
              backgroundImage: `url(${revealImage})`,
              x: revealX,
              y: revealY,
              maskImage: revealMask,
              WebkitMaskImage: revealMask,
              maskComposite: "add",
              WebkitMaskComposite: "source-over",
              pointerEvents: "none"
            }}
          />
        </div>
      </div>
    </section>
  )
}
