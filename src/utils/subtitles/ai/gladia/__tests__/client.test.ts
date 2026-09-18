import { beforeEach, describe, expect, it, vi } from "vitest"
import {
  normalizeEndpoint,
  parseGladiaSentences,
  parseGladiaUtterances,
  parseGladiaWordsToFragments,
  pollGladiaJob,
  pollTimeoutMs,
  submitGladiaJob,
  testGladiaConnection,
} from "../client"

const mockBackgroundFetch = vi.fn<(...args: unknown[]) => Promise<Response>>()

vi.mock("@/utils/content-script/background-fetch-client", () => ({
  backgroundFetch: (...args: unknown[]) => mockBackgroundFetch(...args),
}))

describe("gladia client", () => {
  beforeEach(() => {
    mockBackgroundFetch.mockReset()
  })

  describe("normalizeEndpoint", () => {
    it("strips trailing slash", () => {
      expect(normalizeEndpoint("https://api.gladia.io/")).toBe("https://api.gladia.io")
    })

    it("defaults to https://api.gladia.io when empty", () => {
      expect(normalizeEndpoint("")).toBe("https://api.gladia.io")
    })
  })

  describe("pollTimeoutMs", () => {
    it("scales with durationSec bounded by min and max", () => {
      expect(pollTimeoutMs(0)).toBe(5 * 60 * 1000)
      expect(pollTimeoutMs(600)).toBe(5 * 60 * 1000 + 600 * 100)
      expect(pollTimeoutMs(100_000)).toBe(20 * 60 * 1000)
    })
  })

  describe("parseGladiaSentences", () => {
    it("maps sentences to SubtitlesFragment with milliseconds", () => {
      const sentences = [
        { sentence: " Hello world. ", start: 1.25, end: 3.5 },
        { sentence: "Second sentence.", start: 3.8, end: 5.0 },
      ]
      const result = parseGladiaSentences(sentences)
      expect(result).toEqual([
        { text: "Hello world.", start: 1250, end: 3500 },
        { text: "Second sentence.", start: 3800, end: 5000 },
      ])
    })

    it("handles empty or undefined sentences", () => {
      expect(parseGladiaSentences(undefined)).toEqual([])
      expect(parseGladiaSentences([])).toEqual([])
    })
  })

  describe("parseGladiaUtterances", () => {
    it("maps utterances to SubtitlesFragment with milliseconds", () => {
      const utterances = [
        { text: " Hello world. ", start: 1.25, end: 3.5 },
        { text: "Second utterance.", start: 3.8, end: 5.0 },
      ]
      const result = parseGladiaUtterances(utterances)
      expect(result).toEqual([
        { text: "Hello world.", start: 1250, end: 3500 },
        { text: "Second utterance.", start: 3800, end: 5000 },
      ])
    })

    it("handles empty or undefined utterances", () => {
      expect(parseGladiaUtterances(undefined)).toEqual([])
      expect(parseGladiaUtterances([])).toEqual([])
    })
  })

  describe("parseGladiaWordsToFragments", () => {
    it("converts word-level timestamps to SubtitlesFragment per word", () => {
      const utterances = [
        {
          text: "Hello world.",
          start: 1.0,
          end: 2.5,
          words: [
            { word: "Hello", start: 1.0, end: 1.6 },
            { word: " world.", start: 1.7, end: 2.5 },
          ],
        },
      ]
      const result = parseGladiaWordsToFragments(utterances)
      expect(result).toEqual([
        {
          text: "Hello",
          start: 1000,
          end: 1600,
          words: [{ text: "Hello", start: 1000, end: 1600 }],
        },
        {
          text: "world.",
          start: 1700,
          end: 2500,
          words: [{ text: "world.", start: 1700, end: 2500 }],
        },
      ])
    })

    it("falls back to item fragment when words array is absent", () => {
      const utterances = [{ text: "Fallback sentence.", start: 1.0, end: 3.0 }]
      const result = parseGladiaWordsToFragments(utterances)
      expect(result).toEqual([{ text: "Fallback sentence.", start: 1000, end: 3000 }])
    })

    it("handles empty or undefined inputs", () => {
      expect(parseGladiaWordsToFragments(undefined)).toEqual([])
      expect(parseGladiaWordsToFragments([])).toEqual([])
    })
  })

  describe("testGladiaConnection", () => {
    it("returns false if apiKey is empty", async () => {
      const result = await testGladiaConnection({
        apiKey: "",
        endpoint: "https://api.gladia.io",
        enabled: true,
      })
      expect(result.success).toBe(false)
    })

    it("returns true when API returns 400 validation error (auth succeeded)", async () => {
      mockBackgroundFetch.mockResolvedValueOnce(new Response("Bad Request", { status: 400 }))
      const result = await testGladiaConnection({
        apiKey: "valid-key",
        endpoint: "https://api.gladia.io",
        enabled: true,
      })
      expect(result.success).toBe(true)
    })

    it("returns false when API returns 401 Unauthorized", async () => {
      mockBackgroundFetch.mockResolvedValueOnce(new Response("Unauthorized", { status: 401 }))
      const result = await testGladiaConnection({
        apiKey: "invalid-key",
        endpoint: "https://api.gladia.io",
        enabled: true,
      })
      expect(result.success).toBe(false)
    })
  })

  describe("submitGladiaJob", () => {
    it("submits video url and returns job id and result_url", async () => {
      mockBackgroundFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            id: "job-123",
            result_url: "https://api.gladia.io/v2/pre-recorded/job-123",
          }),
          { status: 201, headers: { "Content-Type": "application/json" } },
        ),
      )

      const result = await submitGladiaJob("https://www.youtube.com/watch?v=abc", {
        apiKey: "key",
        endpoint: "https://api.gladia.io",
        enabled: true,
      })

      expect(result.id).toBe("job-123")
      expect(result.result_url).toBe("https://api.gladia.io/v2/pre-recorded/job-123")
      expect(mockBackgroundFetch).toHaveBeenCalledWith(
        "https://api.gladia.io/v2/pre-recorded",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "x-gladia-key": "key" }),
        }),
      )
    })

    it("throws ToastSubtitlesError on 401", async () => {
      mockBackgroundFetch.mockResolvedValueOnce(new Response("Unauthorized", { status: 401 }))

      await expect(
        submitGladiaJob("https://www.youtube.com/watch?v=abc", {
          apiKey: "bad-key",
          endpoint: "https://api.gladia.io",
          enabled: true,
        }),
      ).rejects.toThrow(/无效|invalid/i)
    })
  })

  describe("pollGladiaJob", () => {
    it("polls until status is done and returns job data", async () => {
      mockBackgroundFetch
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ id: "job-123", status: "processing" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        )
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: "job-123",
              status: "done",
              result: {
                transcription: {
                  languages: ["en"],
                  sentences: [{ sentence: "Test sentence", start: 0, end: 1.5 }],
                },
              },
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
        )

      const result = await pollGladiaJob(
        "job-123",
        10,
        { apiKey: "key", endpoint: "https://api.gladia.io", enabled: true },
        undefined,
        1,
      )

      expect(result.status).toBe("done")
      expect(result.result?.transcription?.sentences).toHaveLength(1)
    })

    it("throws when abort signal triggers", async () => {
      const controller = new AbortController()
      controller.abort()

      await expect(
        pollGladiaJob(
          "job-123",
          10,
          { apiKey: "key", endpoint: "https://api.gladia.io", enabled: true },
          controller.signal,
        ),
      ).rejects.toThrow("Aborted")
    })
  })
})
