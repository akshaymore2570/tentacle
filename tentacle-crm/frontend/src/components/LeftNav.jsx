import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/authStore'

export default function LeftNav({ onOpenTheme }) {
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAuth((s) => s.user)
  const active = (p) => location.pathname.startsWith(p)

  const isAdmin = user?.username === 'admin' ||
                  user?.roles?.some?.(r => String(r).toLowerCase() === 'admin')

  return (
    <aside className="left-nav">
      <div className="nav-section-label">Main</div>
      <div className={`nav-item ${active('/campaign') || active('/crm') ? 'active' : ''}`} onClick={() => navigate('/campaign')}>
        <i className="fas fa-bullhorn"></i><span>Campaign</span>
      </div>
      <div className={`nav-item ${active('/users') ? 'active' : ''}`} onClick={() => navigate('/users')}>
        <i className="fas fa-users"></i><span>Users</span>
      </div>

      {isAdmin && (
        <>
          <div className="nav-section-label" style={{ marginTop: 12 }}>Admin</div>
          <div className={`nav-item ${active('/license') ? 'active' : ''}`} onClick={() => navigate('/license')}>
            <i className="fas fa-key"></i><span>License</span>
          </div>
        </>
      )}

      <div className="nav-item" onClick={onOpenTheme}>
        <i className="fas fa-palette"></i><span>App Colors</span>
      </div>
    </aside>
  )
}
