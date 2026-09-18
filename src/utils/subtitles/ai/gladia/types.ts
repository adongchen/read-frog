import type { SubtitlesFragment } from "@/utils/subtitles/types"

export interface GladiaConfig {
  apiKey: string
  endpoint: string
  enabled: boolean
}

export interface GladiaPreRecordedRequest {
  audio_url: string
  sentences?: boolean
  subtitles?: boolean
  subtitles_config?: {
    formats: ("srt" | "vtt")[]
  }
}

export interface GladiaJobCreatedResponse {
  id: string
  result_url: string
}

export interface GladiaWord {
  word: string
  start: number
  end: number
  confidence?: number
}

export interface GladiaSentence {
  sentence: string
  start: number
  end: number
  confidence?: number
  speaker?: number
  language?: string
  words?: GladiaWord[]
}

export interface GladiaUtterance {
  text: string
  start: number
  end: number
  confidence?: number
  channel?: number
  speaker?: number
  language?: string
  words?: GladiaWord[]
}

export interface GladiaJobPollResponse {
  id: string
  status: "queued" | "processing" | "done" | "error"
  error?: string | null
  result?: {
    metadata?: {
      audio_duration?: number
      billing_duration?: number
    }
    transcription?: {
      languages?: string[]
      sentences?: GladiaSentence[]
      utterances?: GladiaUtterance[]
      subtitles?: Array<{ format: string; subtitles: string }>
    }
  } | null
}

export interface GladiaCachedSubtitles {
  videoId: string
  segments: SubtitlesFragment[]
  detectedLanguage: string
  createdAt: number
}
