import { describe, it, expect, afterEach } from "vitest"
import { assertBotAuth } from "@/lib/bot-auth"

function reqWith(secret?: string): Request {
  const headers: Record<string, string> = {}
  if (secret !== undefined) headers["x-bot-secret"] = secret
  return new Request("http://localhost/api/bot/identify", { headers })
}

describe("assertBotAuth (x-bot-secret guard)", () => {
  const OLD = process.env.BOT_API_SECRET
  afterEach(() => {
    if (OLD === undefined) delete process.env.BOT_API_SECRET
    else process.env.BOT_API_SECRET = OLD
  })

  it("returns null when the x-bot-secret header matches BOT_API_SECRET", () => {
    process.env.BOT_API_SECRET = "s3cret-value"
    expect(assertBotAuth(reqWith("s3cret-value"))).toBeNull()
  })

  it("returns 401 when the header is wrong", () => {
    process.env.BOT_API_SECRET = "s3cret-value"
    expect(assertBotAuth(reqWith("wrong"))?.status).toBe(401)
  })

  it("returns 401 when the header is missing", () => {
    process.env.BOT_API_SECRET = "s3cret-value"
    expect(assertBotAuth(reqWith(undefined))?.status).toBe(401)
  })

  it("returns 500 when BOT_API_SECRET is not configured on the server", () => {
    delete process.env.BOT_API_SECRET
    expect(assertBotAuth(reqWith("anything"))?.status).toBe(500)
  })
})
