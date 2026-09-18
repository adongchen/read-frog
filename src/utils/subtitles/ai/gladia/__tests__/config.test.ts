import { beforeEach, describe, expect, it } from "vitest"
import {
  DEFAULT_GLADIA_CONFIG,
  getGladiaConfig,
  getGladiaI18n,
  isGladiaConfigured,
  resetGladiaConfigForTest,
  setGladiaConfig,
} from "../config"

describe("gladia config", () => {
  beforeEach(() => {
    resetGladiaConfigForTest()
  })

  it("returns default config when initialized", () => {
    const config = getGladiaConfig()
    expect(config).toEqual(DEFAULT_GLADIA_CONFIG)
    expect(isGladiaConfigured()).toBe(false)
  })

  it("isGladiaConfigured returns true when apiKey is present and enabled", () => {
    resetGladiaConfigForTest({
      apiKey: "test-api-key",
      endpoint: "https://api.gladia.io",
      enabled: true,
    })
    expect(isGladiaConfigured()).toBe(true)
  })

  it("isGladiaConfigured returns false when enabled is false", () => {
    resetGladiaConfigForTest({
      apiKey: "test-api-key",
      endpoint: "https://api.gladia.io",
      enabled: false,
    })
    expect(isGladiaConfigured()).toBe(false)
  })

  it("isGladiaConfigured returns false when apiKey is whitespace", () => {
    resetGladiaConfigForTest({
      apiKey: "   ",
      endpoint: "https://api.gladia.io",
      enabled: true,
    })
    expect(isGladiaConfigured()).toBe(false)
  })

  it("setGladiaConfig updates the current config", async () => {
    await setGladiaConfig({
      apiKey: "new-key",
      endpoint: "https://custom.gladia.io",
      enabled: true,
    })
    expect(getGladiaConfig().apiKey).toBe("new-key")
    expect(getGladiaConfig().endpoint).toBe("https://custom.gladia.io")
    expect(isGladiaConfigured()).toBe(true)
  })

  it("provides localized messages", () => {
    const i18n = getGladiaI18n()
    expect(i18n.title).toBeTruthy()
    expect(i18n.testConnection).toBeTruthy()
    expect(i18n.cachedCount(5)).toContain("5")
  })
})
