import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/authStore'
import api from '../api'

export default function LicenseGuard({ children }) {
  const [status, setStatus] = useState(null)
  const navigate = useNavigate()
  const user = useAuth((s) => s.user)

  // Admin detection — multiple ways
  const isAdmin = 
    user?.username === 'admin' ||
    user?.roles?.some?.(r => {
      // roles can be IDs (numbers) or names (strings) depending on backend
      if (typeof r === 'string') return r.toLowerCase() === 'admin'
      if (typeof r === 'number') return r === 1  // seed me admin ka ID = 1
      if (typeof r === 'object') return r.name?.toLowerCase() === 'admin'
      return false
    })

  const check = async () => {
    try {
      const { data } = await api.get('/license/status')
      setStatus(data)
    } catch {
      setStatus({ valid: false, reason: 'Cannot reach license server' })
    }
  }

  useEffect(() => { check() }, [])

  useEffect(() => {
    const handler = () => check()
    window.addEventListener('license-changed', handler)
    return () => window.removeEventListener('license-changed', handler)
  }, [])

  if (!status) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--text-muted)' }}>
        <i className="fas fa-spinner fa-spin"></i>&nbsp; Checking license...
      </div>
    )
  }

  if (!status.valid) {
    return (
      <div style={{
        position: 'fixed', inset: 0,
        background: 'linear-gradient(135deg, #7f1d1d, #450a0a)',
        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, zIndex: 99999,
      }}>
        <div style={{
          background: 'rgba(0,0,0,0.4)', borderRadius: 20, padding: 44,
          maxWidth: 500, textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)',
        }}>
          <div style={{
            width: 80, height: 80, margin: '0 auto 20px',
            background: 'rgba(255,255,255,0.15)', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem',
          }}>
            <i className="fas fa-lock"></i>
          </div>
          <h1 style={{ fontSize: '1.6rem', marginBottom: 12 }}>License Expired</h1>
          <p style={{ fontSize: '0.95rem', opacity: 0.85, marginBottom: 24, lineHeight: 1.6 }}>
            {status.reason || 'Your license has expired or is invalid.'}<br />
            Please contact your administrator to renew the license.
          </p>

          {isAdmin ? (
            <button
              onClick={() => {
                // Force allow navigation to /license even though license is invalid
                navigate('/license')
                // Trigger re-check after route change
                setTimeout(() => window.dispatchEvent(new Event('license-changed')), 100)
              }}
              style={{
                padding: '13px 28px', border: 'none', borderRadius: 10,
                background: 'white', color: '#7f1d1d',
                fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
              }}
            >
              <i className="fas fa-key"></i> Go to License Update
            </button>
          ) : (
            <div style={{
              padding: '12px 20px', background: 'rgba(255,255,255,0.1)',
              borderRadius: 10, fontSize: '0.85rem',
            }}>
              <i className="fas fa-info-circle"></i> Contact your administrator
            </div>
          )}
        </div>
      </div>
    )
  }

  return children
}
