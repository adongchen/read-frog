import { browser } from "#imports"
import { mergeWithArrayOverwrite } from "@/utils/atoms/config"
import { getLocalConfig, setLocalConfig } from "@/utils/config/storage"
import {
  buildFeatureProviderPatch,
  FEATURE_PROVIDER_DEFS,
} from "@/utils/constants/feature-providers"
import { logger } from "@/utils/logger"
import { sendMessage } from "@/utils/message"
import {
  findProviderCycleDestination,
  getPopupProviderCycleOptions,
} from "@/utils/providers/provider-cycle"
import { getProviderCycleCommand } from "@/utils/providers/provider-cycle-commands"
import { getHostedAiStatus } from "./hosted-ai-status"

async function getActiveTabId(): Promise<number | undefined> {
  const [activeTab] = await browser.tabs.query({ active: true, currentWindow: true })
  return activeTab?.id
}

async function cycleProvider(command: string, commandTabId: number | undefined): Promise<void> {
  const definition = getProviderCycleCommand(command)
  if (!definition) return

  const config = await getLocalConfig()
  if (!config) return

  const hostedAiStatus = (await getHostedAiStatus()) ?? undefined
  const providers = getPopupProviderCycleOptions(config, definition.feature, hostedAiStatus)
  const currentProviderId = FEATURE_PROVIDER_DEFS[definition.feature].getProviderId(config)
  const destination = findProviderCycleDestination(
    providers,
    currentProviderId,
    definition.direction,
  )
  if (!destination) return

  const patch = buildFeatureProviderPatch({ [definition.feature]: destination.id })
  await setLocalConfig(mergeWithArrayOverwrite(config, patch))

  const tabId = commandTabId ?? (await getActiveTabId())
  if (typeof tabId !== "number") return

  await sendMessage(
    "showProviderCycleToast",
    { feature: definition.feature, providerName: destination.name },
    tabId,
  ).catch(() => {})
}

export function setupProviderCycleShortcuts(): void {
  let queue: Promise<void> = Promise.resolve()

  browser.commands.onCommand.addListener((command, tab) => {
    if (!getProviderCycleCommand(command)) return

    queue = queue
      .then(() => cycleProvider(command, tab?.id))
      .catch((error) => logger.error("[ProviderCycle] Failed to switch provider", error))
  })
}
