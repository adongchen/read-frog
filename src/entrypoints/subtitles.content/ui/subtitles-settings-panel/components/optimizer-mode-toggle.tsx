import { IconSparkles } from "@tabler/icons-react"
import { useState } from "react"
import { Switch } from "@/components/ui/base-ui/switch"
import { toastManager } from "@/components/ui/base-ui/toast"
import {
  getCustomOptimizerMode,
  getOptimizerModeLabel,
  getOptimizerModeToast,
  type OptimizerMode,
  setCustomOptimizerMode,
} from "@/utils/subtitles/processor/optimizer"
import { useSubtitlesUI } from "../../subtitles-ui-context"
import { SubtitlesSettingsItem } from "./subtitles-settings-item"

export function OptimizerModeToggle() {
  const [mode, setMode] = useState<OptimizerMode>(() => getCustomOptimizerMode())
  const { resegmentCurrentSubtitles } = useSubtitlesUI()
  const switchId = "read-frog-optimizer-mode-toggle"

  const handleCheckedChange = async (checked: boolean) => {
    const nextMode: OptimizerMode = checked ? "enhanced" : "original"
    setMode(nextMode)
    await setCustomOptimizerMode(nextMode)

    toastManager.add({
      type: "info",
      title: getOptimizerModeToast(nextMode),
    })

    void resegmentCurrentSubtitles()
  }

  const label = getOptimizerModeLabel("enhanced")

  return (
    <SubtitlesSettingsItem
      icon={<IconSparkles className="size-4" />}
      label={label}
      labelFor={switchId}
    >
      <Switch
        id={switchId}
        checked={mode === "enhanced"}
        onCheckedChange={handleCheckedChange}
        aria-label={label}
      />
    </SubtitlesSettingsItem>
  )
}
