import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export default function CampaignList({ showToast }) {
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const load = async () => {
    try {
      const { data } = await api.get('/ten-campaigns')
      setCampaigns(data)
    } catch {
      showToast && showToast('Could not load campaigns')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const remove = async (id, name, e) => {
    e.stopPropagation()
    if (!confirm('Delete campaign "' + name + '"?')) return
    try {
      await api.delete('/ten-campaigns/' + id)
      showToast && showToast('Campaign deleted')
      load()
    } catch {
      showToast && showToast('Could not delete')
    }
  }

  const filtered = campaigns.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  )

  const statusColor = (s) => {
    if (s === 'ACTIVE') return { bg: '#d1fae5', color: '#047857' }
    if (s === 'PAUSED') return { bg: '#fef3c7', color: '#a16207' }
    return { bg: '#f1f5f9', color: '#64748b' }
  }

  return (
    <div style={{ padding: '20px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700 }}>
            <i className="fas fa-bullhorn" style={{ color: 'var(--primary)', marginRight: 10 }}></i>
            Campaigns
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 4 }}>
            Manage your outbound campaigns
          </p>
        </div>
        <button className="btn-create-new" onClick={() => navigate('/campaigns/new')}>
          <i className="fas fa-plus"></i> New Campaign
        </button>
      </div>

      <div style={{ marginBottom: 20, maxWidth: 400, position: 'relative' }}>
        <i className="fas fa-search" style={{
          position: 'absolute', left: 14, top: '50%',
          transform: 'translateY(-50%)', color: 'var(--text-muted)',
        }}></i>
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search campaigns..."
          style={{
            width: '100%', padding: '10px 14px 10px 40px',
            border: '1px solid var(--border)', borderRadius: 8,
            fontSize: '0.88rem', outline: 'none',
            background: 'var(--surface)', color: 'var(--text)',
          }} />
      </div>

      {loading && <p style={{ color: 'var(--text-muted)' }}>Loading...</p>}

      {!loading && filtered.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '80px 20px',
          background: 'var(--surface)', borderRadius: 14,
          border: '1px solid var(--border)', color: 'var(--text-muted)',
        }}>
          <i className="fas fa-bullhorn" style={{ fontSize: '3rem', opacity: 0.25, marginBottom: 16, display: 'block' }}></i>
          <h3 style={{ fontSize: '1.05rem', color: 'var(--text)', marginBottom: 6 }}>No campaigns yet</h3>
          <p style={{ fontSize: '0.85rem', marginBottom: 20 }}>Create your first campaign to get started</p>
          <button className="btn-create-new" onClick={() => navigate('/campaigns/new')}>
            <i className="fas fa-plus"></i> Create First Campaign
          </button>
        </div>
      )}

      {filtered.length > 0 && (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 12, overflow: 'hidden',
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--primary-light)', borderBottom: '2px solid var(--border)' }}>
                <th style={{ padding: '13px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Name</th>
                <th style={{ padding: '13px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Description</th>
                <th style={{ padding: '13px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Status</th>
                <th style={{ padding: '13px 16px', textAlign: 'left', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>CRM</th>
                <th style={{ padding: '13px 16px', width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const sc = statusColor(c.status)
                return (
                  <tr key={c.id}
                    style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                    onClick={() => navigate('/campaigns/' + c.id)}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--primary-light)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '14px 16px', fontWeight: 700 }}>
                      <i className="fas fa-bullhorn" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
                      {c.name}
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>
                      {c.description || '—'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20,
                        fontSize: '0.72rem', fontWeight: 700,
                        background: sc.bg, color: sc.color,
                      }}>{c.status}</span>
                    </td>
                    <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                      {c.crmName || '—'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <button onClick={(e) => remove(c.id, c.name, e)}
                        style={{
                          width: 30, height: 30, border: '1px solid var(--border)',
                          background: 'var(--surface)', color: 'var(--danger)',
                          borderRadius: 6, cursor: 'pointer',
                        }}>
                        <i className="fas fa-trash" style={{ fontSize: '0.75rem' }}></i>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
