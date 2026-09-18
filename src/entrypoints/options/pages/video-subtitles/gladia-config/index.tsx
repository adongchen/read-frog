import { IconEye, IconEyeOff, IconLoader2, IconPlugConnected, IconTrash } from "@tabler/icons-react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/base-ui/button"
import { Input } from "@/components/ui/base-ui/input"
import { Switch } from "@/components/ui/base-ui/switch"
import { toastManager } from "@/components/ui/base-ui/toast"
import {
  clearGladiaSubtitlesCache,
  getGladiaCacheCount,
  getGladiaConfig,
  getGladiaI18n,
  setGladiaConfig,
  testGladiaConnection,
} from "@/utils/subtitles/ai/gladia"
import { ConfigItem } from "../../../components/config-item"
import { ConfigSection } from "../../../components/config-section"

export function GladiaConfigSection() {
  const i18n = getGladiaI18n()
  const [config, setConfig] = useState(() => getGladiaConfig())
  const [showApiKey, setShowApiKey] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [isClearingCache, setIsClearingCache] = useState(false)
  const [cachedCount, setCachedCount] = useState(0)

  useEffect(() => {
    void getGladiaCacheCount().then(setCachedCount)
  }, [])

  const handleToggleEnabled = async (enabled: boolean) => {
    const next = { ...config, enabled }
    setConfig(next)
    await setGladiaConfig(next)
  }

  const handleApiKeyChange = async (apiKey: string) => {
    const next = { ...config, apiKey }
    setConfig(next)
    await setGladiaConfig(next)
  }

  const handleEndpointChange = async (endpoint: string) => {
    const next = { ...config, endpoint }
    setConfig(next)
    await setGladiaConfig(next)
  }

  const handleTestConnection = async () => {
    if (isTesting) return
    setIsTesting(true)
    try {
      const result = await testGladiaConnection(config)
      toastManager.add({
        type: result.success ? "success" : "error",
        title: result.message,
      })
    } finally {
      setIsTesting(false)
    }
  }

  const handleClearCache = async () => {
    if (isClearingCache) return
    setIsClearingCache(true)
    try {
      await clearGladiaSubtitlesCache()
      setCachedCount(0)
      toastManager.add({
        type: "success",
        title: i18n.cacheCleared,
      })
    } catch {
      toastManager.add({
        type: "error",
        title: "Failed to clear cache",
      })
    } finally {
      setIsClearingCache(false)
    }
  }

  return (
    <ConfigSection id="gladia-subtitles-config" title={i18n.title}>
      <ConfigItem id="gladia-enabled" title={i18n.enableGladia} description={i18n.description}>
        <Switch checked={config.enabled} onCheckedChange={handleToggleEnabled} />
      </ConfigItem>

      <ConfigItem id="gladia-api-key" title={i18n.apiKeyLabel} orientation="vertical">
        <div className="flex w-full items-center gap-2">
          <div className="relative flex-1">
            <Input
              type={showApiKey ? "text" : "password"}
              placeholder={i18n.apiKeyPlaceholder}
              value={config.apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowApiKey(!showApiKey)}
              tabIndex={-1}
            >
              {showApiKey ? <IconEyeOff className="size-4" /> : <IconEye className="size-4" />}
            </button>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleTestConnection}
            disabled={isTesting || !config.apiKey.trim()}
          >
            {isTesting ? (
              <IconLoader2 className="size-4 animate-spin" />
            ) : (
              <IconPlugConnected className="size-4" />
            )}
            {isTesting ? i18n.testing : i18n.testConnection}
          </Button>
        </div>
      </ConfigItem>

      <ConfigItem id="gladia-endpoint" title={i18n.endpointLabel} orientation="vertical">
        <Input
          type="text"
          placeholder={i18n.endpointPlaceholder}
          value={config.endpoint}
          onChange={(e) => handleEndpointChange(e.target.value)}
        />
      </ConfigItem>

      <ConfigItem id="gladia-cache" title={i18n.cachedCount(cachedCount)}>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={handleClearCache}
          disabled={isClearingCache || cachedCount === 0}
        >
          {isClearingCache ? (
            <IconLoader2 className="size-4 animate-spin" />
          ) : (
            <IconTrash className="size-4" />
          )}
          {isClearingCache ? i18n.clearingCache : i18n.clearCache}
        </Button>
      </ConfigItem>
    </ConfigSection>
  )
}
