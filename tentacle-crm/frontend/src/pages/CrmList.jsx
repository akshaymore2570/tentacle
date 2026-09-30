import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export default function CrmList({ showToast }) {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const { data } = await api.get('/crm')
      setItems(data)
    } catch (e) {
      showToast && showToast('Failed to load CRM list')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const createNew = async () => {
    try {
      const { data } = await api.post('/crm', {
        name: 'Untitled CRM',
        description: 'New CRM design — click to edit',
        fields: [],
        theme: {},
      })
      showToast && showToast('New CRM created')
      navigate(`/crm/${data.id}`)
    } catch (e) {
      showToast && showToast('Create failed')
    }
  }

  const remove = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return
    try {
      await api.delete(`/crm/${id}`)
      showToast && showToast('CRM deleted')
      load()
    } catch (e) {
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
        <button className="btn-create-new" onClick={createNew}>
          <i className="fas fa-plus"></i> Create New CRM
        </button>
      </div>

      <div className="crm-grid">
        {loading && <p style={{ color: 'var(--text-muted)' }}>Loading...</p>}

        {!loading && items.length === 0 && (
          <div style={{
            gridColumn: '1 / -1', textAlign: 'center', padding: '80px 20px',
            color: 'var(--text-muted)'
          }}>
            <i className="fas fa-folder-open" style={{
              fontSize: '3rem', color: 'var(--primary)', opacity: 0.25,
              display: 'block', marginBottom: 16
            }}></i>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
              No CRM designs yet
            </h3>
            <p style={{ fontSize: '0.85rem', marginBottom: 20 }}>Create your first CRM form</p>
            <button className="btn-create-new" onClick={createNew}>
              <i className="fas fa-plus"></i> Create New CRM
            </button>
          </div>
        )}

        {items.map((crm) => (
          <div key={crm.id} className="crm-card" onClick={() => navigate(`/crm/${crm.id}`)}>
            <div className="crm-card-actions">
              <button
                className="delete"
                title="Delete"
                onClick={(e) => { e.stopPropagation(); remove(crm.id, crm.name) }}
              >
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
    </>
  )
}
