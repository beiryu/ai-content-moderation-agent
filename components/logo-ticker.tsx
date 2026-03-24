"use client"

import React from "react"
import Image from "next/image"
import acmeLogo from "@/assets/images/acme.png"
import apexLogo from "@/assets/images/apex.png"
import celestialLogo from "@/assets/images/celestial.png"
import echoLogo from "@/assets/images/echo.png"
import pulseLogo from "@/assets/images/pulse.png"
import quantumLogo from "@/assets/images/quantum.png"
import { motion } from "framer-motion"

const images = [
  { src: acmeLogo, alt: "Acme Logo" },
  { src: quantumLogo, alt: "Quantum Logo" },
  { src: echoLogo, alt: "Echo Logo" },
  { src: celestialLogo, alt: "Celestial Logo" },
  { src: pulseLogo, alt: "Pulse Logo" },
  { src: apexLogo, alt: "Apex Logo" },
  { src: acmeLogo, alt: "Acme Logo" },
  { src: quantumLogo, alt: "Quantum Logo" },
  { src: echoLogo, alt: "Echo Logo" },
  { src: celestialLogo, alt: "Celestial Logo" },
  { src: pulseLogo, alt: "Pulse Logo" },
  { src: apexLogo, alt: "Apex Logo" },
  { src: acmeLogo, alt: "Acme Logo" },
  { src: quantumLogo, alt: "Quantum Logo" },
  { src: echoLogo, alt: "Echo Logo" },
  { src: celestialLogo, alt: "Celestial Logo" },
  { src: pulseLogo, alt: "Pulse Logo" },
  { src: apexLogo, alt: "Apex Logo" },
]

export function LogoTicker() {
  return (
    <div className="container">
      <div className="relative w-screen max-w-full overflow-x-hidden py-24 [mask-image:linear-gradient(to_right,transparent,black,black,black,transparent)]">
        <h2 className="text-center text-lg text-white/50 mb-9">
          Get hired by top companies worldwide
        </h2>
        <motion.div
          className="flex justify-center items-center gap-x-10"
          transition={{
            repeat: Infinity,
            repeatType: "mirror",
            duration: 20,
            ease: "easeInOut",
          }}
          animate={{
            x: [0, "50%"],
          }}
        >
          {images.map((img, index) => (
            <Image
              key={index}
              src={img.src}
              alt={img.alt}
              height={20}
              width={100}
              className="w-auto"
            />
          ))}
        </motion.div>
      </div>
    </div>
  )
}
