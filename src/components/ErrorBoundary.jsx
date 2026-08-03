import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('ACQ APP ERROR', error, info)
  }

  render() {
    if (this.state.error) {
      return <div className="fatal-error">
        <h1>SI È VERIFICATO UN ERRORE</h1>
        <p>{String(this.state.error.message || this.state.error)}</p>
        <button onClick={() => window.location.reload()}>RICARICA APPLICAZIONE</button>
      </div>
    }
    return this.props.children
  }
}
