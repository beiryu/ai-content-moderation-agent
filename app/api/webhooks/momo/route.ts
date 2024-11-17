import { db } from "@/lib/db"
import { createMomoSignature, momoConfig } from "@/lib/momo"

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Verify signature from MoMo
    const rawSignature = `accessKey=${momoConfig.accessKey}&amount=${body.amount}&extraData=${body.extraData}&messageId=${body.messageId}&orderId=${body.orderId}&orderInfo=${body.orderInfo}&orderType=${body.orderType}&partnerCode=${body.partnerCode}&payType=${body.payType}&requestId=${body.requestId}&responseTime=${body.responseTime}&resultCode=${body.resultCode}&transId=${body.transId}`

    const signature = createMomoSignature(rawSignature)

    if (signature !== body.signature) {
      return new Response("Invalid signature", { status: 400 })
    }

    if (body.resultCode === 0) {
      // Payment successful
      await db.user.update({
        where: {
          id: body.extraData, // userId stored in extraData
        },
        data: {
          stripePriceId: process.env.MOMO_MONTHLY_PLAN_ID,
          stripeCurrentPeriodEnd: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
          ),
        },
      })
    }

    return new Response(null, { status: 200 })
  } catch (error) {
    return new Response(null, { status: 500 })
  }
}
