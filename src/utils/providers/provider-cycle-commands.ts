import type { ProviderCycleDirection, ProviderCycleFeature } from "@/utils/providers/provider-cycle"

interface ProviderCycleCommandDefinition {
  description: string
  direction: ProviderCycleDirection
  feature: ProviderCycleFeature
}

export const PROVIDER_CYCLE_COMMANDS = {
  "previous-page-translation-provider": {
    description: "Select the previous page translation provider",
    direction: "previous",
    feature: "pageTranslation",
  },
  "next-page-translation-provider": {
    description: "Select the next page translation provider",
    direction: "next",
    feature: "pageTranslation",
  },
  "previous-video-subtitles-provider": {
    description: "Select the previous video subtitles provider",
    direction: "previous",
    feature: "videoSubtitles",
  },
  "next-video-subtitles-provider": {
    description: "Select the next video subtitles provider",
    direction: "next",
    feature: "videoSubtitles",
  },
} as const satisfies Record<string, ProviderCycleCommandDefinition>

export type ProviderCycleCommand = keyof typeof PROVIDER_CYCLE_COMMANDS

export function getProviderCycleCommand(command: string): ProviderCycleCommandDefinition | null {
  return command in PROVIDER_CYCLE_COMMANDS
    ? PROVIDER_CYCLE_COMMANDS[command as ProviderCycleCommand]
    : null
}
