import type {
  GladiaConfig,
  GladiaJobCreatedResponse,
  GladiaJobPollResponse,
  GladiaPreRecordedRequest,
  GladiaSentence,
  GladiaUtterance,
} from "./types"
import type { SubtitlesFragment } from "@/utils/subtitles/types"
import { backgroundFetch } from "@/utils/content-script/background-fetch-client"
import { OverlaySubtitlesError, ToastSubtitlesError } from "@/utils/subtitles/errors"
import { getGladiaI18n } from "./config"

const POLL_INTERVAL_MS = 2_500
const POLL_BASE_TIMEOUT_MS = 5 * 60 * 1_000
const POLL_MAX_TIMEOUT_MS = 20 * 60 * 1_000

export function normalizeEndpoint(endpoint: string): string {
  const trimmed = endpoint.trim()
  return trimmed.endsWith("/") ? trimmed.slice(0, -1) : trimmed || "https://api.gladia.io"
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError")
  }
}

export function pollTimeoutMs(durationSec: number): number {
  return Math.min(POLL_MAX_TIMEOUT_MS, POLL_BASE_TIMEOUT_MS + durationSec * 100)
}

export function parseGladiaUtterances(utterances?: GladiaUtterance[]): SubtitlesFragment[] {
  if (!utterances || utterances.length === 0) {
    return []
  }
  return utterances.map((item) => ({
    text: item.text.trim(),
    start: Math.round(item.start * 1000),
    end: Math.round(item.end * 1000),
    ...(item.words && item.words.length > 0
      ? {
          words: item.words.map((w) => ({
            text: w.word.trim(),
            start: Math.round(w.start * 1000),
            end: Math.round(w.end * 1000),
          })),
        }
      : {}),
  }))
}

export function parseGladiaSentences(sentences?: GladiaSentence[]): SubtitlesFragment[] {
  if (!sentences || sentences.length === 0) {
    return []
  }
  return sentences.map((item) => ({
    text: item.sentence.trim(),
    start: Math.round(item.start * 1000),
    end: Math.round(item.end * 1000),
    ...(item.words && item.words.length > 0
      ? {
          words: item.words.map((w) => ({
            text: w.word.trim(),
            start: Math.round(w.start * 1000),
            end: Math.round(w.end * 1000),
          })),
        }
      : {}),
  }))
}

export function parseGladiaWordsToFragments(
  utterances?: GladiaUtterance[],
  sentences?: GladiaSentence[],
): SubtitlesFragment[] {
  const items = utterances && utterances.length > 0 ? utterances : sentences
  if (!items || items.length === 0) {
    return []
  }

  const fragments: SubtitlesFragment[] = []

  for (const item of items) {
    if (item.words && item.words.length > 0) {
      for (const w of item.words) {
        const text = w.word.trim()
        if (!text) continue
        const start = Math.round(w.start * 1000)
        const end = Math.round(w.end * 1000)
        const validEnd = end > start ? end : start + 100
        fragments.push({
          text,
          start,
          end: validEnd,
          words: [{ text, start, end: validEnd }],
        })
      }
    } else {
      // Fallback if an item has no words array
      const text = ("sentence" in item ? item.sentence : item.text).trim()
      if (text) {
        const start = Math.round(item.start * 1000)
        const end = Math.round(item.end * 1000)
        const validEnd = end > start ? end : start + 100
        fragments.push({
          text,
          start,
          end: validEnd,
        })
      }
    }
  }

  return fragments
}

export async function testGladiaConnection(
  config: GladiaConfig,
): Promise<{ success: boolean; message: string }> {
  const endpoint = normalizeEndpoint(config.endpoint)
  const apiKey = config.apiKey.trim()
  const i18n = getGladiaI18n()

  if (!apiKey) {
    return { success: false, message: i18n.invalidKeyToast }
  }

  try {
    const response = await backgroundFetch(`${endpoint}/v2/pre-recorded`, {
      method: "POST",
      headers: {
        "x-gladia-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    })

    if (response.status === 401 || response.status === 403) {
      return { success: false, message: i18n.invalidKeyToast }
    }

    // 400 Bad Request indicates auth passed but parameters (e.g. missing audio_url) were missing.
    // 200/201/400 all confirm successful authentication.
    if (response.status === 400 || response.ok) {
      return { success: true, message: i18n.testSuccess }
    }

    return {
      success: false,
      message: `${i18n.testFailed} (HTTP ${response.status}: ${response.statusText})`,
    }
  } catch (error) {
    return {
      success: false,
      message: `${i18n.testFailed}: ${error instanceof Error ? error.message : String(error)}`,
    }
  }
}

export async function submitGladiaJob(
  videoUrl: string,
  config: GladiaConfig,
  signal?: AbortSignal,
): Promise<GladiaJobCreatedResponse> {
  const endpoint = normalizeEndpoint(config.endpoint)
  const apiKey = config.apiKey.trim()
  const i18n = getGladiaI18n()

  throwIfAborted(signal)

  const payload: GladiaPreRecordedRequest = {
    audio_url: videoUrl,
  }

  let response: Response
  try {
    response = await backgroundFetch(`${endpoint}/v2/pre-recorded`, {
      method: "POST",
      headers: {
        "x-gladia-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })
  } catch (error) {
    throw new OverlaySubtitlesError(
      `${i18n.serviceUnavailable} (${error instanceof Error ? error.message : String(error)})`,
    )
  }

  if (response.status === 401 || response.status === 403) {
    throw new ToastSubtitlesError(i18n.invalidKeyToast)
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => "")
    throw new OverlaySubtitlesError(
      `${i18n.serviceUnavailable} (HTTP ${response.status} ${errorText})`,
    )
  }

  const data = (await response.json()) as GladiaJobCreatedResponse
  if (!data?.id) {
    throw new OverlaySubtitlesError(i18n.serviceUnavailable)
  }

  return data
}

export async function pollGladiaJob(
  resultUrlOrId: string,
  durationSec: number,
  config: GladiaConfig,
  signal?: AbortSignal,
  pollIntervalMs: number = POLL_INTERVAL_MS,
): Promise<GladiaJobPollResponse> {
  const endpoint = normalizeEndpoint(config.endpoint)
  const apiKey = config.apiKey.trim()
  const i18n = getGladiaI18n()

  const pollUrl = resultUrlOrId.startsWith("http")
    ? resultUrlOrId
    : `${endpoint}/v2/pre-recorded/${resultUrlOrId}`

  const startedAt = Date.now()
  const deadline = startedAt + pollTimeoutMs(durationSec)

  while (Date.now() < deadline) {
    throwIfAborted(signal)
    await sleep(pollIntervalMs)
    throwIfAborted(signal)

    let response: Response
    try {
      response = await backgroundFetch(pollUrl, {
        method: "GET",
        headers: {
          "x-gladia-key": apiKey,
        },
      })
    } catch {
      // Network jitter: retry next round if deadline not exceeded
      continue
    }

    if (response.status === 401 || response.status === 403) {
      throw new ToastSubtitlesError(i18n.invalidKeyToast)
    }

    if (!response.ok) {
      continue
    }

    const job = (await response.json()) as GladiaJobPollResponse
    if (job.status === "done") {
      return job
    }

    if (job.status === "error") {
      throw new OverlaySubtitlesError(
        job.error ? `${i18n.serviceUnavailable}: ${job.error}` : i18n.serviceUnavailable,
      )
    }
  }

  throw new ToastSubtitlesError(i18n.processingToast)
}
