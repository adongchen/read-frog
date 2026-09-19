// @vitest-environment jsdom
import type { ControlsConfig } from "@/entrypoints/subtitles.content/platforms"
import { render } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { StaticSubtitleOverlayProvider } from "../custom-subtitles-provider"
import { SubtitlesUIContext, useSubtitlesUI } from "../subtitles-ui-context"

describe("StaticSubtitleOverlayProvider", () => {
  const fakeControls: ControlsConfig = {
    measureHeight: () => 59,
    checkVisibility: () => true,
  }

  const mockContextValue = {
    toggleSubtitles: () => {},
    requestAiSubtitles: async () => {},
    supportsAiSubtitles: false,
    supportsSidebar: false,
    generateVideoSummary: async () => null,
    hasSubtitlesAvailable: async () => false,
    ensureSourceTrackPublished: async () => {},
    seekTo: () => {},
    downloadSourceSubtitles: async () => {},
    downloadTranslatedSubtitles: async () => {},
    resegmentCurrentSubtitles: async () => {},
    controlsConfig: fakeControls,
  }

  function InnerConsumer({ onConfig }: { onConfig: (config?: ControlsConfig) => void }) {
    const { controlsConfig } = useSubtitlesUI()
    onConfig(controlsConfig)
    return null
  }

  it("strips controlsConfig for wrapped subtitle overlay children", () => {
    let innerConfig: ControlsConfig | undefined = fakeControls

    render(
      <SubtitlesUIContext value={mockContextValue}>
        <StaticSubtitleOverlayProvider>
          <InnerConsumer onConfig={(cfg) => (innerConfig = cfg)} />
        </StaticSubtitleOverlayProvider>
      </SubtitlesUIContext>,
    )

    expect(innerConfig).toBeUndefined()
  })

  it("preserves controlsConfig for outer components such as settings panel", () => {
    let outerConfig: ControlsConfig | undefined

    render(
      <SubtitlesUIContext value={mockContextValue}>
        <InnerConsumer onConfig={(cfg) => (outerConfig = cfg)} />
      </SubtitlesUIContext>,
    )

    expect(outerConfig).toBe(fakeControls)
  })
})
