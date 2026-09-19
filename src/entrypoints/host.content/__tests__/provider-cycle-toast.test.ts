import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  addToast: vi.fn<(toast: { type: string; title: string }) => void>(),
  handler: undefined as
    | ((message: {
        data: {
          feature: "pageTranslation" | "videoSubtitles"
          providerName: string
        }
      }) => void)
    | undefined,
}))

vi.mock("@/components/ui/base-ui/toast", () => ({
  toastManager: { add: mocks.addToast },
}))

vi.mock("@/utils/i18n", () => ({
  i18n: {
    t: (key: string) => (key.endsWith("pageTranslation") ? "网页翻译" : "视频字幕"),
  },
}))

vi.mock("@/utils/message", () => ({
  onMessage: (_name: string, handler: NonNullable<typeof mocks.handler>) => {
    mocks.handler = handler
    return vi.fn<() => void>()
  },
}))

import { registerProviderCycleToast } from "../provider-cycle-toast"

describe("registerProviderCycleToast", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.handler = undefined
  })

  it.each([
    ["pageTranslation", "网页翻译：OpenAI GPT-5"],
    ["videoSubtitles", "视频字幕：DeepL"],
  ] as const)("shows the selected %s provider", (feature, title) => {
    registerProviderCycleToast()

    mocks.handler?.({
      data: { feature, providerName: feature === "pageTranslation" ? "OpenAI GPT-5" : "DeepL" },
    })

    expect(mocks.addToast).toHaveBeenCalledWith({ type: "success", title })
  })
})
