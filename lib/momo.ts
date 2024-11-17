import crypto from "crypto"

interface MomoConfig {
  partnerCode: string
  accessKey: string
  secretKey: string
  redirectUrl: string
  ipnUrl: string
  endpoint: string
}

export const momoConfig: MomoConfig = {
  partnerCode: process.env.MOMO_PARTNER_CODE || "",
  accessKey: process.env.MOMO_ACCESS_KEY || "",
  secretKey: process.env.MOMO_SECRET_KEY || "",
  redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/subscriptions/momo/redirect`,
  ipnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/momo`,
  endpoint: "https://test-payment.momo.vn/v2/gateway/api/create",
}

export function createMomoSignature(rawSignature: string): string {
  return crypto
    .createHmac("sha256", momoConfig.secretKey)
    .update(rawSignature)
    .digest("hex")
}
