"use client"

import { useRef } from "react"
import Image from "next/image"
import appScreen from "@/assets/images/app-screen.png"
import { motion, useScroll, useTransform } from "framer-motion"

export function ProductShowcase() {
  const imageRef = useRef<HTMLImageElement>(null)

  const { scrollYProgress } = useScroll({
    target: imageRef,
    offset: ["start end", "end end"],
  })

  const rotateX = useTransform(scrollYProgress, [0, 1], [15, 0])
  const opacity = useTransform(scrollYProgress, [0, 1], [0.5, 1])

  return (
    <section className="py-24 bg-[linear-gradient(to_bottom,#000,#200d42_34%,#4f21a1)]">
      <div className="container">
        <h2 className="text-5xl md:text-6xl text-center font-bold tracking-tighter">
          Intuitive interface
        </h2>
        <p className="max-w-md mx-auto text-center text-white/50 mt-5">
          Get instant feedback, personalized coaching, and detailed analytics to
          help you stay on track and achieve your goals faster than ever before.
        </p>
        <motion.figure
          className="relative grid place-content-center mt-14"
          style={{
            opacity: opacity,
            rotateX: rotateX,
            transformPerspective: "800px",
          }}
        >
          <Image src={appScreen} alt="screenshot of app" ref={imageRef} />
        </motion.figure>
      </div>
    </section>
  )
}
