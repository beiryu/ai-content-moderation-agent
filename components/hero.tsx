"use client"

import React from "react"
import Image from "next/image"
import Arrow from "@/assets/icons/arrow-w.svg"
import cursor from "@/assets/images/cursor.png"
import message from "@/assets/images/message.png"
import { motion } from "framer-motion"

export function Hero() {
  return (
    // eslint-disable-next-line tailwindcss/migration-from-tailwind-2
    <section className="relative bg-[linear-gradient(to_bottom,#000,#200d42_34%,#4f21a1_65%,#a46ed8_82%)] py-[72px] overflow-clip">
      <div className="container relative z-10">
        <article className="flex flex-col justify-center items-center gap-y-8">
          <a
            href="#"
            className="w-fit flex justify-center items-center gap-2 border-[1px] border-white/30 rounded-lg px-2 py-1"
          >
            <span className="bg-[linear-gradient(to_right,#F87AFF,#FB93D0,#FFDD99,#C3F0B2,#2FD8FE)] bg-clip-text text-transparent">
              Best AI Tool for Interview Candidates
            </span>
            <span className="flex justify-center items-center gap-2">
              Read more <Arrow />
            </span>
          </a>
          <div className="inline-flex relative">
            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter w-[320px] md:w-[550px] text-center">
              AI Interview for Job Interviews
            </h1>
            <motion.div
              className="hidden md:block absolute right-[507px] lg:right-[512px] top-[108px]"
              drag
              dragSnapToOrigin
            >
              <Image
                src={cursor}
                alt="cursor icon"
                width={200}
                height={200}
                className="h-auto max-w-none hover:cursor-grab active:cursor-grabbing"
                draggable={false}
              />
            </motion.div>
            <motion.div
              className="hidden md:block absolute left-[503px] lg:left-[513px] top-[56px]"
              drag
              dragSnapToOrigin
            >
              <Image
                src={message}
                alt="message icon"
                width={200}
                height={200}
                className="h-auto max-w-none hover:cursor-grab active:cursor-grabbing"
                draggable={false}
              />
            </motion.div>
          </div>
          <p className="text-xl max-w-[448px] text-center">
            Let&apos;s Take Wise is your AI-powered interview coach that helps
            you prepare for your job interview by generating personalized Q&A.
            It also provides real-time response assistance during your
            interviews.
          </p>
          <button className="ctaBaseStyling cta-primary">Get for free</button>
        </article>
      </div>
      <div className="absolute top-[calc(100%-96px)] sm:top-[calc(100%-120px)] h-[375px] w-[750px] sm:w-[2500px] sm:h-[768px] left-1/2 -translate-x-1/2 rounded-[100%] bg-black border-[#b48cde] bg-[radial-gradient(closest-side,#000_82%,#9560eb)]"></div>
    </section>
  )
}
