import crypto from "crypto"

import { env } from "@/env.mjs"

interface MomoConfig {
  partnerCode: string
  accessKey: string
  secretKey: string
  redirectUrl: string
  ipnUrl: string
  endpoint: string
}

export const momoConfig: MomoConfig = {
  partnerCode: env.MOMO_PARTNER_CODE || "",
  accessKey: env.MOMO_ACCESS_KEY || "",
  secretKey: env.MOMO_SECRET_KEY || "",
  redirectUrl: `${env.NEXT_PUBLIC_APP_URL}/api/subscriptions/momo/redirect`,
  ipnUrl: `${env.NEXT_PUBLIC_APP_URL}/api/webhooks/momo`,
  endpoint: "https://test-payment.momo.vn/v2/gateway/api/create",
}

export function createMomoSignature(rawSignature: string): string {
  return crypto
    .createHmac("sha256", momoConfig.secretKey)
    .update(rawSignature)
    .digest("hex")
}
