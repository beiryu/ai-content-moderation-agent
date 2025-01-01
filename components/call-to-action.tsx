"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import pieChart from "@/assets/images/emojistar.png"
import cog from "@/assets/images/helix2.png"
import { motion, useScroll, useTransform } from "framer-motion"

export function CallToAction() {
  const ctaRef = useRef<HTMLElement>(null)
  const [input, setInput] = useState("")

  const resetInput = () =>
    setTimeout(() => {
      setInput("")
    }, 2000)

  const { scrollYProgress } = useScroll({
    target: ctaRef,
    offset: ["start end", "end end"],
  })

  const translateY = useTransform(scrollYProgress, [0, 1], [20, -20])

  return (
    <section ref={ctaRef} className="py-28">
      <div className="container relative flex justify-center items-center flex-col gap-7">
        <h2 className="text-5xl md:text-6xl text-center font-bold tracking-tighter">
          Get instant access
        </h2>
        <p className="max-w-xl mx-auto text-center text-white/50 text-xl">
          Celebrate the joy of accomplishment with an app designed to track your
          progress and motivate your efforts.
        </p>
        <form className="mx-auto">
          <input
            type="text"
            placeholder="your@example.com"
            defaultValue={input}
            className="ctaBaseStyling bg-white/20 w-full md:w-60 mb-2 md:mr-2"
          />
          <button
            className="ctaBaseStyling cta-primary w-full md:w-auto"
            onClick={(e) => {
              e.preventDefault()
              setInput("Form not in operation")
              resetInput()
            }}
          >
            Get access
          </button>
        </form>
        <motion.div
          className="hidden md:block absolute md:-left-24 xl:left-[88px] -top-28"
          style={{ translateY }}
        >
          <Image
            src={pieChart}
            alt="cursor icon"
            width={200}
            height={200}
            className="h-auto max-w-none"
          />
        </motion.div>

        <motion.div
          className="hidden md:block absolute md:-right-24 xl:right-[50px] top-[60px]"
          style={{ translateY }}
        >
          <Image
            src={cog}
            alt="message icon"
            width={200}
            height={200}
            className="h-auto max-w-none"
          />
        </motion.div>
      </div>
    </section>
  )
}
