import { Download, X, Share, PlusSquare } from 'lucide-react'
import { useInstallPrompt } from '../../context/InstallPromptContext'
import Modal from './Modal'

// Dismissible bar offering "Add to Home Screen". Android/Chrome gets the
// real native browser prompt; iOS Safari has no programmatic install API,
// so we show it the manual Share -> Add to Home Screen steps instead.
export default function InstallBanner() {
  const { showBanner, isIOS, promptInstall, dismissBanner, showIOSHelp, setShowIOSHelp } = useInstallPrompt()

  return (
    <>
      {showBanner && (
        <div
          className="surface-card"
          style={{
            margin: '0 16px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: 12
          }}
        >
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg,var(--gold),var(--crimson))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            <Download size={17} color="#170f08" />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 12.5 }}>Add BHD Films to your Home Screen</div>
            <div className="text-faint" style={{ fontSize: 10.5 }}>Faster access, full-screen app feel.</div>
          </div>
          <button className="btn btn-primary btn-sm" onClick={promptInstall}>
            Add
          </button>
          <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={dismissBanner} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      {showIOSHelp && (
        <Modal title="Add to Home Screen" onClose={() => setShowIOSHelp(false)}>
          <p className="text-dim" style={{ fontSize: 13, marginBottom: 14 }}>
            iOS Safari doesn't allow websites to trigger this automatically - just two taps:
          </p>
          <div className="list-row">
            <Share size={18} />
            <span style={{ fontSize: 13 }}>1. Tap the <strong>Share</strong> icon in Safari's toolbar.</span>
          </div>
          <div className="list-row">
            <PlusSquare size={18} />
            <span style={{ fontSize: 13 }}>2. Scroll down and tap <strong>"Add to Home Screen"</strong>.</span>
          </div>
          <button className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => setShowIOSHelp(false)}>
            Got it
          </button>
        </Modal>
      )}
    </>
  )
}
