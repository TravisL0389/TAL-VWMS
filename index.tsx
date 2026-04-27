import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { clearAllVWMS } from './utils/storage';

type ErrorBoundaryState = {
  error: Error | null;
};

class RootErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[vwms] root render failed', error, info);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    clearAllVWMS();
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          background: '#0a0c0e',
          color: '#f8fafc',
          fontFamily: 'Inter, sans-serif',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '560px',
            border: '1px solid #2a2d31',
            borderRadius: '18px',
            background: '#0f1113',
            padding: '28px',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)',
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              background: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              marginBottom: '18px',
              fontSize: '20px',
              fontWeight: 800,
            }}
          >
            !
          </div>
          <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#71717a', marginBottom: '8px' }}>
            VWMS Recovery
          </div>
          <h1 style={{ margin: 0, fontSize: '28px', lineHeight: 1.05, fontWeight: 900 }}>
            The app hit a loading problem.
          </h1>
          <p style={{ marginTop: '12px', marginBottom: '18px', color: '#a1a1aa', lineHeight: 1.6, fontSize: '14px' }}>
            Try reloading first. If the problem came from older saved setup data, reset the local VWMS data and the app will reopen cleanly.
          </p>
          <div
            style={{
              border: '1px solid #2a2d31',
              borderRadius: '12px',
              background: '#0a0c0e',
              padding: '12px 14px',
              marginBottom: '18px',
              color: '#d4d4d8',
              fontSize: '13px',
              lineHeight: 1.5,
              wordBreak: 'break-word',
            }}
          >
            {this.state.error.message || 'Unknown runtime error'}
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={this.handleReload}
              style={{
                border: 'none',
                borderRadius: '10px',
                padding: '12px 16px',
                background: '#dc2626',
                color: '#fff',
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              Reload App
            </button>
            <button
              onClick={this.handleReset}
              style={{
                borderRadius: '10px',
                padding: '12px 16px',
                background: 'transparent',
                color: '#f4f4f5',
                fontWeight: 700,
                cursor: 'pointer',
                border: '1px solid #3f3f46',
              }}
            >
              Reset Saved Data
            </button>
          </div>
        </div>
      </div>
    );
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Could not find root element to mount to');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>,
);
