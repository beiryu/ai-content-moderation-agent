import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { env } from "@/env.mjs"
import { authOptions } from "@/lib/auth"

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 })
  }

  const baseURL = env.OPENAI_BASE_URL || "https://api.openai.com/v1"

  const response = await fetch(`${baseURL}/realtime/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-realtime-preview",
      voice: "alloy",
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    console.error("Failed to create transcription session:", error)
    return new Response("Failed to create session", { status: 502 })
  }

  const data = await response.json()
  return NextResponse.json({ client_secret: data.client_secret.value })
}
