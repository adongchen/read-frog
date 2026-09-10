export type SubtitlesState = "idle" | "loading" | "error"

export interface StateData {
  state: SubtitlesState
  message?: string
}

export interface SubtitleWord {
  text: string
  start: number
  end?: number
}

export interface SubtitlesFragment {
  text: string
  start: number
  end: number
  translation?: string
  words?: SubtitleWord[]
}
