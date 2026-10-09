import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api'

const COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#f59e0b',
  '#ef4444', '#ec4899', '#0d9488', '#6b7d91',
  '#e11d48', '#7c3aed', '#0891b2', '#65a30d',
]

export default function DispositionBuilder({ showToast }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = id && id !== 'new'

  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)

  const [form, setForm] = useState({
    name: '',
    code: '',
    description: '',
    churnType: 'non-churn',
    status: 'ACTIVE',
    color: '#6b7d91',
    sortOrder: 0,
  })

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    if (!isEdit) return
    api.get(`/dispositions/${id}`).then(({ data }) => {
      setForm({
        name: data.name || '',
        code: data.code || '',
        description: data.description || '',
        churnType: data.churnType || 'non-churn',
        status: data.status || 'ACTIVE',
        color: data.color || '#6b7d91',
        sortOrder: data.sortOrder || 0,
      })
    }).catch(() => {
      showToast && showToast('Not found')
      navigate('/dispositions')
    }).finally(() => setLoading(false))
  }, [id])

  const save = async () => {
    if (!form.name.trim()) return showToast && showToast('Name required')
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        code: form.code.trim(),
        description: form.description.trim(),
        churnType: form.churnType,
        status: form.status,
        color: form.color,
        sortOrder: parseInt(form.sortOrder) || 0,
      }
      if (isEdit) await api.put(`/dispositions/${id}`, payload)
      else await api.post('/dispositions', payload)
      showToast && showToast(isEdit ? 'Updated' : 'Created')
      navigate('/dispositions')
    } catch (e) {
      showToast && showToast(e.response?.data?.error || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <p style={{ padding: 30 }}>Loading...</p>

  const input = {
    width: '100%', padding: '11px 14px',
    border: '1px solid var(--border)', borderRadius: 8,
    fontSize: '0.9rem', outline: 'none',
    background: 'var(--surface)', color: 'var(--text)',
    fontFamily: 'inherit',
  }
  const label = {
    display: 'block', fontSize: '0.78rem', fontWeight: 700,
    color: 'var(--text)', marginBottom: 6,
  }
  const requiredStar = { color: 'var(--danger)' }

  return (
    <div style={{ padding: '20px 32px 60px', background: 'var(--bg)', minHeight: '100%' }}>

      {/* BREADCRUMB */}
      <div className="breadcrumb" style={{ padding: '0 0 14px' }}>
        <a onClick={() => navigate('/campaign')}>Campaign</a>
        <span className="sep">›</span>
        <a onClick={() => navigate('/dispositions')}>Dispositions</a>
        <span className="sep">›</span>
        <span className="current">{isEdit ? 'Edit' : 'New'}</span>
      </div>

      {/* HEADER */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 24, paddingBottom: 18, borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={() => navigate('/dispositions')}
            style={{
              width: 40, height: 40, border: '1px solid var(--border)',
              background: 'var(--surface)', color: 'var(--text)',
              borderRadius: 10, cursor: 'pointer', fontSize: '0.95rem',
            }}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <div>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>
              <i className="fas fa-clipboard-list" style={{ color: 'var(--primary)', marginRight: 10 }}></i>
              {isEdit ? 'Edit Disposition' : 'Create Disposition'}
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 4 }}>
              {isEdit ? 'Update disposition details' : 'Create a new disposition for use across campaigns'}
            </p>
          </div>
        </div>
        <button onClick={save} disabled={saving}
          style={{
            padding: '11px 28px', border: 'none', borderRadius: 8,
            background: saving ? '#94a3b8' : 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
            color: 'white', fontWeight: 700, fontSize: '0.9rem',
            cursor: saving ? 'not-allowed' : 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            boxShadow: '0 2px 8px rgba(44,95,158,0.35)',
          }}>
          {saving ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : <><i className="fas fa-save"></i> Save</>}
        </button>
      </div>

      {/* TWO COLUMN LAYOUT */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 380px',
        gap: 24,
        alignItems: 'flex-start',
      }}>

        {/* ============ LEFT: FORM ============ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* BASIC INFO CARD */}
          <div style={{
            background: 'var(--surface)', borderRadius: 14,
            border: '1px solid var(--border)', padding: 28,
          }}>
            <div style={{
              fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase',
              letterSpacing: 0.8, color: 'var(--primary)', marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 8,
              paddingBottom: 14, borderBottom: '1px solid var(--border)',
            }}>
              <i className="fas fa-circle-info"></i> Basic Information
            </div>

            <div style={{ display: 'grid', gap: 20 }}>
              <div>
                <label style={label}>Name <span style={requiredStar}>*</span></label>
                <input value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="e.g. Callback, Sale Done, Not Interested"
                  style={input} />
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Ye naam agent ke dialer me dikhega
                </div>
              </div>

              <div>
                <label style={label}>
                  Code
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, marginLeft: 6 }}>
                    (unique, optional)
                  </span>
                </label>
                <input value={form.code}
                  onChange={(e) => update('code', e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                  placeholder="e.g. CB, SOLD, NI"
                  style={{ ...input, fontFamily: 'monospace' }} />
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                  Short code for reports aur export
                </div>
              </div>

              <div>
                <label style={label}>Description</label>
                <textarea value={form.description}
                  onChange={(e) => update('description', e.target.value)}
                  placeholder="Optional description..."
                  rows={3}
                  style={{ ...input, resize: 'vertical', minHeight: 80 }} />
              </div>
            </div>
          </div>

          {/* CHURN TYPE CARD */}
          <div style={{
            background: 'var(--surface)', borderRadius: 14,
            border: '1px solid var(--border)', padding: 28,
          }}>
            <div style={{
              fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase',
              letterSpacing: 0.8, color: 'var(--primary)', marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 8,
              paddingBottom: 14, borderBottom: '1px solid var(--border)',
            }}>
              <i className="fas fa-flag"></i> Churn Classification
            </div>

            <label style={label}>Churn Type <span style={requiredStar}>*</span></label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 6 }}>
              <label style={{
                padding: 18, borderRadius: 12, cursor: 'pointer',
                border: `2px solid ${form.churnType === 'churn' ? '#ef4444' : 'var(--border)'}`,
                background: form.churnType === 'churn' ? '#fee2e2' : 'var(--surface)',
                transition: 'all 0.15s',
                display: 'flex', gap: 12, alignItems: 'flex-start',
              }}>
                <input type="radio" checked={form.churnType === 'churn'}
                  onChange={() => update('churnType', 'churn')}
                  style={{ marginTop: 3 }} />
                <div>
                  <div style={{
                    fontWeight: 800, fontSize: '0.95rem',
                    color: form.churnType === 'churn' ? '#991b1b' : 'var(--text)',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <i className="fas fa-times-circle"></i>
                    Churn
                  </div>
                  <div style={{ fontSize: '0.75rem', color: form.churnType === 'churn' ? '#991b1b' : 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
                    Customer left / cancelled / unhappy
                  </div>
                </div>
              </label>

              <label style={{
                padding: 18, borderRadius: 12, cursor: 'pointer',
                border: `2px solid ${form.churnType === 'non-churn' ? '#10b981' : 'var(--border)'}`,
                background: form.churnType === 'non-churn' ? '#d1fae5' : 'var(--surface)',
                transition: 'all 0.15s',
                display: 'flex', gap: 12, alignItems: 'flex-start',
              }}>
                <input type="radio" checked={form.churnType === 'non-churn'}
                  onChange={() => update('churnType', 'non-churn')}
                  style={{ marginTop: 3 }} />
                <div>
                  <div style={{
                    fontWeight: 800, fontSize: '0.95rem',
                    color: form.churnType === 'non-churn' ? '#047857' : 'var(--text)',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <i className="fas fa-check-circle"></i>
                    Non-Churn
                  </div>
                  <div style={{ fontSize: '0.75rem', color: form.churnType === 'non-churn' ? '#047857' : 'var(--text-muted)', marginTop: 4, lineHeight: 1.4 }}>
                    Customer retained / happy / interested
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* APPEARANCE CARD */}
          <div style={{
            background: 'var(--surface)', borderRadius: 14,
            border: '1px solid var(--border)', padding: 28,
          }}>
            <div style={{
              fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase',
              letterSpacing: 0.8, color: 'var(--primary)', marginBottom: 20,
              display: 'flex', alignItems: 'center', gap: 8,
              paddingBottom: 14, borderBottom: '1px solid var(--border)',
            }}>
              <i className="fas fa-palette"></i> Appearance & Settings
            </div>

            <div style={{ display: 'grid', gap: 20 }}>
              <div>
                <label style={label}>Status</label>
                <select value={form.status} onChange={(e) => update('status', e.target.value)} style={input}>
                  <option value="ACTIVE">ACTIVE — Available for selection</option>
                  <option value="INACTIVE">INACTIVE — Hidden from agents</option>
                </select>
              </div>

              <div>
                <label style={label}>Color</label>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
                  <label style={{
                    width: 60, height: 60, borderRadius: 12,
                    background: form.color, cursor: 'pointer',
                    border: '3px solid white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.15), 0 0 0 1px var(--border)',
                    position: 'relative', flexShrink: 0,
                  }}>
                    <input type="color" value={form.color}
                      onChange={(e) => update('color', e.target.value)}
                      style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                    <i className="fas fa-eyedropper" style={{
                      position: 'absolute', bottom: 4, right: 4,
                      fontSize: '0.7rem', color: 'white',
                      textShadow: '0 0 3px rgba(0,0,0,0.7)',
                    }}></i>
                  </label>
                  {COLORS.map(c => (
                    <div key={c} onClick={() => update('color', c)}
                      title={c}
                      style={{
                        width: 38, height: 38, borderRadius: 10, background: c,
                        cursor: 'pointer',
                        border: form.color === c ? '3px solid var(--text)' : '2px solid white',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.15), 0 0 0 1px var(--border)',
                        transition: 'transform 0.15s',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label style={label}>
                  Sort Order
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, marginLeft: 6 }}>
                    (lower = first in list)
                  </span>
                </label>
                <input type="number" value={form.sortOrder}
                  onChange={(e) => update('sortOrder', e.target.value)}
                  placeholder="0"
                  style={{ ...input, maxWidth: 200 }} />
              </div>
            </div>
          </div>

        </div>

        {/* ============ RIGHT: PREVIEW & TIPS ============ */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, position: 'sticky', top: 20 }}>

          {/* LIVE PREVIEW */}
          <div style={{
            background: 'var(--surface)', borderRadius: 14,
            border: '1px solid var(--border)', overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 20px', borderBottom: '1px solid var(--border)',
              background: 'linear-gradient(135deg, var(--primary-light), var(--surface))',
              fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase',
              letterSpacing: 0.8, color: 'var(--primary)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <i className="fas fa-eye"></i> Live Preview
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 10, fontWeight: 600 }}>
                <i className="fas fa-phone"></i> Agent ke dialer me aise dikhega:
              </div>

              {/* Agent dropdown preview */}
              <div style={{
                border: '2px solid var(--border)', borderRadius: 10, padding: 14,
                background: 'var(--bg)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, background: form.color,
                    border: '2px solid white', boxShadow: '0 0 0 1px var(--border)',
                    flexShrink: 0,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '0.92rem', fontWeight: 700, color: 'var(--text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {form.name || <span style={{ opacity: 0.4, fontStyle: 'italic' }}>Disposition name</span>}
                    </div>
                    {form.code && (
                      <div style={{
                        fontSize: '0.72rem', fontFamily: 'monospace',
                        color: 'var(--primary)', marginTop: 2,
                      }}>{form.code}</div>
                    )}
                  </div>
                  <span style={{
                    padding: '3px 10px', borderRadius: 20,
                    background: form.churnType === 'churn' ? '#fee2e2' : '#d1fae5',
                    color: form.churnType === 'churn' ? '#991b1b' : '#047857',
                    fontSize: '0.68rem', fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}>
                    {form.churnType === 'churn' ? 'Churn' : 'Non-Churn'}
                  </span>
                </div>
                {form.description && (
                  <div style={{
                    fontSize: '0.78rem', color: 'var(--text-muted)',
                    marginTop: 10, paddingTop: 10,
                    borderTop: '1px dashed var(--border)', lineHeight: 1.4,
                  }}>
                    {form.description}
                  </div>
                )}
              </div>

              {form.status === 'INACTIVE' && (
                <div style={{
                  marginTop: 12, padding: '10px 14px',
                  background: '#fee2e2', border: '1px solid #fecaca',
                  borderRadius: 8, fontSize: '0.78rem', color: '#991b1b',
                  fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <i className="fas fa-exclamation-triangle"></i>
                  Inactive — agents ko nahi dikhega
                </div>
              )}
            </div>
          </div>

          {/* TIPS */}
          <div style={{
            background: 'var(--surface)', borderRadius: 14,
            border: '1px solid var(--border)', padding: 20,
          }}>
            <div style={{
              fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase',
              letterSpacing: 0.8, color: 'var(--primary)', marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <i className="fas fa-lightbulb"></i> Tips
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { icon: 'fa-tag', text: 'Name clear aur short rakho — agents ko fast select karna hoga' },
                { icon: 'fa-flag', text: 'Churn type sahi select karo — reports me matter karta hai' },
                { icon: 'fa-palette', text: 'Har disposition ka alag color use karo — visually alag dikhega' },
                { icon: 'fa-sort-numeric-up', text: 'Sort order se control karo konsa pehle dikhe' },
              ].map((t, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 10, alignItems: 'flex-start',
                  fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.5,
                }}>
                  <div style={{
                    width: 26, height: 26, borderRadius: 8, flexShrink: 0,
                    background: 'var(--primary-light)', color: 'var(--primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.7rem',
                  }}>
                    <i className={`fas ${t.icon}`}></i>
                  </div>
                  <span>{t.text}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>

      {/* FOOTER ACTIONS */}
      <div style={{
        display: 'flex', justifyContent: 'flex-end', gap: 10,
        marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border)',
      }}>
        <button onClick={() => navigate('/dispositions')}
          style={{
            padding: '11px 26px', border: '1px solid var(--border)',
            background: 'var(--surface)', color: 'var(--text)',
            borderRadius: 8, fontWeight: 600, cursor: 'pointer',
            fontSize: '0.88rem',
          }}>
          Cancel
        </button>
        <button onClick={save} disabled={saving}
          style={{
            padding: '11px 32px', border: 'none',
            background: saving ? '#94a3b8' : 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
            color: 'white', borderRadius: 8, fontWeight: 700,
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '0.88rem',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            boxShadow: '0 2px 8px rgba(44,95,158,0.35)',
          }}>
          {saving ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : <><i className="fas fa-check"></i> {isEdit ? 'Update Disposition' : 'Create Disposition'}</>}
        </button>
      </div>

    </div>
  )
}
