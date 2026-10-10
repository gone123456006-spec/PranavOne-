import { useCallback, useEffect, useState } from 'react'
import {
  CheckCircle,
  Crown,
  Eye,
  FileArrowDown,
  GearSix,
  Globe,
  List,
  PhoneCall,
  Pulse,
  SignOut,
  SquaresFour,
  UserPlus,
  Users,
} from '@phosphor-icons/react'
import {
  adminFetch,
  clearAdminToken,
  getAdminToken,
  setAdminToken,
} from './tredsdash/adminApi.js'
import {
  OverviewSection,
  RegisteredUsersSection,
  ReportsSection,
  SettingsSection,
  UserDetailSection,
  VisitorsSection,
} from './tredsdash/sections.jsx'
import { SalesSection } from './tredsdash/sales.jsx'
import './TredsDash.css'

const NAV = [
  { id: 'overview', label: 'Overview', group: 'Dashboard', icon: SquaresFour },
  { id: 'sales-add', label: 'Add Lead', group: 'Sales', icon: UserPlus },
  { id: 'sales-followup', label: 'Follow-ups', group: 'Sales', icon: PhoneCall },
  { id: 'sales-converted', label: 'Converted', group: 'Sales', icon: CheckCircle },
  { id: 'users', label: 'Registered Users', group: 'Users', icon: Users },
  { id: 'active-users', label: 'Active Users', group: 'Users', icon: Pulse },
  { id: 'subscribers', label: 'Subscribed Users', group: 'Users', icon: Crown },
  { id: 'visitors', label: 'Visitors', group: 'Website', icon: Eye },
  { id: 'reports', label: 'Exports', group: 'Website', icon: FileArrowDown },
  { id: 'settings', label: 'Settings', group: 'Website', icon: GearSix },
]

const SALES_NAV = NAV.filter((item) => item.group === 'Sales')

const BOTTOM = [
  { id: 'overview', label: 'Home', icon: SquaresFour },
  { id: 'sales-add', label: 'Add Lead', icon: UserPlus },
  { id: 'sales-followup', label: 'Follow-ups', icon: PhoneCall },
  { id: 'sales-converted', label: 'Converted', icon: CheckCircle },
  { id: 'users', label: 'Users', icon: Users },
]

export default function TredsDash() {
  const [token, setToken] = useState(() => getAdminToken())
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('')
  const [authError, setAuthError] = useState('')
  const [booting, setBooting] = useState(Boolean(token))
  const [navOpen, setNavOpen] = useState(false)
  const [section, setSection] = useState('overview')
  const [selectedUserId, setSelectedUserId] = useState(null)

  const logout = useCallback(() => {
    clearAdminToken()
    setToken('')
    setRole('')
    setAuthError('')
    setSelectedUserId(null)
  }, [])

  const onAuthError = useCallback(() => {
    logout()
    setAuthError('Session expired. Sign in again.')
  }, [logout])

  useEffect(() => {
    if (!token) {
      setBooting(false)
      return
    }
    void (async () => {
      try {
        const session = await adminFetch('/api/admin/session', { token })
        setRole(session.role || 'admin')
        setBooting(false)
      } catch {
        logout()
        setBooting(false)
      }
    })()
  }, [token, logout])

  async function handleLogin(event) {
    event.preventDefault()
    setAuthError('')
    try {
      const data = await adminFetch('/api/admin/login', {
        method: 'POST',
        body: { username, password },
      })
      setAdminToken(data.token)
      setRole(data.role || 'admin')
      if (data.role === 'subadmin') setSection('sales-followup')
      setToken(data.token)
      setPassword('')
    } catch (error) {
      setAuthError(error.message || 'Login failed.')
    }
  }

  const isSubAdmin = role === 'subadmin'
  const nav = isSubAdmin ? SALES_NAV : NAV
  const bottom = isSubAdmin ? SALES_NAV : BOTTOM
  const visibleSection = isSubAdmin && !section.startsWith('sales-') ? 'sales-followup' : section

  function go(id) {
    setSection(id)
    setSelectedUserId(null)
    setNavOpen(false)
  }

  if (booting) {
    return (
      <div className="td-shell">
        <div className="td-card td-login-card">
          <p className="td-muted">Loading TredsDash…</p>
        </div>
      </div>
    )
  }

  if (!token) {
    return (
      <div className="td-shell td-shell--login">
        <form className="td-card td-login-card" onSubmit={handleLogin}>
          <img className="td-login-logo" src="/images/pranavone-logo-green.png" alt="Pranav One" />
          <h1>Admin sign in</h1>
          <p className="td-muted">
            Admins and the sales team sign in here.
          </p>
          <label className="td-label" htmlFor="td-username">
            Username
          </label>
          <input
            id="td-username"
            className="td-input"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="admin"
          />
          <label className="td-label" htmlFor="td-password">
            Password
          </label>
          <input
            id="td-password"
            className="td-input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          {authError ? (
            <p className="td-error" role="alert">
              {authError}
            </p>
          ) : null}
          <button className="td-btn td-btn--primary" type="submit">
            Sign in
          </button>
        </form>
      </div>
    )
  }

  return (
    <div
      className={`td-app ${navOpen ? 'td-app--nav-open' : ''} ${visibleSection.startsWith('sales-') ? 'td-app--collapsed' : ''}`}
    >
      <aside className="td-sidebar" aria-label="TredsDash navigation">
        <div className="td-sidebar-brand">
          <img src="/images/pranavone-logo-green.png" alt="Pranav One" />
          <span>{isSubAdmin ? 'Sales' : 'Admin'}</span>
        </div>
        <nav className="td-nav">
          {nav.map((item, index) => {
            const prev = nav[index - 1]
            const showGroup = !prev || prev.group !== item.group
            const Icon = item.icon
            const active = visibleSection === item.id
            return (
              <div key={item.id}>
                {showGroup ? <p className="td-nav-group">{item.group}</p> : null}
                <button
                  type="button"
                  className={`td-nav-item ${active ? 'is-active' : ''}`}
                  onClick={() => go(item.id)}
                >
                  <Icon size={20} weight={active ? 'fill' : 'regular'} aria-hidden="true" />
                  {item.label}
                </button>
              </div>
            )
          })}
        </nav>
        <div className="td-sidebar-foot">
          <a className="td-nav-item" href="/">
            <Globe size={20} aria-hidden="true" />
            View website
          </a>
          <button type="button" className="td-nav-item" onClick={logout}>
            <SignOut size={20} aria-hidden="true" />
            Sign out
          </button>
        </div>
      </aside>

      {navOpen ? (
        <button
          type="button"
          className="td-backdrop"
          aria-label="Close menu"
          onClick={() => setNavOpen(false)}
        />
      ) : null}

      <div className="td-main">
        <header className="td-topbar">
          <button
            type="button"
            className="td-icon-btn td-icon-btn--menu"
            aria-label="Open menu"
            onClick={() => setNavOpen(true)}
          >
            <List size={22} weight="bold" aria-hidden="true" />
          </button>
          <div className="td-topbar-copy">
            <span className="td-topbar-app">{isSubAdmin ? 'Pranav One Sales' : 'Pranav One Admin'}</span>
            <strong>{NAV.find((n) => n.id === visibleSection)?.label || 'TredsDash'}</strong>
          </div>
          <div className="td-topbar-actions">
            <a className="td-icon-btn" href="/" aria-label="View website">
              <Globe size={20} aria-hidden="true" />
            </a>
            <button type="button" className="td-icon-btn" onClick={logout} aria-label="Sign out">
              <SignOut size={20} aria-hidden="true" />
            </button>
          </div>
        </header>

        <main className="td-content">
          {!isSubAdmin && selectedUserId ? (
            <UserDetailSection
              token={token}
              tenantId={selectedUserId}
              onBack={() => setSelectedUserId(null)}
              onAuthError={onAuthError}
            />
          ) : null}

          {!selectedUserId && visibleSection.startsWith('sales-') ? (
            <SalesSection
              token={token}
              onAuthError={onAuthError}
              stage={visibleSection}
              onGo={go}
              canDelete={!isSubAdmin}
            />
          ) : null}

          {!isSubAdmin && !selectedUserId && visibleSection === 'overview' ? (
            <OverviewSection token={token} onAuthError={onAuthError} />
          ) : null}

          {!isSubAdmin && !selectedUserId && (visibleSection === 'users' || visibleSection === 'active-users') ? (
            <RegisteredUsersSection
              token={token}
              onAuthError={onAuthError}
              onOpenUser={setSelectedUserId}
              initialStatus={visibleSection === 'active-users' ? 'active' : 'all'}
              title={visibleSection === 'active-users' ? 'Active Users' : 'Registered Users'}
              subtitle={
                visibleSection === 'active-users'
                  ? 'Users active in the last 72 hours'
                  : null
              }
            />
          ) : null}

          {!isSubAdmin && !selectedUserId && visibleSection === 'subscribers' ? (
            <RegisteredUsersSection
              token={token}
              onAuthError={onAuthError}
              onOpenUser={setSelectedUserId}
              initialStatus="subscribed"
              title="Subscribed Users"
              subtitle="Users with an active subscription"
            />
          ) : null}

          {!isSubAdmin && !selectedUserId && visibleSection === 'visitors' ? (
            <VisitorsSection token={token} onAuthError={onAuthError} />
          ) : null}

          {!isSubAdmin && !selectedUserId && visibleSection === 'reports' ? (
            <ReportsSection token={token} onAuthError={onAuthError} />
          ) : null}

          {!isSubAdmin && !selectedUserId && visibleSection === 'settings' ? (
            <SettingsSection token={token} onAuthError={onAuthError} />
          ) : null}
        </main>
      </div>

      <nav
        className="td-bottom-nav"
        aria-label="Mobile navigation"
        style={{ gridTemplateColumns: `repeat(${bottom.length}, 1fr)` }}
      >
        {bottom.map((item) => {
          const Icon = item.icon
          const active = visibleSection === item.id
          return (
            <button
              key={item.id}
              type="button"
              className={active ? 'is-active' : ''}
              onClick={() => go(item.id)}
            >
              <Icon size={22} weight={active ? 'fill' : 'regular'} aria-hidden="true" />
              <span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
  )
}
