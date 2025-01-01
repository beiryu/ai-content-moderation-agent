"use client"

import { ReactNode } from "react"
import { ReactLenis } from "@studio-freight/react-lenis"

type Props = {
  children?: ReactNode
}

function SmoothScrolling({ children }: Props) {
  return (
    <ReactLenis root options={{ lerp: 0.1, duration: 2 }}>
      {children}
    </ReactLenis>
  )
}

export default SmoothScrolling
