import { NextResponse } from "next/server"

import { env } from "@/env.mjs"

export async function GET() {
  return NextResponse.json({ key: env.DEEPGRAM_API_KEY })
}
