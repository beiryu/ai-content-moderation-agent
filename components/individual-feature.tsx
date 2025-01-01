"use client"

import { useEffect, useRef } from "react"
import FeatureIcon from "@/assets/icons/ecosystem.svg"
import { motion, useMotionTemplate, useMotionValue } from "framer-motion"

export function IndividualFeature({
  key,
  title,
  description,
}: {
  key: number
  title: string
  description: string
}) {
  const offSetX = useMotionValue(-100)
  const offSetY = useMotionValue(-100)

  const maskImage = useMotionTemplate`radial-gradient(100px 100px at ${offSetX}px ${offSetY}px, black, transparent)`

  const border = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const updateMousePosition = (e: MouseEvent) => {
      if (!border.current) return

      const borderRect = border.current?.getBoundingClientRect()

      offSetX.set(e.x - borderRect.x)
      offSetY.set(e.y - borderRect.y)
    }

    window.addEventListener("mousemove", updateMousePosition)

    return () => window.removeEventListener("mousemove", updateMousePosition)
  })

  return (
    <li
      key={key}
      className="relative px-5 py-10 max-w-[330px] h-[312px] lg:h-auto mx-auto flex flex-col justify-center items-center gap-y-5 border-white/30 border-[1px] rounded-xl"
    >
      <motion.div
        ref={border}
        className="absolute inset-0 border-2 border-white rounded-xl"
        style={{
          maskImage: maskImage,
          WebkitMaskImage: maskImage,
        }}
      ></motion.div>
      <figure>
        <FeatureIcon />
      </figure>
      <article>
        <h3 className="font-bold text-center">{title}</h3>
        <p className="text-white/50 text-center pt-2">{description}</p>
      </article>
    </li>
  )
}
