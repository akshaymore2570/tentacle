import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export default function CrmTablesList({ showToast }) {
  const navigate = useNavigate()
  const [tables, setTables] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const { data } = await api.get('/crm-tables')
      setTables(data)
    } catch {
      showToast && showToast('Could not load tables')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const remove = async (id, name, e) => {
    e.stopPropagation()
    if (!confirm(`Delete "${name}"?\n\nAll data in this table will be permanently removed.`)) return
    try {
      await api.delete(`/crm-tables/${id}?drop=true`)
      showToast && showToast('Table deleted')
      load()
    } catch {
      showToast && showToast('Could not delete table')
    }
  }

  return (
    <>
      <div className="breadcrumb">
        <a onClick={() => navigate('/campaign')}>Campaign</a>
        <span className="sep">›</span>
        <a>Data Tables</a>
      </div>

      <div className="page-header">
        <div>
          <h1><i className="fas fa-database"></i> Data Tables</h1>
          <p>Create and manage tables that store your CRM form data</p>
        </div>
        <button className="btn-create-new" onClick={() => navigate('/crm-table/new')}>
          <i className="fas fa-plus"></i> New Table
        </button>
      </div>

      <div className="crm-grid">
        {loading && <p style={{ color: 'var(--text-muted)' }}>Loading...</p>}

        {!loading && tables.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '80px 20px', color: 'var(--text-muted)' }}>
            <i className="fas fa-database" style={{ fontSize: '3rem', color: 'var(--primary)', opacity: 0.25, display: 'block', marginBottom: 16 }}></i>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
              No data tables yet
            </h3>
            <p style={{ fontSize: '0.85rem', marginBottom: 20 }}>
              Create a table to store data from your CRM forms
            </p>
            <button className="btn-create-new" onClick={() => navigate('/crm-table/new')}>
              <i className="fas fa-plus"></i> Create First Table
            </button>
          </div>
        )}

        {tables.map((t) => (
          <div key={t.id} className="crm-card" onClick={() => navigate(`/crm-table/${t.id}`)}>
            <div className="crm-card-actions">
              <button className="delete" title="Delete table" onClick={(e) => remove(t.id, t.name, e)}>
                <i className="fas fa-trash"></i>
              </button>
            </div>
            <div className="crm-card-icon"><i className="fas fa-database"></i></div>
            <h3>{t.displayName || t.name}</h3>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6, minHeight: 32 }}>
              {t.description || `${(t.columns || []).length} column${(t.columns || []).length !== 1 ? 's' : ''}`}
            </p>
            <div className="crm-card-meta">
              <span className="field-badge">{(t.columns || []).length} columns</span>
              <span><i className="fas fa-list"></i> {t.rowCount || 0} rows</span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
