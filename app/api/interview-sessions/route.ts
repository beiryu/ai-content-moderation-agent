import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"

import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse("Unauthorized", { status: 403 })
    }

    const { interviewId } = await req.json()

    // Create new session
    const interviewSession = await db.interviewSession.create({
      data: {
        completionRate: 0,
        performanceScore: 0,
        feedbackSummary: "",
        duration: 0,
        status: "active",
        interviewId,
      },
    })

    return NextResponse.json(interviewSession)
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse("Unauthorized", { status: 403 })
    }

    const { sessionId, data } = await req.json()

    const updatedSession = await db.interviewSession.update({
      where: { id: sessionId },
      data,
    })

    return NextResponse.json(updatedSession)
  } catch (error) {
    return new NextResponse("Internal Error", { status: 500 })
  }
}
