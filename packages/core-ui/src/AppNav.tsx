'use client'

interface AppNavProps {
  appName:      string
  logoMark:     string
  homeUrl:      string
  user:         { name?: string | null; email: string }
  roleBadge:    { label: string; color: string }
  onSignOut:    () => void
  notifUrl?:    string
  supportUrl?:  string
  unreadCount?: number
}

export function AppNav({
  appName, logoMark, homeUrl, user, roleBadge,
  onSignOut, notifUrl, supportUrl, unreadCount = 0,
}: AppNavProps) {
  return (
    <nav className="app-nav">
      <a href={homeUrl} className="app-nav-brand">
        <span className="app-nav-logo">{logoMark}</span>
        <span className="app-nav-name">{appName}</span>
      </a>

      <div className="app-nav-right">
        <span
          className="app-nav-role"
          style={{ background: roleBadge.color + '22', color: roleBadge.color }}
        >
          {roleBadge.label}
        </span>
        <span className="app-nav-user">{user.name || user.email}</span>

        {supportUrl && (
          <a href={supportUrl} className="app-nav-icon-btn" aria-label="Support">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
              <line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </a>
        )}

        {notifUrl && (
          <a href={notifUrl} className="app-nav-icon-btn app-nav-bell" aria-label="Notifications">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {unreadCount > 0 && (
              <span className="app-nav-bell-badge">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </a>
        )}

        <button className="app-nav-signout" onClick={onSignOut}>
          Déconnexion
        </button>
      </div>

      <style>{`
        .app-nav {
          height: var(--nav-h);
          background: var(--white);
          border-bottom: 1px solid var(--border);
          display: flex; align-items: center;
          padding: 0 1.5rem; gap: 1rem;
          position: sticky; top: 0; z-index: 100;
        }
        .app-nav-brand {
          display: flex; align-items: center; gap: .55rem;
          text-decoration: none; margin-right: auto;
        }
        .app-nav-logo {
          width: 32px; height: 32px;
          background: var(--c1); color: #fff;
          border-radius: 9px; display: flex;
          align-items: center; justify-content: center;
          font-weight: 700; font-size: .8rem;
        }
        .app-nav-name {
          font-family: 'Fraunces', serif;
          font-weight: 700; font-size: 1.05rem;
          color: var(--dark);
        }
        .app-nav-right {
          display: flex; align-items: center; gap: .9rem;
        }
        .app-nav-role {
          font-size: .75rem; font-weight: 600;
          padding: .25em .7em; border-radius: 20px;
        }
        .app-nav-user {
          font-size: .88rem; color: var(--text-mid);
          white-space: nowrap; max-width: 180px;
          overflow: hidden; text-overflow: ellipsis;
        }
        .app-nav-icon-btn {
          position: relative;
          display: flex; align-items: center; justify-content: center;
          width: 34px; height: 34px; border-radius: 8px;
          color: var(--text-mid); text-decoration: none;
          transition: background .12s, color .12s;
        }
        .app-nav-icon-btn:hover { background: var(--bg); color: var(--text); }
        .app-nav-bell-badge {
          position: absolute; top: 2px; right: 2px;
          background: var(--c1); color: #fff;
          font-size: .6rem; font-weight: 700;
          min-width: 16px; height: 16px;
          border-radius: 8px; padding: 0 4px;
          display: flex; align-items: center; justify-content: center;
          line-height: 1;
        }
        .app-nav-signout {
          font-size: .82rem; color: var(--text-light);
          background: none; border: 1px solid var(--border);
          padding: .3em .8em; border-radius: 6px;
          cursor: pointer; transition: color .15s, border-color .15s;
        }
        .app-nav-signout:hover { color: var(--text); border-color: var(--text-mid); }
      `}</style>
    </nav>
  )
}
