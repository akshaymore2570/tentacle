import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api'

export default function BatchData({ showToast }) {
  const { id } = useParams()
  const navigate = useNavigate()

  const [batch, setBatch] = useState(null)
  const [stats, setStats] = useState(null)
  const [leads, setLeads] = useState({ rows: [], total: 0, page: 1, pages: 1 })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  const load = async () => {
    setLoading(true)
    try {
      const [b, s, l] = await Promise.all([
        api.get(`/batches/${id}`),
        api.get(`/batches/${id}/stats`).catch(() => ({ data: null })),
        api.get(`/batches/${id}/leads?page=${page}&size=25`).catch(() => ({ data: { rows: [], total: 0, page: 1, pages: 1 } })),
      ])
      setBatch(b.data)
      setStats(s.data)
      setLeads(l.data)
    } catch {
      showToast && showToast('Batch not found')
      navigate('/batch-maintenance/list')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id, page])

  const doAction = async (action) => {
    const msgs = {
      activate: `Activate this batch? Leads will be loaded into the dial queue.`,
      inactive: `Deactivate this batch? All its leads will be removed.`,
      pause: `Pause this batch?`,
      resume: `Resume this batch?`,
    }
    if (!confirm(msgs[action] || `Proceed?`)) return

    try {
      const { data } = await api.post(`/batches/${id}/${action}`)
      showToast && showToast(data.message || `${action} done`)
      load()
    } catch (e) {
      showToast && showToast(e.response?.data?.error || `Could not ${action}`)
    }
  }

  const statusStyle = (s) => {
    switch (s) {
      case 'active':    return { bg: '#d1fae5', color: '#047857', label: 'Active' }
      case 'paused':    return { bg: '#fef3c7', color: '#a16207', label: 'Paused' }
      case 'inactive':  return { bg: '#fee2e2', color: '#b91c1c', label: 'Inactive' }
      case 'completed': return { bg: '#dbeafe', color: '#1e40af', label: 'Completed' }
      default:          return { bg: '#f1f5f9', color: '#64748b', label: 'Draft' }
    }
  }

  if (loading) return <p style={{ padding: 30 }}>Loading...</p>
  if (!batch) return null

  const sc = statusStyle(batch.status)

  const fmtCell = (v) => {
    if (v === null || v === undefined) return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>
    if (typeof v === 'object') return JSON.stringify(v)
    return String(v)
  }

  const statCards = [
    { label: 'Total', value: stats?.total || 0, color: '#3b82f6' },
    { label: 'Pending', value: stats?.pending || 0, color: '#f59e0b' },
    { label: 'Called', value: stats?.called || 0, color: '#8b5cf6' },
    { label: 'Completed', value: stats?.completed || 0, color: '#10b981' },
  ]

  return (
    <div style={{ padding: '24px 40px 60px', background: 'var(--bg)', minHeight: '100%' }}>

      <div className="breadcrumb">
        <a onClick={() => navigate('/batch-maintenance')}>Batch Maintenance</a>
        <span className="sep">›</span>
        <a onClick={() => navigate('/batch-maintenance/list')}>Batch List</a>
        <span className="sep">›</span>
        <span className="current">{batch.name}</span>
      </div>

      {/* Header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: 24, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
            <i className="fas fa-layer-group" style={{ color: 'var(--primary)', marginRight: 10 }}></i>
            {batch.name}
          </h1>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            <span style={{
              padding: '3px 10px', borderRadius: 20,
              background: sc.bg, color: sc.color,
              fontSize: '0.72rem', fontWeight: 700,
            }}>{sc.label}</span>
            {batch.campaignName && (
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <i className="fas fa-bullhorn"></i> {batch.campaignName}
              </span>
            )}
            {batch.subCampaign && (
              <span style={{
                padding: '3px 10px', borderRadius: 20,
                background: 'var(--primary-light)', color: 'var(--primary)',
                fontSize: '0.72rem', fontWeight: 700,
              }}>{batch.subCampaign}</span>
            )}
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <i className="fas fa-flag"></i> Priority P{batch.priority}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {batch.status === 'draft' && (
            <button onClick={() => doAction('activate')} style={btnPrimary('#10b981')}>
              <i className="fas fa-play"></i> Activate
            </button>
          )}
          {batch.status === 'active' && (
            <>
              <button onClick={() => doAction('pause')} style={btnPrimary('#f59e0b')}>
                <i className="fas fa-pause"></i> Pause
              </button>
              <button onClick={() => doAction('inactive')} style={btnPrimary('#ef4444')}>
                <i className="fas fa-stop"></i> Inactivate
              </button>
            </>
          )}
          {batch.status === 'paused' && (
            <>
              <button onClick={() => doAction('resume')} style={btnPrimary('#10b981')}>
                <i className="fas fa-play"></i> Resume
              </button>
              <button onClick={() => doAction('inactive')} style={btnPrimary('#ef4444')}>
                <i className="fas fa-stop"></i> Inactivate
              </button>
            </>
          )}
          {batch.status === 'inactive' && (
            <button onClick={() => doAction('activate')} style={btnPrimary('#10b981')}>
              <i className="fas fa-redo"></i> Re-activate
            </button>
          )}
          <button onClick={() => navigate(`/batch-maintenance/${batch.id}/edit`)} style={btnGrey()}>
            <i className="fas fa-pen"></i> Edit
          </button>
          <button onClick={load} style={btnGrey()}>
            <i className="fas fa-sync-alt"></i> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 14, marginBottom: 24,
      }}>
        {statCards.map(s => (
          <div key={s.label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 10, padding: 18,
          }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: 0.5 }}>
              {s.label}
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color, marginTop: 4 }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Leads table */}
      <div style={{
        background: 'var(--surface)', borderRadius: 12,
        border: '1px solid var(--border)', overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--border)',
          background: 'var(--primary-light)',
          fontSize: '0.82rem', fontWeight: 700, color: 'var(--primary)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span>
            <i className="fas fa-users"></i> Leads ({leads.total})
          </span>
          {leads.pages > 1 && (
            <span style={{ fontSize: '0.75rem', fontWeight: 500 }}>
              Page {leads.page} of {leads.pages}
            </span>
          )}
        </div>

        {leads.rows.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fas fa-inbox" style={{ fontSize: '2.5rem', opacity: 0.25, marginBottom: 12, display: 'block' }}></i>
            <p style={{ fontSize: '0.9rem', marginBottom: 6 }}>
              {batch.status === 'draft' ? 'Batch not activated yet' : 'No leads in this batch'}
            </p>
            <p style={{ fontSize: '0.82rem' }}>
              {batch.status === 'draft' ? 'Click "Activate" to load leads' : ''}
            </p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ background: '#fafcff', borderBottom: '2px solid var(--border)' }}>
                  <th style={th}>#</th>
                  <th style={th}>Phone</th>
                  <th style={th}>Status</th>
                  <th style={th}>Attempts</th>
                  <th style={th}>Last Dial</th>
                  <th style={th}>Disposition</th>
                </tr>
              </thead>
              <tbody>
                {leads.rows.map(row => (
                  <tr key={row._id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={td}>{row._id}</td>
                    <td style={td}>{row._phone || '—'}</td>
                    <td style={td}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 20,
                        fontSize: '0.7rem', fontWeight: 700,
                        background: row._dialStatus === 'pending' ? '#fef3c7' : '#e0e7ff',
                        color: row._dialStatus === 'pending' ? '#a16207' : '#3730a3',
                      }}>{row._dialStatus}</span>
                    </td>
                    <td style={td}>{row._attempts || 0}</td>
                    <td style={td}>{row._lastDialAt ? new Date(row._lastDialAt).toLocaleString() : '—'}</td>
                    <td style={td}>{row._lastDisposition || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {leads.pages > 1 && (
          <div style={{
            padding: 14, borderTop: '1px solid var(--border)',
            display: 'flex', justifyContent: 'center', gap: 8,
          }}>
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              style={pageBtn(page <= 1)}>
              <i className="fas fa-chevron-left"></i> Prev
            </button>
            <span style={{ padding: '8px 16px', fontSize: '0.82rem', fontWeight: 700 }}>
              {page} / {leads.pages}
            </span>
            <button disabled={page >= leads.pages} onClick={() => setPage(p => p + 1)}
              style={pageBtn(page >= leads.pages)}>
              Next <i className="fas fa-chevron-right"></i>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

const th = {
  padding: '12px 14px', textAlign: 'left',
  fontSize: '0.7rem', fontWeight: 800,
  textTransform: 'uppercase', color: 'var(--text-muted)',
  letterSpacing: 0.5, whiteSpace: 'nowrap',
}
const td = {
  padding: '10px 14px',
  maxWidth: 250, overflow: 'hidden',
  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
}

function btnPrimary(bg) {
  return {
    padding: '9px 18px', border: 'none', borderRadius: 8,
    background: bg, color: 'white', fontWeight: 700,
    fontSize: '0.82rem', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 6,
  }
}
function btnGrey() {
  return {
    padding: '9px 18px', border: '1px solid var(--border)', borderRadius: 8,
    background: 'var(--surface)', color: 'var(--text)', fontWeight: 600,
    fontSize: '0.82rem', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 6,
  }
}
function pageBtn(disabled) {
  return {
    padding: '8px 16px', border: '1px solid var(--border)',
    background: 'var(--surface)', color: 'var(--text)',
    borderRadius: 6, fontWeight: 600, fontSize: '0.82rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    display: 'inline-flex', alignItems: 'center', gap: 6,
  }
}
