"use client"

import { useRef } from "react"
import Image from "next/image"
import avatar1 from "@/assets/images/avatar-1.png"
import avatar2 from "@/assets/images/avatar-2.png"
import avatar3 from "@/assets/images/avatar-3.png"
import avatar4 from "@/assets/images/avatar-4.png"
import avatar5 from "@/assets/images/avatar-5.png"
import avatar6 from "@/assets/images/avatar-6.png"
import avatar7 from "@/assets/images/avatar-7.png"
import avatar8 from "@/assets/images/avatar-8.png"
import avatar9 from "@/assets/images/avatar-9.png"
import { motion, useScroll, useTransform } from "framer-motion"

const testimonialsList1 = [
  {
    text: "This AI interview assistant helped me prepare thoroughly for my tech interviews. The mock interviews felt incredibly realistic!",
    imageSrc: avatar1.src,
    name: "Jamie Rivera",
    username: "@jamietechguru00",
  },
  {
    text: "The personalized feedback on my interview responses helped me identify and improve my weaknesses. Landed my dream job at a top tech company!",
    imageSrc: avatar2.src,
    name: "Josh Smith",
    username: "@jjsmith",
  },
  {
    text: "The AI-powered resume optimization feature helped my application stand out. I received more interview calls than ever before.",
    imageSrc: avatar3.src,
    name: "Morgan Lee",
    username: "@morganleewhiz",
  },
]

const testimonialsList2 = [
  {
    text: "As a career coach, I recommend this app to all my clients. The AI interview scenarios are comprehensive and industry-specific.",
    imageSrc: avatar4.src,
    name: "Casey Jordan",
    username: "@caseyj",
  },
  {
    text: "The app's job market insights and salary negotiation tips were invaluable. I successfully negotiated a 25% higher offer than initially proposed.",
    imageSrc: avatar5.src,
    name: "Taylor Kim",
    username: "@taylorkimm",
  },
  {
    text: "Practice makes perfect! The variety of interview questions and real-time feedback helped me feel confident in actual interviews.",
    imageSrc: avatar6.src,
    name: "Riley Smith",
    username: "@rileysmith1",
  },
]

const testimonialsList3 = [
  {
    text: "The AI-powered behavioral question analysis helped me structure my responses using the STAR method effectively.",
    imageSrc: avatar7.src,
    name: "Jordan Patels",
    username: "@jpatelsdesign",
  },
  {
    text: "From resume screening to offer negotiation, this app guided me through every step of my job search journey.",
    imageSrc: avatar8.src,
    name: "Sam Dawson",
    username: "@dawsontechtips",
  },
  {
    text: "The mock interview recordings and detailed feedback helped me improve my communication skills significantly.",
    imageSrc: avatar9.src,
    name: "Casey Harper",
    username: "@casey09",
  },
]

export function Testimonials() {
  const testimonialRef = useRef(null)

  const { scrollYProgress } = useScroll({
    target: testimonialRef,
    offset: ["start end", "end start"],
  })

  const translateYUp = useTransform(scrollYProgress, [0, 1], [150, -150])
  const translateYDown = useTransform(scrollYProgress, [0, 1], [-150, 150])

  return (
    <section className="bg-[linear-gradient(to_bottom,#000,#200d42_34%,#4f21a1)] py-24">
      <div className="container">
        <section className="flex justify-center items-center flex-col">
          <h2 className="text-3xl md:text-[54px] font-bold tracking-tighter leading-none bg-clip-text mt-6">
            What our users say
          </h2>
          <p className="text-xl text-white/50 tracking-tight mt-6 max-w-lg text-center">
            Learn from those who have experienced our AI-powered Interview
            Assistant.
          </p>
        </section>
        <section
          ref={testimonialRef}
          className="my-10 max-h-[748px] overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_15%,black_90%,transparent)]"
        >
          <ul className="columns-1 md:columns-2 lg:columns-3 space-y-7 overflow-hidden">
            {testimonialsList1.map((element, index) => (
              <motion.li
                key={index}
                className="max-w-sm p-10 rounded-2xl shadow-xl border-black/5 cta-secondary"
                style={{ translateY: translateYUp }}
                transition={{ duration: 0.1 }}
              >
                <article>{element.text}</article>
                <figure className="w-fit flex justify-center gap-x-2.5 mt-7">
                  <Image
                    src={element.imageSrc}
                    alt={element.name}
                    width={50}
                    height={50}
                    className="h-auto"
                  />
                  <figcaption>
                    <p className="font-medium">{element.name}</p>
                    <p>{element.username}</p>
                  </figcaption>
                </figure>
              </motion.li>
            ))}
            {testimonialsList2.map((element, index) => (
              <motion.li
                key={index}
                className="hidden lg:block max-w-sm p-10 rounded-2xl shadow-xl border-black/5 cta-secondary"
                style={{ translateY: translateYDown }}
                transition={{ duration: 0.1 }}
              >
                <article>{element.text}</article>
                <figure className="w-fit flex justify-center gap-x-2.5 mt-7">
                  <Image
                    src={element.imageSrc}
                    alt={element.name}
                    width={50}
                    height={50}
                    className="h-auto"
                  />
                  <figcaption>
                    <p className="font-medium">{element.name}</p>
                    <p>{element.username}</p>
                  </figcaption>
                </figure>
              </motion.li>
            ))}
            {testimonialsList3.map((element, index) => (
              <motion.li
                key={index}
                className="max-w-sm p-10 rounded-2xl shadow-xl border-black/5 cta-secondary"
                style={{ translateY: translateYUp }}
                transition={{ duration: 0.1 }}
              >
                <article>{element.text}</article>
                <figure className="w-fit flex justify-center gap-x-2.5 mt-7">
                  <Image
                    src={element.imageSrc}
                    alt={element.name}
                    width={50}
                    height={50}
                    className="h-auto"
                  />
                  <figcaption>
                    <p className="font-medium">{element.name}</p>
                    <p>{element.username}</p>
                  </figcaption>
                </figure>
              </motion.li>
            ))}
          </ul>
        </section>
      </div>
    </section>
  )
}
