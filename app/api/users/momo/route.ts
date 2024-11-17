import { getServerSession } from "next-auth/next"
import { v4 as uuidv4 } from "uuid"

import { authOptions } from "@/lib/auth"
import { createMomoSignature, momoConfig } from "@/lib/momo"

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || !session?.user.email) {
      return new Response(null, { status: 403 })
    }

    const orderId = uuidv4()
    const requestId = uuidv4()
    const amount = 199000 // 199,000 VND

    const rawSignature = `accessKey=${momoConfig.accessKey}&amount=${amount}&extraData=&ipnUrl=${momoConfig.ipnUrl}&orderId=${orderId}&orderInfo=Upgrade to PRO Plan&partnerCode=${momoConfig.partnerCode}&redirectUrl=${momoConfig.redirectUrl}&requestId=${requestId}&requestType=captureWallet`

    const signature = createMomoSignature(rawSignature)

    const requestBody = {
      partnerCode: momoConfig.partnerCode,
      partnerName: "Test",
      storeId: "MomoTestStore",
      requestId: requestId,
      amount: amount,
      orderId: orderId,
      orderInfo: "Upgrade to PRO Plan",
      redirectUrl: momoConfig.redirectUrl,
      ipnUrl: momoConfig.ipnUrl,
      lang: "vi",
      requestType: "captureWallet",
      autoCapture: true,
      extraData: "",
      signature: signature,
    }

    const response = await fetch(momoConfig.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    })

    const responseData = await response.json()

    return new Response(JSON.stringify({ url: responseData.payUrl }))
  } catch (error) {
    return new Response(null, { status: 500 })
  }
}
