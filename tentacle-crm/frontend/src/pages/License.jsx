import { useEffect, useState } from 'react'
import api from '../api'

function parseLicenseFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const raw = JSON.parse(e.target.result)
        if (!raw.payload) return reject('Missing payload')
        const decoded = JSON.parse(
          decodeURIComponent(
            Array.prototype.map
              .call(atob(raw.payload), (c) =>
                '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
              )
              .join('')
          )
        )
        resolve({ payload: decoded, raw })
      } catch (err) {
        reject(err.message || 'Invalid license file')
      }
    }
    reader.onerror = () => reject('Cannot read file')
    reader.readAsText(file)
  })
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24))
}

export default function License({ showToast }) {
  const [status, setStatus] = useState(null)
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [previewError, setPreviewError] = useState('')
  const [uploading, setUploading] = useState(false)

  const load = async () => {
    try {
      const { data } = await api.get('/license/status')
      setStatus(data)
    } catch {}
  }

  useEffect(() => { load() }, [])

  const handleFileSelect = async (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(null)
    setPreviewError('')

    try {
      const parsed = await parseLicenseFile(f)
      setPreview(parsed.payload)
    } catch (err) {
      setPreviewError('This is not a valid license file. Please get a new file from your vendor.')
    }
  }

  const upload = async () => {
    if (!file) return showToast && showToast('Please select a .lic file first')
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      await api.post('/license/upload', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      showToast && showToast('License installed successfully')
      setFile(null)
      setPreview(null)
      load()
    } catch (e2) {
      showToast && showToast(e2.response?.data?.error || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const valid = status?.valid
  const daysLeft = status?.daysLeft ?? 0
  const p = status?.payload

  const fmt = (d) => d ? new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }) : '—'

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric'
  }) : '—'

  return (
    <>
      <div className="page-header">
        <div>
          <h1><i className="fas fa-key"></i> License Management</h1>
          <p>Upload and manage your dialer license</p>
        </div>
      </div>

      <div style={{ padding: '0 32px 40px', maxWidth: 960 }}>

        {/* ============ STATUS BANNER ============ */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, padding: 28, marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 20,
        }}>
          <div style={{
            width: 70, height: 70, borderRadius: 16,
            background: valid ? '#d1fae5' : '#fee2e2',
            color: valid ? '#047857' : '#b91c1c',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.8rem',
          }}>
            <i className={`fas ${valid ? 'fa-check-circle' : 'fa-exclamation-triangle'}`}></i>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 4 }}>
              {valid ? 'License Active' : 'License Invalid / Expired'}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
              {status?.reason || 'Loading...'}
            </div>
            {valid && (
              <div style={{ marginTop: 8, fontSize: '0.85rem' }}>
                <strong style={{ color: 'var(--primary)' }}>{daysLeft} days</strong> remaining
              </div>
            )}
          </div>
        </div>

        {/* ============ CURRENT LICENSE VALIDITY ============ */}
        {p && (
          <div style={{
            background: 'linear-gradient(135deg, #fef3c7, #fde68a)',
            border: '2px solid #f59e0b',
            borderRadius: 14, padding: 24, marginBottom: 20,
          }}>
            <div style={{
              fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase',
              letterSpacing: 1, color: '#92400e', marginBottom: 16,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <i className="fas fa-calendar-alt"></i>
              Current License Validity
            </div>

            <div style={{
              display: 'grid', gridTemplateColumns: '1fr auto 1fr',
              gap: 16, alignItems: 'center',
            }}>
              <div style={{
                background: 'white', borderRadius: 12, padding: 18,
                border: '1px solid #fbbf24', textAlign: 'center',
              }}>
                <div style={{
                  fontSize: '0.68rem', fontWeight: 700, color: '#92400e',
                  textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
                }}>
                  Valid From
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e2a3a' }}>
                  {fmtDate(p.validFrom)}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#78716c', marginTop: 4 }}>
                  {fmt(p.validFrom)}
                </div>
              </div>

              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              }}>
                <i className="fas fa-arrow-right" style={{ color: '#f59e0b', fontSize: '1.3rem' }}></i>
                <div style={{
                  fontSize: '0.7rem', fontWeight: 700, color: '#92400e',
                  background: 'white', padding: '2px 10px', borderRadius: 10,
                  border: '1px solid #fbbf24', whiteSpace: 'nowrap',
                }}>
                  {daysLeft} days
                </div>
              </div>

              <div style={{
                background: 'white', borderRadius: 12, padding: 18,
                border: '1px solid #fbbf24', textAlign: 'center',
              }}>
                <div style={{
                  fontSize: '0.68rem', fontWeight: 700, color: '#92400e',
                  textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6,
                }}>
                  Valid Until
                </div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#b91c1c' }}>
                  {fmtDate(p.validUntil)}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#78716c', marginTop: 4 }}>
                  {fmt(p.validUntil)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============ DETAILS ============ */}
        {p && (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 24, marginBottom: 20,
          }}>
            <div style={{
              fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: 1, color: 'var(--primary)', marginBottom: 12,
            }}>
              <i className="fas fa-circle-info"></i> License Details
            </div>
            {[
              ['Customer', p.customer || p.licensee],
              ['Serial', p.serial],
              ['Features', (p.features || []).join(', ')],
              ['Issued At', fmt(p.issuedAt)],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '11px 0', borderTop: '1px dashed var(--border)',
                fontSize: '0.88rem',
              }}>
                <span style={{ color: 'var(--text-muted)' }}>{k}</span>
                <strong>{v}</strong>
              </div>
            ))}
          </div>
        )}

        {/* ============ UPLOAD NEW LICENSE ============ */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, padding: 24,
        }}>
          <div style={{
            fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: 1, color: 'var(--primary)', marginBottom: 16,
          }}>
            <i className="fas fa-upload"></i> Upload New License
          </div>

          <input
            type="file"
            accept=".lic"
            onChange={handleFileSelect}
            style={{
              width: '100%', padding: '14px', border: '2px dashed var(--border)',
              borderRadius: 10, background: '#fafcff', cursor: 'pointer',
              fontSize: '0.85rem', marginBottom: 16,
            }}
          />

          {previewError && (
            <div style={{
              padding: 14, background: '#fee2e2', border: '1.5px solid #fca5a5',
              color: '#991b1b', borderRadius: 10, marginBottom: 16,
              fontSize: '0.85rem', fontWeight: 600,
            }}>
              <i className="fas fa-exclamation-triangle"></i> {previewError}
            </div>
          )}

          {/* ============ PREVIEW ============ */}
          {preview && (
            <div style={{
              padding: 20,
              background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
              border: '2px solid #60a5fa',
              borderRadius: 12, marginBottom: 16,
            }}>
              <div style={{
                fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase',
                letterSpacing: 1, color: '#1e40af', marginBottom: 16,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <i className="fas fa-eye"></i> License Preview
              </div>

              <div style={{
                display: 'grid', gridTemplateColumns: '1fr auto 1fr',
                gap: 12, alignItems: 'center', marginBottom: 16,
              }}>
                <div style={{
                  background: 'white', borderRadius: 10, padding: 14,
                  border: '1.5px solid #3b82f6', textAlign: 'center',
                }}>
                  <div style={{
                    fontSize: '0.65rem', fontWeight: 800, color: '#1e40af',
                    textTransform: 'uppercase', marginBottom: 4,
                  }}>
                    Valid From
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800 }}>
                    {fmtDate(preview.validFrom)}
                  </div>
                </div>
                <i className="fas fa-arrow-right" style={{ color: '#3b82f6' }}></i>
                <div style={{
                  background: 'white', borderRadius: 10, padding: 14,
                  border: '1.5px solid #dc2626', textAlign: 'center',
                }}>
                  <div style={{
                    fontSize: '0.65rem', fontWeight: 800, color: '#991b1b',
                    textTransform: 'uppercase', marginBottom: 4,
                  }}>
                    Valid Until
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#991b1b' }}>
                    {fmtDate(preview.validUntil)}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 8, fontSize: '0.82rem' }}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '8px 0', borderTop: '1px dashed #93c5fd',
                }}>
                  <span style={{ color: '#1e40af' }}>Customer</span>
                  <strong>{preview.customer || preview.licensee}</strong>
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '8px 0', borderTop: '1px dashed #93c5fd',
                }}>
                  <span style={{ color: '#1e40af' }}>Total Duration</span>
                  <strong style={{ color: '#1e40af' }}>
                    {daysBetween(preview.validFrom, preview.validUntil)} days
                  </strong>
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '8px 0', borderTop: '1px dashed #93c5fd',
                }}>
                  <span style={{ color: '#1e40af' }}>Serial</span>
                  <strong style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                    {preview.serial}
                  </strong>
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '8px 0', borderTop: '1px dashed #93c5fd',
                  alignItems: 'center',
                }}>
                  <span style={{ color: '#1e40af' }}>Features</span>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {(preview.features || []).map(f => (
                      <span key={f} style={{
                        padding: '2px 8px', background: 'white',
                        color: '#1e40af', borderRadius: 12,
                        fontSize: '0.68rem', fontWeight: 700,
                      }}>{f}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={upload}
            disabled={uploading || !file || !!previewError}
            className="btn btn-blue"
            style={{ padding: '12px 24px', fontSize: '0.9rem' }}
          >
            {uploading ? (
              <><i className="fas fa-spinner fa-spin"></i> Installing...</>
            ) : (
              <><i className="fas fa-check"></i> Install License</>
            )}
          </button>
        </div>
      </div>
    </>
  )
}
