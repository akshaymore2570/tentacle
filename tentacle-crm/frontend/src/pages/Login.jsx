import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../store/authStore'

export default function Login() {
  const navigate = useNavigate()
  const { login, token, loading, user } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (token && user) {
      if (user.isSuperAdmin) navigate('/license', { replace: true })
      else navigate('/campaign', { replace: true })
    }
  }, [token, user, navigate])

  const redirectAfterLogin = async (loggedUser) => {
    if (loggedUser?.isSuperAdmin) {
      setTimeout(() => navigate('/license', { replace: true }), 400)
      return
    }
    try {
      const res = await fetch('/api/license/status')
      const lic = await res.json()
      setTimeout(() => {
        navigate(lic.valid ? '/campaign' : '/login', { replace: true })
      }, 600)
    } catch {
      setTimeout(() => navigate('/campaign', { replace: true }), 600)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!username || !password) {
      setError('Please enter both username and password')
      return
    }
    const res = await login(username.trim(), password)
    if (res.ok) {
      setSuccess(true)
      redirectAfterLogin(res.user)
    } else {
      setError(res.error || 'Invalid username or password')
      setPassword('')
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo-mark"><i className="fas fa-cube"></i></div>
          <div className="login-logo-text">
            Tentacle
            <span>TECHNOLOGIES</span>
          </div>
        </div>

        <div className="login-header">
          <h1>Welcome back</h1>
          <p>Sign in to continue to your dashboard</p>
        </div>

        {error && (
          <div className="error-message">
            <i className="fas fa-exclamation-circle"></i>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <div className="input-wrapper">
              <i className="fas fa-user input-icon"></i>
              <input
                id="username"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <i className="fas fa-lock input-icon"></i>
              <input
                id="password"
                type={showPwd ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPwd((v) => !v)}
                tabIndex={-1}
              >
                <i className={`fas ${showPwd ? 'fa-eye-slash' : 'fa-eye'}`}></i>
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn-signin"
            disabled={loading || success}
            style={success ? { background: 'linear-gradient(135deg,#10b981,#059669)' } : {}}
          >
            {loading ? (
              <>
                <span className="spinner" style={{
                  width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white', borderRadius: '50%',
                  display: 'inline-block', animation: 'spin 0.8s linear infinite'
                }} />
                Signing in...
              </>
            ) : success ? (
              <><i className="fas fa-check"></i> Success! Redirecting...</>
            ) : (
              <><i className="fas fa-sign-in-alt"></i> Sign In</>
            )}
          </button>
        </form>

        <div className="login-footer">
          &copy; 2025 <strong style={{ color: '#6b7d91' }}>Tentacle Technologies</strong> · All rights reserved
        </div>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </div>
  )
}
