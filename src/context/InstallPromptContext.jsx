import { createContext, useContext, useEffect, useState, useCallback } from 'react'

const InstallPromptContext = createContext(null)

const DISMISS_KEY = 'bhd_install_banner_dismissed_at'
const DISMISS_DAYS = 7

function isStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
}

function isIOSDevice() {
  return /iPad|iPhone|iPod/.test(window.navigator.userAgent) && !window.MSStream
}

function wasRecentlyDismissed() {
  const raw = window.localStorage.getItem(DISMISS_KEY)
  if (!raw) return false
  const dismissedAt = Number(raw)
  if (Number.isNaN(dismissedAt)) return false
  return Date.now() - dismissedAt < DISMISS_DAYS * 24 * 60 * 60 * 1000
}

// Tracks the browser's native "Add to Home Screen" prompt (Android/Chrome)
// and iOS Safari's lack of one, in a single place so both the dismissible
// banner and the drawer menu's manual "Add to Home Screen" item stay in sync.
export function InstallPromptProvider({ children }) {
  const [deferredEvent, setDeferredEvent] = useState(null)
  const [installed, setInstalled] = useState(isStandaloneMode())
  const [bannerDismissed, setBannerDismissed] = useState(wasRecentlyDismissed())
  const [showIOSHelp, setShowIOSHelp] = useState(false)

  useEffect(() => {
    function onBeforeInstallPrompt(e) {
      e.preventDefault()
      setDeferredEvent(e)
    }
    function onInstalled() {
      setInstalled(true)
      setDeferredEvent(null)
    }
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (deferredEvent) {
      deferredEvent.prompt()
      try {
        await deferredEvent.userChoice
      } catch {
        // ignore - user dismissed the native prompt
      }
      setDeferredEvent(null)
      return
    }
    if (isIOSDevice()) {
      setShowIOSHelp(true)
    }
  }, [deferredEvent])

  const dismissBanner = useCallback(() => {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()))
    setBannerDismissed(true)
  }, [])

  const isIOS = isIOSDevice()
  const canOfferInstall = !installed && (!!deferredEvent || isIOS)

  const value = {
    canOfferInstall,
    showBanner: canOfferInstall && !bannerDismissed,
    isIOS,
    installed,
    promptInstall,
    dismissBanner,
    showIOSHelp,
    setShowIOSHelp
  }

  return <InstallPromptContext.Provider value={value}>{children}</InstallPromptContext.Provider>
}

export function useInstallPrompt() {
  const ctx = useContext(InstallPromptContext)
  if (!ctx) throw new Error('useInstallPrompt must be used within InstallPromptProvider')
  return ctx
}
