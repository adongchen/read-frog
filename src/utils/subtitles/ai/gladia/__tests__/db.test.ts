import { beforeEach, describe, expect, it } from "vitest"
import {
  clearGladiaSubtitlesCache,
  getCachedGladiaSubtitles,
  getGladiaCacheCount,
  setCachedGladiaSubtitles,
} from "../db"

describe("gladia storage cache", () => {
  beforeEach(async () => {
    await clearGladiaSubtitlesCache()
  })

  it("returns undefined for non-existent cache key", async () => {
    const result = await getCachedGladiaSubtitles("non-existent")
    expect(result).toBeUndefined()
  })

  it("stores and retrieves cached subtitles", async () => {
    const fragments = [{ text: "Hello", start: 0, end: 1000 }]
    await setCachedGladiaSubtitles("video-1", fragments, "en")

    const result = await getCachedGladiaSubtitles("video-1")
    expect(result?.videoId).toBe("video-1")
    expect(result?.segments).toEqual(fragments)
    expect(result?.detectedLanguage).toBe("en")
    expect(result?.createdAt).toBeGreaterThan(0)
  })

  it("updates count and clears cache", async () => {
    await setCachedGladiaSubtitles("video-1", [{ text: "1", start: 0, end: 100 }], "en")
    await setCachedGladiaSubtitles("video-2", [{ text: "2", start: 0, end: 200 }], "ja")

    expect(await getGladiaCacheCount()).toBe(2)

    await clearGladiaSubtitlesCache()
    expect(await getGladiaCacheCount()).toBe(0)
    expect(await getCachedGladiaSubtitles("video-1")).toBeUndefined()
  })
})
