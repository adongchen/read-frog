import type { ReactNode } from "react"
import { use } from "react"
import { SubtitlesUIContext } from "./subtitles-ui-context"

/**
 * Scoped context provider that strips controlsConfig specifically for subtitle overlays.
 * This enforces StaticPositioning for subtitles (no jumping when player controls toggle),
 * while allowing other components (such as SubtitlesSettingsPanel / PanelShell) to retain
 * dynamic ControlsAvoidance so the settings drawer avoids player bottom controls.
 */
export function StaticSubtitleOverlayProvider({ children }: { children: ReactNode }) {
  const ui = use(SubtitlesUIContext)
  if (!ui?.controlsConfig) {
    return <>{children}</>
  }
  return (
    <SubtitlesUIContext value={{ ...ui, controlsConfig: undefined }}>{children}</SubtitlesUIContext>
  )
}
