import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export default function DispositionsList({ showToast }) {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [churnFilter, setChurnFilter] = useState('all')

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (churnFilter !== 'all') params.append('churnType', churnFilter)
      if (search) params.append('search', search)
      const { data } = await api.get(`/dispositions?${params.toString()}`)
      setItems(data)
    } catch {
      showToast && showToast('Could not load dispositions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [statusFilter, churnFilter])
  useEffect(() => {
    const t = setTimeout(() => load(), 300)
    return () => clearTimeout(t)
  }, [search])

  const remove = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return
    try {
      await api.delete(`/dispositions/${id}`)
      showToast && showToast('Deleted')
      load()
    } catch {
      showToast && showToast('Delete failed')
    }
  }

  const stats = [
    { label: 'Total', value: items.length, color: '#3b82f6' },
    { label: 'Churn', value: items.filter(i => i.churnType === 'churn').length, color: '#ef4444' },
    { label: 'Non-Churn', value: items.filter(i => i.churnType === 'non-churn').length, color: '#10b981' },
    { label: 'Active', value: items.filter(i => i.status === 'ACTIVE').length, color: '#8b5cf6' },
  ]

  return (
    <div style={{ padding: '24px 32px 60px', background: 'var(--bg)', minHeight: '100%' }}>
      <div className="breadcrumb" style={{ padding: '0 0 16px' }}>
        <a onClick={() => navigate('/campaign')}>Campaign</a>
        <span className="sep">›</span>
        <span className="current">Dispositions</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>
            <i className="fas fa-clipboard-list" style={{ color: 'var(--primary)', marginRight: 12 }}></i>
            Dispositions
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', marginTop: 6 }}>
            Central list of dispositions used across all campaigns
          </p>
        </div>
        <button onClick={() => navigate('/dispositions/new')}
          style={{ padding: '11px 22px', border: 'none', borderRadius: 8, background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: 'white', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <i className="fas fa-plus"></i> New Disposition
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
        {stats.map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-muted)' }}>{s.label}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, marginBottom: 20, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div style={{ flex: '1 1 260px', minWidth: 200, position: 'relative' }}>
          <i className="fas fa-search" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}></i>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search dispositions..."
            style={{ width: '100%', padding: '10px 14px 10px 40px', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.88rem', outline: 'none', background: 'var(--surface)' }} />
        </div>
        <div style={{ width: 150 }}>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: 6 }}>Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.85rem', outline: 'none', background: 'var(--surface)' }}>
            <option value="all">All</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </div>
        <div style={{ width: 170 }}>
          <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, marginBottom: 6 }}>Churn</label>
          <select value={churnFilter} onChange={(e) => setChurnFilter(e.target.value)}
            style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: 8, fontSize: '0.85rem', outline: 'none', background: 'var(--surface)' }}>
            <option value="all">All</option>
            <option value="churn">Churn</option>
            <option value="non-churn">Non-Churn</option>
          </select>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fas fa-clipboard-list" style={{ fontSize: '3rem', opacity: 0.25, display: 'block', marginBottom: 16 }}></i>
            <h3 style={{ fontSize: '1.05rem', color: 'var(--text)', marginBottom: 6 }}>No dispositions yet</h3>
            <p style={{ fontSize: '0.85rem', marginBottom: 20 }}>Create your first disposition</p>
            <button onClick={() => navigate('/dispositions/new')}
              style={{ padding: '10px 22px', border: 'none', borderRadius: 8, background: 'linear-gradient(135deg, var(--primary), var(--primary-dark))', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
              <i className="fas fa-plus"></i> Create Disposition
            </button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--primary-light)', borderBottom: '2px solid var(--border)' }}>
                <th style={th}>Color</th>
                <th style={th}>Name</th>
                <th style={th}>Code</th>
                <th style={th}>Churn</th>
                <th style={th}>Status</th>
                <th style={{ ...th, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map(d => (
                <tr key={d.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={td}>
                    <div style={{ width: 24, height: 24, borderRadius: 6, background: d.color, border: '2px solid white', boxShadow: '0 0 0 1px var(--border)' }} />
                  </td>
                  <td style={{ ...td, fontWeight: 700, color: 'var(--text)' }}>{d.name}</td>
                  <td style={td}>{d.code ? <span style={{ fontFamily: 'monospace', background: 'var(--bg)', padding: '2px 8px', borderRadius: 4 }}>{d.code}</span> : '—'}</td>
                  <td style={td}>
                    <span style={{ padding: '3px 10px', borderRadius: 20, background: d.churnType === 'churn' ? '#fee2e2' : '#d1fae5', color: d.churnType === 'churn' ? '#991b1b' : '#047857', fontSize: '0.72rem', fontWeight: 700 }}>
                      {d.churnType === 'churn' ? 'Churn' : 'Non-Churn'}
                    </span>
                  </td>
                  <td style={td}>{d.status}</td>
                  <td style={{ ...td, textAlign: 'right' }}>
                    <button onClick={() => navigate(`/dispositions/${d.id}/edit`)}
                      style={{ width: 30, height: 30, border: 'none', borderRadius: 6, background: '#6366f118', color: '#6366f1', cursor: 'pointer', marginRight: 6 }}>
                      <i className="fas fa-pen" style={{ fontSize: '0.72rem' }}></i>
                    </button>
                    <button onClick={() => remove(d.id, d.name)}
                      style={{ width: 30, height: 30, border: 'none', borderRadius: 6, background: '#ef444418', color: '#ef4444', cursor: 'pointer' }}>
                      <i className="fas fa-trash" style={{ fontSize: '0.72rem' }}></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

const th = { padding: '13px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: 0.5 }
const td = { padding: '12px 16px', color: 'var(--text-muted)' }
