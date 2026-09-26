'use client'

import React, { useState } from 'react'
import AppLayout from '@/components/AppLayout'
import { useAuth } from '@/lib/auth'
import { Settings, User, Bell, Shield, Plug, Sun, ChevronRight, LogOut } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Tab = 'profile' | 'notifications' | 'security' | 'integrations'

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'profile',       label: 'Profile',       icon: <User size={14} /> },
  { id: 'notifications', label: 'Notifications',  icon: <Bell size={14} /> },
  { id: 'security',      label: 'Security',       icon: <Shield size={14} /> },
  { id: 'integrations',  label: 'Integrations',   icon: <Plug size={14} /> },
]

function SettingRow({ label, description, children }: { label: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div>
        <p className="text-[13px] font-medium text-foreground">{label}</p>
        {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
      </div>
      <div className="flex-shrink-0 ml-4">{children}</div>
    </div>
  )
}

function Toggle({ defaultOn = false }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn)
  return (
    <button
      onClick={() => setOn(!on)}
      className={`w-9 h-5 rounded-full transition-colors relative ${on ? 'bg-primary' : 'bg-muted'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
    </button>
  )
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('profile')
  const { user, logout } = useAuth()
  const router = useRouter()

  const handleLogout = () => {
    logout()
    router.push('/login')
  }

  return (
    <AppLayout>
      <div className="p-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-foreground mb-1">Settings</h1>
          <p className="text-[13px] text-muted-foreground">Manage your account, notifications, and integrations</p>
        </div>

        <div className="flex gap-5">
          {/* Sidebar tabs */}
          <div className="w-44 flex-shrink-0">
            <div className="space-y-0.5">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-all sidebar-item ${
                    activeTab === tab.id ? 'sidebar-item-active' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div className="flex-1 border border-border bg-secondary rounded-md p-5">
            {activeTab === 'profile' && (
              <div>
                <h2 className="text-[14px] font-semibold text-foreground mb-4">Profile</h2>
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[14px] font-bold text-background">
                    {user?.avatar ?? 'U'}
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-foreground">{user?.name}</p>
                    <p className="text-[12px] text-muted-foreground">{user?.email}</p>
                    <p className="text-[11px] text-muted-foreground">{user?.title} · {user?.team}</p>
                  </div>
                </div>
                <SettingRow label="Display name" description="Shown in chat and activity feed">
                  <input className="bg-background border border-border rounded px-2 py-1 text-[12px] text-foreground w-36" defaultValue={user?.name} />
                </SettingRow>
                <SettingRow label="Email" description="Used for notifications">
                  <span className="text-[12px] text-muted-foreground">{user?.email}</span>
                </SettingRow>
                <SettingRow label="Role" description="Your access level">
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded border bg-teal-500/10 text-teal-400 border-teal-500/20 capitalize">{user?.role}</span>
                </SettingRow>
                <div className="mt-6 pt-4 border-t border-border">
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-[13px] text-red-400 hover:text-red-300 transition-colors"
                  >
                    <LogOut size={14} />
                    Sign out
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div>
                <h2 className="text-[14px] font-semibold text-foreground mb-4">Notifications</h2>
                <SettingRow label="Active incidents" description="Notify when a new incident is opened">
                  <Toggle defaultOn={true} />
                </SettingRow>
                <SettingRow label="ADR status changes" description="Notify when ADRs you authored are updated">
                  <Toggle defaultOn={true} />
                </SettingRow>
                <SettingRow label="Onboarding reminders" description="Daily progress reminders">
                  <Toggle defaultOn={false} />
                </SettingRow>
                <SettingRow label="Knowledge sync alerts" description="Notify when knowledge base is updated">
                  <Toggle defaultOn={false} />
                </SettingRow>
              </div>
            )}

            {activeTab === 'security' && (
              <div>
                <h2 className="text-[14px] font-semibold text-foreground mb-4">Security</h2>
                <SettingRow label="Password" description="Last changed 90 days ago">
                  <button className="text-[12px] text-primary hover:underline">Change</button>
                </SettingRow>
                <SettingRow label="Two-factor authentication" description="Adds an extra layer of security">
                  <Toggle defaultOn={false} />
                </SettingRow>
                <SettingRow label="Active sessions" description="1 active session (this browser)">
                  <button className="text-[12px] text-muted-foreground hover:text-foreground flex items-center gap-1">
                    View <ChevronRight size={11} />
                  </button>
                </SettingRow>
              </div>
            )}

            {activeTab === 'integrations' && (
              <div>
                <h2 className="text-[14px] font-semibold text-foreground mb-4">Integrations</h2>
                <p className="text-[12px] text-muted-foreground mb-4">
                  Connect SynQ to your existing tools to automatically ingest knowledge.
                </p>
                {[
                  { name: 'GitHub', status: 'Coming soon', description: 'Import repos, READMEs, and CODEOWNERS' },
                  { name: 'Jira', status: 'Coming soon', description: 'Import tickets, epics, and requirements' },
                  { name: 'Confluence', status: 'Coming soon', description: 'Import pages and architecture docs' },
                  { name: 'PagerDuty', status: 'Coming soon', description: 'Sync incidents and postmortems' },
                  { name: 'Slack', status: 'Coming soon', description: 'Index decisions from #architecture channels' },
                ].map((int) => (
                  <div key={int.name} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                    <div>
                      <p className="text-[13px] font-medium text-foreground">{int.name}</p>
                      <p className="text-[11px] text-muted-foreground">{int.description}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground px-2 py-0.5 rounded border border-border">{int.status}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
