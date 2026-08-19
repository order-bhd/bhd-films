import { Component } from 'react'
import { RefreshCcw, Home } from 'lucide-react'

// Top-level safety net. Without this, any uncaught error anywhere in the
// component tree (a bad API response, a null reference, a third-party
// library throwing) blanks the entire screen with no way back for the
// customer - which is exactly what happened before this existed. Now it
// shows a recoverable screen instead of a dead app.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('Unhandled UI error:', error, info)
  }

  handleReload = () => {
    this.setState({ hasError: false })
    window.location.reload()
  }

  handleHome = () => {
    this.setState({ hasError: false })
    window.location.href = '/'
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          textAlign: 'center',
          background: '#08070c',
          color: 'var(--text, #f5f5f5)'
        }}
      >
        <h1 style={{ fontSize: 18, margin: '0 0 8px' }}>Something went wrong</h1>
        <p style={{ fontSize: 13, opacity: 0.7, marginBottom: 20, maxWidth: 300 }}>
          This screen ran into an unexpected error. Your account and wallet are safe - try reloading or heading back
          to the home page.
        </p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-primary btn-sm" onClick={this.handleReload}>
            <RefreshCcw size={14} /> Reload
          </button>
          <button className="btn btn-ghost btn-sm" onClick={this.handleHome}>
            <Home size={14} /> Home
          </button>
        </div>
      </div>
    )
  }
}
