import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/authStore'

export default function TopBar() {
  const navigate = useNavigate()
  const user = useAuth((s) => s.user)
  const logout = useAuth((s) => s.logout)

  const initials = (user?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <header className="top-bar">
      <div className="logo" onClick={() => navigate('/campaign')}>
        <div className="logo-mark"><i className="fas fa-cube"></i></div>
        <div className="logo-text">Tentacle<span>TECHNOLOGIES</span></div>
      </div>

      <div className="top-search">
        <i className="fas fa-search"></i>
        <input type="text" placeholder="Search campaigns, leads, or settings..." />
      </div>

      <div className="top-actions">
        <button className="icon-btn"><i className="fas fa-bell"></i></button>
        <button className="icon-btn"><i className="fas fa-circle-question"></i></button>
        <div className="user-chip" onClick={logout} title="Click to logout">
          <div className="user-avatar">{initials}</div>
          <span>{user?.name || 'User'}</span>
          <i className="fas fa-sign-out-alt" style={{ fontSize: '0.7rem', opacity: 0.7 }}></i>
        </div>
      </div>
    </header>
  )
}
