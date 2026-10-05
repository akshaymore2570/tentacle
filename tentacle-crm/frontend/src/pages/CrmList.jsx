import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export default function CrmList({ showToast }) {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)

  const load = async () => {
    try {
      const { data } = await api.get('/crm')
      setItems(data)
    } catch {
      showToast && showToast('Could not load CRM list')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openCreateModal = () => {
    setNewName('')
    setNewDesc('')
    setShowCreate(true)
  }

  const createNew = async () => {
    if (!newName.trim()) return showToast && showToast('Please enter a CRM name')
    setCreating(true)
    try {
      const { data } = await api.post('/crm', {
        name: newName.trim(),
        description: newDesc.trim() || 'New CRM design',
        fields: [],
        theme: {},
      })
      showToast && showToast(`CRM "${data.name}" created`)
      setShowCreate(false)
      navigate(`/crm/${data.id}`)
    } catch (e) {
      showToast && showToast(e.response?.data?.error || 'Could not create CRM')
    } finally {
      setCreating(false)
    }
  }

  const remove = async (id, name, e) => {
    e.stopPropagation()
    if (!confirm(`Delete "${name}"?`)) return
    try {
      await api.delete(`/crm/${id}`)
      showToast && showToast('CRM deleted')
      load()
    } catch {
      showToast && showToast('Delete failed')
    }
  }

  const fmtDate = (iso) => {
    if (!iso) return 'just now'
    try {
      const d = new Date(iso)
      const diff = (Date.now() - d.getTime()) / 1000
      if (diff < 60) return 'just now'
      if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
      if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`
      return d.toLocaleDateString()
    } catch { return '' }
  }

  return (
    <>
      <div className="breadcrumb">
        <a onClick={() => navigate('/campaign')}>Campaign</a>
        <span className="sep">›</span>
        <a>CRM</a>
      </div>

      <div className="page-header">
        <div>
          <h1><i className="fas fa-table"></i> CRM</h1>
          <p>Manage your CRM designs — create, edit, or delete</p>
        </div>
        <button className="btn-create-new" onClick={openCreateModal}>
          <i className="fas fa-plus"></i> Create New CRM
        </button>
      </div>

      <div className="crm-grid">
        {loading && <p style={{ color: 'var(--text-muted)' }}>Loading...</p>}

        {!loading && items.length === 0 && (
          <div style={{
            gridColumn: '1 / -1', textAlign: 'center', padding: '80px 20px',
            color: 'var(--text-muted)',
          }}>
            <i className="fas fa-folder-open" style={{
              fontSize: '3rem', color: 'var(--primary)', opacity: 0.25,
              display: 'block', marginBottom: 16,
            }}></i>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
              No CRM designs yet
            </h3>
            <p style={{ fontSize: '0.85rem', marginBottom: 20 }}>Create your first CRM form</p>
            <button className="btn-create-new" onClick={openCreateModal}>
              <i className="fas fa-plus"></i> Create New CRM
            </button>
          </div>
        )}

        {items.map((crm) => (
          <div key={crm.id} className="crm-card" onClick={() => navigate(`/crm/${crm.id}`)}>
            <div className="crm-card-actions">
              <button className="delete" title="Delete"
                onClick={(e) => { e.stopPropagation(); remove(crm.id, crm.name, e) }}>
                <i className="fas fa-trash"></i>
              </button>
            </div>
            <div className="crm-card-icon"><i className="fas fa-table"></i></div>
            <h3>{crm.name}</h3>
            <p>{crm.description}</p>
            <div className="crm-card-meta">
              <span className="field-badge">{crm.fieldCount || 0} fields</span>
              <span><i className="fas fa-clock"></i> {fmtDate(crm.lastEdited)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE CRM MODAL */}
      {showCreate && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(15,23,42,0.5)',
          backdropFilter: 'blur(6px)',
          zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20,
        }}
          onClick={() => !creating && setShowCreate(false)}>

          <div style={{
            background: 'var(--surface)',
            borderRadius: 14,
            width: '100%', maxWidth: 480,
            boxShadow: '0 24px 60px rgba(0,0,0,0.3)',
            overflow: 'hidden',
          }}
            onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div style={{
              padding: '18px 24px',
              background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
              color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: 'rgba(255,255,255,0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1rem',
                }}>
                  <i className="fas fa-table"></i>
                </div>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 700 }}>Create New CRM</div>
                  <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>Give your CRM a name to get started</div>
                </div>
              </div>
              <button
                onClick={() => !creating && setShowCreate(false)}
                style={{
                  width: 30, height: 30, border: 'none',
                  background: 'rgba(255,255,255,0.15)', color: 'white',
                  borderRadius: 8, cursor: 'pointer', fontSize: '0.8rem',
                }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{
                  display: 'block', fontSize: '0.78rem', fontWeight: 700,
                  color: 'var(--text)', marginBottom: 6,
                }}>
                  CRM Name <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createNew()}
                  placeholder="e.g. Customer Feedback Form"
                  style={{
                    width: '100%', padding: '11px 14px',
                    border: '1.5px solid var(--border)', borderRadius: 8,
                    fontSize: '0.9rem', outline: 'none',
                    background: 'var(--surface)', color: 'var(--text)',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              <div>
                <label style={{
                  display: 'block', fontSize: '0.78rem', fontWeight: 700,
                  color: 'var(--text)', marginBottom: 6,
                }}>
                  Description
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Short description (optional)"
                  rows={3}
                  style={{
                    width: '100%', padding: '11px 14px',
                    border: '1.5px solid var(--border)', borderRadius: 8,
                    fontSize: '0.88rem', outline: 'none', resize: 'vertical',
                    fontFamily: 'inherit',
                    background: 'var(--surface)', color: 'var(--text)',
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={(e) => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 24px',
              background: 'var(--bg)',
              borderTop: '1px solid var(--border)',
              display: 'flex', justifyContent: 'flex-end', gap: 10,
            }}>
              <button
                onClick={() => !creating && setShowCreate(false)}
                style={{
                  padding: '9px 22px', border: '1px solid var(--border)',
                  background: 'var(--surface)', color: 'var(--text)',
                  borderRadius: 8, fontWeight: 600, fontSize: '0.85rem',
                  cursor: 'pointer',
                }}>
                Cancel
              </button>
              <button
                onClick={createNew}
                disabled={creating || !newName.trim()}
                style={{
                  padding: '9px 26px', border: 'none',
                  background: (creating || !newName.trim()) ? '#94a3b8' : 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                  color: 'white', borderRadius: 8,
                  fontWeight: 700, fontSize: '0.85rem',
                  cursor: (creating || !newName.trim()) ? 'not-allowed' : 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  boxShadow: '0 2px 8px rgba(44,95,158,0.3)',
                }}>
                {creating
                  ? <><i className="fas fa-spinner fa-spin"></i> Creating...</>
                  : <><i className="fas fa-plus"></i> Create & Open</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
