import { useEffect } from 'react'

export default function Toast({ message, onClose, duration = 2500 }) {
  useEffect(() => {
    if (!message) return
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [message, duration, onClose])

  return (
    <div className={`toast ${message ? 'show' : ''}`}>
      <i className="fas fa-check-circle"></i>
      <span>{message || ''}</span>
    </div>
  )
}
