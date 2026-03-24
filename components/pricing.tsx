"use client"

import Check from "@/assets/icons/check.svg"
import { motion } from "framer-motion"

const pricingTiers = [
  {
    title: "Free",
    monthlyPrice: 0,
    buttonText: "Get started for free",
    popular: false,
    inverse: false,
    // TODO: Check this features
    features: [
      "AI-Assisted Job Interviews", // 1
      "AI-Simulated Practice Interviews", // 5
      "AI Cover Letter Generation", // 2
      "AI-Generated Practice Q&A", // 4 per job listing
    ],
  },
  {
    title: "Pro",
    monthlyPrice: 9,
    buttonText: "Sign up now",
    popular: true,
    inverse: true,
    features: [
      "AI-Assisted Job Interviews", // unlimited
      "AI-Simulated Practice Interviews", // unlimited
      "AI Cover Letter Generation", // unlimited
      "AI-Generated Practice Q&A", // unlimited
      "24/7 Customer Service", // unlimited
      "AI Resume Review", // unlimited
      "AI Resume Review", // unlimited
    ],
  },
  {
    title: "Business",
    monthlyPrice: 19,
    buttonText: "Sign up now",
    popular: false,
    inverse: false,
    features: [
      "Up to 5 project members",
      "Unlimited tasks and projects",
      "200GB storage",
      "Integrations",
      "Dedicated account manager",
      "Custom fields",
      "Advanced analytics",
      "Export capabilities",
      "API access",
      "Advanced security features",
    ],
  },
]

export function Pricing() {
  return (
    <section className="py-24">
      <div className="container max-w-6xl">
        <article className="max-w-[540px] text-center mx-auto">
          <h2 className="text-3xl md:text-[54px] leading-none py-1 font-bold tracking-tighter bg-clip-text">
            Pricing
          </h2>
          <p className="text-[22px] leading-[30px] text-white/50 tracking-tight mt-5">
            Free forever. Upgrade for unlimited tasks, better security, and
            exclusive features.
          </p>
        </article>
        <section className="flex flex-col lg:flex-row justify-between items-center lg:items-end gap-y-6 mt-10">
          {pricingTiers.map(
            (
              { title, monthlyPrice, buttonText, inverse, popular, features },
              index
            ) => (
              <div
                key={index}
                className={`flex flex-col w-80 ${
                  inverse ? "cta-primary" : "cta-secondary"
                } ${
                  index === 0
                    ? "h-[476px]"
                    : index === 1
                    ? "h-[568px]"
                    : "h-[696px]"
                } p-10 rounded-3xl`}
              >
                <div className="flex justify-between">
                  <h3
                    className={`${
                      inverse ? "text-black/50" : "text-white/50"
                    } font-bold text-lg mb-7`}
                  >
                    {title}
                  </h3>
                  {popular && (
                    <p className="text-sm inline-flex h-fit border-2 border-primary/20 rounded-full py-1.5 px-4 tracking-tight">
                      <motion.span
                        className="bg-[linear-gradient(to_right,#dd7ddf,#e1cd86,#bbcb92,#71c2ef,#3bffff,#dd7ddf,#e1cd86,#bbcb92,#71c2ef,#3bffff)] [background-size:200%] text-transparent bg-clip-text font-bold"
                        animate={{ backgroundPositionX: "-100%" }}
                        transition={{
                          repeat: Infinity,
                          duration: 2.5,
                          ease: "linear",
                          repeatType: "loop",
                        }}
                      >
                        Most popular
                      </motion.span>
                    </p>
                  )}
                </div>
                <p className="text-4xl tracking-tighter font-bold mb-7">
                  ${monthlyPrice}{" "}
                  <span
                    className={`tracking-tight text-base ${
                      inverse ? "text-black/50" : "text-white/50"
                    }`}
                  >
                    /month
                  </span>
                </p>
                <button
                  className={`ctaBaseStyling w-full mb-8 text-black ${
                    inverse ? "bg-primary text-white" : "bg-white"
                  }`}
                >
                  {buttonText}
                </button>
                <ul className="h-full flex flex-col justify-between items-start">
                  {features.map((feature, index) => (
                    <li
                      key={index}
                      className={`flex justify-start items-center gap-x-1 text-sm ${
                        inverse ? "text-black/50" : "text-white/50"
                      }`}
                    >
                      <Check className="size-4" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )
          )}
        </section>
      </div>
    </section>
  )
}
