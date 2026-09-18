import { beforeEach, describe, expect, it, vi } from "vitest"
import * as clientModule from "../client"
import { resetGladiaConfigForTest } from "../config"
import * as dbModule from "../db"
import { requestGladiaSubtitles } from "../transcriber"

vi.mock("../db", () => ({
  getCachedGladiaSubtitles: vi.fn<() => Promise<unknown>>(),
  setCachedGladiaSubtitles: vi.fn<() => Promise<void>>(),
}))

vi.mock("../client", () => ({
  submitGladiaJob: vi.fn<() => Promise<unknown>>(),
  pollGladiaJob: vi.fn<() => Promise<unknown>>(),
  parseGladiaWordsToFragments: vi.fn<() => unknown[]>(),
  parseGladiaSentences: vi.fn<() => unknown[]>(),
  parseGladiaUtterances: vi.fn<() => unknown[]>(),
}))

describe("gladia transcriber", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetGladiaConfigForTest({
      apiKey: "test-api-key",
      endpoint: "https://api.gladia.io",
      enabled: true,
    })
  })

  it("throws when Gladia is not configured", async () => {
    resetGladiaConfigForTest({
      apiKey: "",
      endpoint: "https://api.gladia.io",
      enabled: true,
    })

    await expect(
      requestGladiaSubtitles({
        videoId: "v1",
        url: "https://youtube.com/watch?v=v1",
        durationSec: 100,
      }),
    ).rejects.toThrow(/无效|invalid/i)
  })

  it("returns cached subtitles on cache hit without calling API", async () => {
    const cached = {
      videoId: "v1",
      segments: [{ text: "Cached subtitle", start: 0, end: 1000 }],
      detectedLanguage: "ja",
      createdAt: Date.now(),
    }
    vi.mocked(dbModule.getCachedGladiaSubtitles).mockResolvedValueOnce(cached)

    const result = await requestGladiaSubtitles({
      videoId: "v1",
      url: "https://youtube.com/watch?v=v1",
      durationSec: 100,
    })

    expect(result.segments).toEqual(cached.segments)
    expect(result.detectedLanguage).toBe("ja")
    expect(clientModule.submitGladiaJob).not.toHaveBeenCalled()
  })

  it("submits job, polls, extracts word-level fragments, and caches on cache miss", async () => {
    vi.mocked(dbModule.getCachedGladiaSubtitles).mockResolvedValueOnce(undefined)

    vi.mocked(clientModule.submitGladiaJob).mockResolvedValueOnce({
      id: "job-99",
      result_url: "https://api.gladia.io/v2/pre-recorded/job-99",
    })

    vi.mocked(clientModule.pollGladiaJob).mockResolvedValueOnce({
      id: "job-99",
      status: "done",
      result: {
        transcription: {
          languages: ["en"],
          sentences: [{ sentence: "Hello from Gladia long sentence", start: 0, end: 4 }],
          utterances: [
            { text: "Hello from Gladia", start: 0, end: 2 },
            { text: "short utterance", start: 2.1, end: 4 },
          ],
        },
      },
    })

    const parsedWordFragments = [
      {
        text: "This is the first complete sentence and it has more than eleven words in total.",
        start: 0,
        end: 2000,
      },
      {
        text: "This is the second complete sentence and it also has more than eleven words.",
        start: 2500,
        end: 5000,
      },
    ]
    vi.mocked(clientModule.parseGladiaWordsToFragments).mockReturnValueOnce(parsedWordFragments)

    const result = await requestGladiaSubtitles({
      videoId: "v2",
      url: "https://youtube.com/watch?v=v2",
      durationSec: 120,
    })

    expect(clientModule.submitGladiaJob).toHaveBeenCalledWith(
      "https://youtube.com/watch?v=v2",
      expect.objectContaining({ apiKey: "test-api-key" }),
      undefined,
    )
    expect(clientModule.pollGladiaJob).toHaveBeenCalledWith(
      "https://api.gladia.io/v2/pre-recorded/job-99",
      120,
      expect.objectContaining({ apiKey: "test-api-key" }),
      undefined,
    )
    expect(clientModule.parseGladiaWordsToFragments).toHaveBeenCalled()
    expect(dbModule.setCachedGladiaSubtitles).toHaveBeenCalledWith("v2", expect.any(Array), "en")
    expect(result.segments).toHaveLength(2)
    expect(result.detectedLanguage).toBe("en")
  })

  it("splits overly long sentences with exact word-level timestamps", async () => {
    vi.mocked(dbModule.getCachedGladiaSubtitles).mockResolvedValueOnce(undefined)

    vi.mocked(clientModule.submitGladiaJob).mockResolvedValueOnce({
      id: "job-long",
      result_url: "https://api.gladia.io/v2/pre-recorded/job-long",
    })

    vi.mocked(clientModule.pollGladiaJob).mockResolvedValueOnce({
      id: "job-long",
      status: "done",
      result: {
        transcription: {
          languages: ["en"],
          utterances: [
            {
              text: "Components on the canvas are coming soon, but you don't have to wait to bring components from your codebase into Paper and design with them.",
              start: 0.152,
              end: 6.5,
            },
          ],
        },
      },
    })

    const wordList = [
      { text: "Components", start: 152, end: 600 },
      { text: "on", start: 600, end: 750 },
      { text: "the", start: 750, end: 900 },
      { text: "canvas", start: 900, end: 1400 },
      { text: "are", start: 1400, end: 1600 },
      { text: "coming", start: 1600, end: 2000 },
      { text: "soon,", start: 2000, end: 2500 },
      { text: "but", start: 2500, end: 2800 },
      { text: "you", start: 2800, end: 3000 },
      { text: "don't", start: 3000, end: 3200 },
      { text: "have", start: 3200, end: 3400 },
      { text: "to", start: 3400, end: 3500 },
      { text: "wait", start: 3500, end: 3800 },
      { text: "to", start: 3800, end: 3900 },
      { text: "bring", start: 3900, end: 4200 },
      { text: "components", start: 4200, end: 4600 },
      { text: "from", start: 4600, end: 4800 },
      { text: "your", start: 4800, end: 5000 },
      { text: "codebase", start: 5000, end: 5300 },
      { text: "into", start: 5300, end: 5500 },
      { text: "Paper", start: 5500, end: 5700 },
      { text: "and", start: 5700, end: 5800 },
      { text: "design", start: 5800, end: 6100 },
      { text: "with", start: 6100, end: 6200 },
      { text: "them.", start: 6200, end: 6500 },
    ]
    const wordFragments = wordList.map((w) => ({
      text: w.text,
      start: w.start,
      end: w.end,
      words: [{ text: w.text, start: w.start, end: w.end }],
    }))
    vi.mocked(clientModule.parseGladiaWordsToFragments).mockReturnValueOnce(wordFragments)

    const result = await requestGladiaSubtitles({
      videoId: "v-long",
      url: "https://youtube.com/watch?v=v-long",
      durationSec: 10,
    })

    // 25-word sentence (> 20 max words) should be split into 2 shorter fragments at the comma
    expect(result.segments.length).toBe(2)
    expect(result.segments[0]!.text).toBe("Components on the canvas are coming soon,")
    expect(result.segments[0]!.start).toBe(152)
    expect(result.segments[0]!.end).toBe(2500)
    expect(result.segments[0]!.words).toBeDefined()

    expect(result.segments[1]!.text).toBe(
      "but you don't have to wait to bring components from your codebase into Paper and design with them.",
    )
    expect(result.segments[1]!.start).toBe(2500)
    expect(result.segments[1]!.end).toBe(6500)
    expect(result.segments[1]!.words).toBeDefined()
  })
})
