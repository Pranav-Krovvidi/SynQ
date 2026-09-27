'use client'
/**
 * Settings page
 *
 * Toggle fix: uses a pure CSS/Tailwind approach with data-state attributes
 * so the thumb is always fully contained within the track.
 * The toggle-root / toggle-thumb classes are defined in globals.css.
 */
import { useState } from 'react'
import { Settings, Bell, Shield, Palette, Server, CheckCircle } from 'lucide-react'

// ── Reusable toggle component (self-contained, no external deps) ──────────
function Toggle({
  checked, onChange, id,
}: { checked: boolean; onChange: (v: boolean) => void; id: string }) {
  return (
    <button
      id={id}
      role="switch"
      aria-checked={checked}
      data-state={checked ? 'checked' : 'unchecked'}
      onClick={() => onChange(!checked)}
      className="toggle-root"
      type="button"
    >
      <span data-state={checked ? 'checked' : 'unchecked'} className="toggle-thumb" />
    </button>
  )
}

interface SettingRowProps {
  label: string
  description: string
  checked: boolean
  onChange: (v: boolean) => void
  id: string
}

function SettingRow({ label, description, checked, onChange, id }: SettingRowProps) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div className="flex-1 min-w-0 pr-8">
        <label htmlFor={id} className="text-sm font-medium text-gray-900 cursor-pointer">
          {label}
        </label>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} id={id} />
    </div>
  )
}

export default function SettingsPage() {
  const [saved, setSaved] = useState(false)

  // Notification prefs
  const [emailDigest,   setEmailDigest]   = useState(true)
  const [adrAlerts,     setAdrAlerts]     = useState(true)
  const [chatHistory,   setChatHistory]   = useState(false)

  // AI prefs
  const [streamTokens,  setStreamTokens]  = useState(true)
  const [showCitations, setShowCitations] = useState(true)
  const [demoMode,      setDemoMode]      = useState(
    !process.env.NEXT_PUBLIC_API_BASE_URL
  )

  // Display
  const [compactMode,   setCompactMode]   = useState(false)
  const [showTimestamps, setShowTimestamps] = useState(true)

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || '(not set — using dev proxy)'
  const demoPid = process.env.NEXT_PUBLIC_DEMO_PROJECT_ID || '(not set)'
  const backendConnected = !!process.env.NEXT_PUBLIC_API_BASE_URL

  return (
    <div className="p-8 space-y-8 max-w-2xl">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-gray-500" />
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      </div>

      {/* Backend status banner */}
      <div className={`rounded-xl border px-5 py-4 flex items-start gap-3 ${
        backendConnected
          ? 'bg-green-50 border-green-200'
          : 'bg-amber-50 border-amber-200'
      }`}>
        <Server className={`w-5 h-5 shrink-0 mt-0.5 ${backendConnected ? 'text-green-600' : 'text-amber-600'}`} />
        <div>
          <p className={`text-sm font-semibold ${backendConnected ? 'text-green-800' : 'text-amber-800'}`}>
            {backendConnected ? 'Backend connected' : 'SynQ demo mode — backend not connected'}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            {backendConnected
              ? `API: ${apiUrl}`
              : 'Add NEXT_PUBLIC_API_BASE_URL + NEXT_PUBLIC_DEMO_PROJECT_ID to your environment to enable live AI responses.'}
          </p>
          {!backendConnected && (
            <pre className="mt-2 text-xs bg-white/60 rounded p-2 border border-amber-200 text-gray-700">
{`NEXT_PUBLIC_API_BASE_URL=https://your-backend.example.com
NEXT_PUBLIC_DEMO_PROJECT_ID=<your-project-uuid>`}
            </pre>
          )}
        </div>
      </div>

      {/* Connection info */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-1">
        <h2 className="flex items-center gap-2 font-semibold text-gray-900 mb-4">
          <Shield className="w-4 h-4 text-brand-500" /> Connection
        </h2>
        <div className="text-sm space-y-2">
          <div className="flex justify-between py-2 border-b border-gray-50">
            <span className="text-gray-500">API Base URL</span>
            <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700 max-w-xs truncate">{apiUrl}</code>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-500">Demo Project ID</span>
            <code className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700">{demoPid}</code>
          </div>
        </div>
      </section>

      {/* Notifications */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="flex items-center gap-2 font-semibold text-gray-900 mb-2">
          <Bell className="w-4 h-4 text-brand-500" /> Notifications
        </h2>
        <SettingRow
          id="email-digest"
          label="Weekly email digest"
          description="Receive a summary of new ADRs and decisions every week"
          checked={emailDigest}
          onChange={setEmailDigest}
        />
        <SettingRow
          id="adr-alerts"
          label="ADR status alerts"
          description="Notify when an ADR you authored is updated or superseded"
          checked={adrAlerts}
          onChange={setAdrAlerts}
        />
        <SettingRow
          id="chat-history"
          label="Save chat history"
          description="Persist AI chat history across sessions"
          checked={chatHistory}
          onChange={setChatHistory}
        />
      </section>

      {/* AI */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="flex items-center gap-2 font-semibold text-gray-900 mb-2">
          <Shield className="w-4 h-4 text-brand-500" /> AI Responses
        </h2>
        <SettingRow
          id="stream-tokens"
          label="Stream tokens"
          description="Show AI responses character by character as they generate"
          checked={streamTokens}
          onChange={setStreamTokens}
        />
        <SettingRow
          id="show-citations"
          label="Show citations"
          description="Display source citations below every AI response"
          checked={showCitations}
          onChange={setShowCitations}
        />
        <SettingRow
          id="demo-mode"
          label="Demo mode"
          description="Use local seed data when backend is unavailable"
          checked={demoMode}
          onChange={setDemoMode}
        />
      </section>

      {/* Display */}
      <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h2 className="flex items-center gap-2 font-semibold text-gray-900 mb-2">
          <Palette className="w-4 h-4 text-brand-500" /> Display
        </h2>
        <SettingRow
          id="compact-mode"
          label="Compact mode"
          description="Reduce card padding and font sizes for denser information display"
          checked={compactMode}
          onChange={setCompactMode}
        />
        <SettingRow
          id="show-timestamps"
          label="Show timestamps"
          description="Display creation/update dates on all entity cards"
          checked={showTimestamps}
          onChange={setShowTimestamps}
        />
      </section>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium
                     px-6 py-2 rounded-lg transition-colors"
        >
          Save preferences
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-green-600">
            <CheckCircle className="w-4 h-4" /> Saved
          </span>
        )}
      </div>
    </div>
  )
}
