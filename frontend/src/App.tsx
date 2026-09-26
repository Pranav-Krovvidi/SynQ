import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

/**
 * App — top-level routing shell.
 *
 * Full routing tree and feature pages are wired in WS-8 (Frontend Shell).
 * This placeholder keeps the app buildable from day one.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/projects" replace />} />
        <Route path="/projects" element={<PlaceholderPage title="Projects" />} />
        <Route path="*" element={<PlaceholderPage title="404 — Not Found" />} />
      </Routes>
    </BrowserRouter>
  )
}

// ---------------------------------------------------------------------------
// Placeholder — replaced by real pages in WS-8 through WS-13
// ---------------------------------------------------------------------------
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: "'IBM Plex Sans', sans-serif",
        background: '#f4f4f4',
        color: '#161616',
        gap: '1rem',
      }}
    >
      <h1 style={{ fontSize: '2rem', margin: 0 }}>SynQ</h1>
      <p style={{ color: '#525252', margin: 0 }}>{title}</p>
      <p style={{ fontSize: '0.875rem', color: '#8d8d8d' }}>
        Frontend shell — feature pages added in WS-8
      </p>
    </div>
  )
}
