"use client"

import { useState } from "react"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { ScrollTrigger } from "gsap/all"
import { LuArrowUpRight, LuChevronDown } from "react-icons/lu"

gsap.registerPlugin(ScrollTrigger)

const papers = [
  {
    id: "01",
    title: "Medical image registration and its application in retinal images: a review",
    authors: "Q Nie, X Zhang, Y Hu, M Gong, J Liu",
    venue: "Visual Computing for Industry, Biomedicine, and Art 7 (1), 21",
    year: "2024",
    citations: "25 CITATIONS",
    type: "REVIEW",
    summary: "A structured review of retinal image registration methods, their clinical applications, and the challenges that remain across multimodal and longitudinal data.",
    href: "https://scholar.google.com/citations?view_op=view_citation&hl=zh-CN&user=vYyDpIQAAAAJ&citation_for_view=vYyDpIQAAAAJ:9yKSN-GCB0IC"
  },
  {
    id: "02",
    title: "COph100: A comprehensive fundus image registration dataset from infants constituting the RIDIRP database",
    authors: "Y Hu, M Gong, Z Qiu, J Liu, H Shen, M Yuan, X Zhang, H Li, H Lu, J Liu",
    venue: "Scientific Data 12 (1), 99",
    year: "2025",
    citations: "5 CITATIONS",
    type: "DATASET",
    summary: "A carefully curated infant fundus dataset designed to support robust registration research and make retinal imaging benchmarks more representative.",
    href: "https://scholar.google.com/citations?view_op=view_citation&hl=zh-CN&user=vYyDpIQAAAAJ&citation_for_view=vYyDpIQAAAAJ:d1gkVwhDpl0C"
  },
  {
    id: "03",
    title: "Surgfm-Slam: robust surgical scene reconstruction via 3D foundation adaptation model",
    authors: "L Xiaoxi, L Gan, D Bingwen, C Guangcheng, G Mingdao, H Yan, et al.",
    venue: "Health Information Science and Systems 14 (1), 82",
    year: "2026",
    citations: "IN PRESS",
    type: "3D VISION",
    summary: "A surgical scene reconstruction direction that adapts foundation models to improve spatial understanding in demanding medical environments.",
    href: "https://scholar.google.com/citations?view_op=view_citation&hl=zh-CN&user=vYyDpIQAAAAJ&citation_for_view=vYyDpIQAAAAJ:2osOgNQ5qMEC"
  },
  {
    id: "04",
    title: "Self-Supervised Structure-Preserved Image Registration Framework for Multimodal Retinal Images",
    authors: "Y Hu, S Dong, M Gong, Q Nie, J Liu",
    venue: "2023 6th International Conference on Information Communication and Signal Processing",
    year: "2023",
    citations: "CONFERENCE PAPER",
    type: "SELF-SUPERVISED",
    summary: "A self-supervised registration framework focused on preserving anatomical structure while aligning multimodal retinal images.",
    href: "https://scholar.google.com/citations?view_op=view_citation&hl=zh-CN&user=vYyDpIQAAAAJ&citation_for_view=vYyDpIQAAAAJ:u-x6o8ySG0sC"
  }
]

export const ResearchSection = () => {
  const [openId, setOpenId] = useState<string | null>(null)

  useGSAP(() => {
    gsap.fromTo(
      ".research-title > *",
      { y: 80, autoAlpha: 0 },
      {
        y: 0,
        autoAlpha: 1,
        duration: 1,
        ease: "power3.out",
        stagger: 0.15,
        scrollTrigger: {
          trigger: ".research-title",
          start: "top 100%",
          toggleActions: "restart none restart none"
        }
      }
    )

    gsap.utils.toArray<HTMLElement>(".research-highlight").forEach((highlight) => {
      gsap.set(highlight, { scaleX: 0, transformOrigin: "left center" })
      gsap.timeline({
        scrollTrigger: {
          trigger: highlight.parentElement,
          start: "top 90%",
          toggleActions: "restart none restart none"
        }
      }).to(highlight, {
        scaleX: 1,
        duration: 0.7,
        ease: "power3.out"
      }).to(highlight, {
        scaleX: 0,
        transformOrigin: "right center",
        duration: 0.7,
        ease: "power3.in",
        delay: 0.15
      })
    })
  }, [])

  return (
    <section id="research" className="research-section 2xl:pt-24 pb-20 2xl:pb-30 px-5 w-full" aria-labelledby="research-title">
      <div className="relative h-30 md:h-57.5 lg:h-77.5 xl:h-95 2xl:h-162.5 overflow-hidden">
        <h2 id="research-title" className="research-title flex flex-col font-sans text-[5em] md:text-[11em] lg:text-[14em] xl:text-[19em] 2xl:text-[27em] uppercase leading-none text-white relative z-10">
          <strong className="font-bungee text-accent opacity-0">In</strong>
          <span className="absolute top-7 md:top-10 lg:top-14 2xl:top-50 font-bold opacity-0">Research</span>
        </h2>
        <span className="research-highlight absolute inset-0 block bg-accent z-10" />
      </div>

      <div className="pt-10 2xl:px-30">
        <div className="relative">
          <h3 className="relative w-fit font-sans text-sm font-bold uppercase tracking-tighter text-white overflow-hidden">
            <span>SUSTech PhD <em className="not-italic text-accent">·</em> Shenzhen, China</span>
          </h3>
          <span className="research-highlight absolute inset-0 block bg-accent z-10" />
        </div>
        <div className="relative max-w-2xl">
          <p className="mt-6 font-sans text-2xl text-white">
            Medical image processing and image registration, with a focus on preserving structure across multimodal retinal and clinical images.
          </p>
          <span className="research-highlight absolute inset-0 block bg-accent z-10" />
        </div>
      </div>

      <div className="research-list pt-20 2xl:px-30">
        {papers.map((paper) => {
          const isOpen = openId === paper.id
          return (
            <article className={`research-paper ${isOpen ? "is-open" : ""}`} key={paper.id}>
              <button
                type="button"
                className="research-paper-trigger"
                aria-expanded={isOpen}
                aria-controls={`paper-detail-${paper.id}`}
                onClick={() => setOpenId(isOpen ? null : paper.id)}
              >
                <span className="research-paper-number">{paper.id}</span>
                <span className="research-paper-main">
                  <span className="research-paper-type">{paper.type}</span>
                  <span className="research-paper-title">{paper.title}</span>
                  <span className="research-paper-venue">{paper.venue}</span>
                </span>
                <span className="research-paper-meta">
                  <strong>{paper.year}</strong>
                  <small>{paper.citations}</small>
                </span>
                <span className="research-paper-icon" aria-hidden="true"><LuChevronDown /></span>
              </button>
              <div id={`paper-detail-${paper.id}`} className="research-paper-detail" hidden={!isOpen}>
                <p>{paper.summary}</p>
                <div className="research-paper-detail-footer">
                  <span>{paper.authors}</span>
                  <a href={paper.href} target="_blank" rel="noopener noreferrer">
                    View paper <LuArrowUpRight aria-hidden="true" />
                  </a>
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
