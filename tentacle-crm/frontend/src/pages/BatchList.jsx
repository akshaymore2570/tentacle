import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../api'

export default function BatchList({ showToast }) {
  const navigate = useNavigate()
  const location = useLocation()

  const filterMode = location.pathname.includes('/active')
    ? 'active'
    : location.pathname.includes('/history')
      ? 'history'
      : 'all'

  const [batches, setBatches] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const url = filterMode === 'all' ? '/batches' : `/batches?status=${filterMode}`
      const { data } = await api.get(url)
      setBatches(data)
    } catch {
      showToast && showToast('Could not load batches')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [location.pathname])

  const doAction = async (action, id, name) => {
    const msgs = {
      activate: `Activate batch "${name}"?`,
      inactive: `Deactivate "${name}"? Leads will be removed.`,
      pause: `Pause "${name}"?`,
      resume: `Resume "${name}"?`,
      delete: `Delete batch "${name}" permanently?`,
    }
    if (!confirm(msgs[action] || `Proceed with ${action}?`)) return

    try {
      if (action === 'delete') {
        await api.delete(`/batches/${id}`)
        showToast && showToast('Batch deleted')
      } else {
        const { data } = await api.post(`/batches/${id}/${action}`)
        showToast && showToast(data.message || `${action} done`)
      }
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

  const priorityLabel = (p) => ['', 'P1 · Highest', 'P2 · High', 'P3 · Normal', 'P4 · Low', 'P5 · Lowest'][p] || `P${p}`

  const titles = {
    all: { title: 'Batch List', desc: 'All batches', icon: 'fa-list' },
    active: { title: 'Active Batches', desc: 'Currently dialing', icon: 'fa-play-circle' },
    history: { title: 'Batch History', desc: 'Inactive and completed', icon: 'fa-history' },
  }
  const t = titles[filterMode]

  return (
    <>
      <div className="breadcrumb">
        <a onClick={() => navigate('/batch-maintenance')}>Batch Maintenance</a>
        <span className="sep">›</span>
        <span className="current">{t.title}</span>
      </div>

      <div className="page-header">
        <div>
          <h1><i className={`fas ${t.icon}`}></i> {t.title}</h1>
          <p>{t.desc}</p>
        </div>
        <button className="btn-create-new" onClick={() => navigate('/batch-maintenance/create')}>
          <i className="fas fa-plus"></i> New Batch
        </button>
      </div>

      <div style={{ padding: '0 32px 40px' }}>
        {loading && <p style={{ color: 'var(--text-muted)' }}>Loading...</p>}

        {!loading && batches.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '80px 20px',
            background: 'var(--surface)', borderRadius: 14,
            border: '1px solid var(--border)', color: 'var(--text-muted)',
          }}>
            <i className="fas fa-layer-group" style={{ fontSize: '3rem', color: 'var(--primary)', opacity: 0.25, display: 'block', marginBottom: 16 }}></i>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
              No batches yet
            </h3>
            <p style={{ fontSize: '0.85rem', marginBottom: 20 }}>
              Create your first batch to get started
            </p>
            <button className="btn-create-new" onClick={() => navigate('/batch-maintenance/create')}>
              <i className="fas fa-plus"></i> Create First Batch
            </button>
          </div>
        )}

        {batches.length > 0 && (
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, overflow: 'hidden',
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: 'var(--primary-light)', borderBottom: '2px solid var(--border)' }}>
                    {['Name', 'Campaign', 'Sub-Campaign', 'Priority', 'Status', 'Records', 'Actions'].map(h => (
                      <th key={h} style={{
                        padding: '13px 16px', textAlign: 'left',
                        fontSize: '0.72rem', fontWeight: 800,
                        textTransform: 'uppercase', color: 'var(--text-muted)',
                        letterSpacing: 0.5, whiteSpace: 'nowrap',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {batches.map(b => {
                    const sc = statusStyle(b.status)
                    return (
                      <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: 'var(--text)' }}>
                          <div style={{ cursor: 'pointer' }} onClick={() => navigate(`/batch-maintenance/${b.id}`)}>
                            <i className="fas fa-layer-group" style={{ color: 'var(--primary)', marginRight: 8 }}></i>
                            {b.name}
                          </div>
                        </td>
                        <td style={{ padding: '14px 16px', color: 'var(--text-muted)' }}>{b.campaignName || '—'}</td>
                        <td style={{ padding: '14px 16px' }}>
                          {b.subCampaign ? (
                            <span style={{
                              padding: '3px 10px', borderRadius: 20,
                              background: 'var(--primary-light)', color: 'var(--primary)',
                              fontSize: '0.72rem', fontWeight: 700,
                            }}>{b.subCampaign}</span>
                          ) : '—'}
                        </td>
                        <td style={{ padding: '14px 16px', fontSize: '0.78rem' }}>
                          {priorityLabel(b.priority)}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 20,
                            background: sc.bg, color: sc.color,
                            fontSize: '0.72rem', fontWeight: 700,
                          }}>{sc.label}</span>
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <strong>{(b.totalRecords || 0).toLocaleString()}</strong>
                          {b.status === 'draft' && (b.totalRecords === 0) && (
                            <div style={{ fontSize: '0.68rem', color: 'var(--danger)', marginTop: 2 }}>
                              <i className="fas fa-exclamation-triangle"></i> No file
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {b.status === 'draft' && (b.totalRecords || b.uploadedRows || 0) > 0 && (
                              <button onClick={() => doAction('start', b.id, b.name)} style={btn('#10b981')} title="Start">
                                <i className="fas fa-play"></i>
                              </button>
                            )}
                            {b.status === 'draft' && !(b.totalRecords > 0) && (
                              <button
                                onClick={() => navigate(`/batch-maintenance/${b.id}/edit`)}
                                style={btn('#f59e0b')}
                                title="Upload file first">
                                <i className="fas fa-upload"></i>
                              </button>
                            )}
                            {b.status === 'active' && (
                              <>
                                <button onClick={() => doAction('restart', b.id, b.name)} style={btn('#8b5cf6')} title="Restart">
                                  <i className="fas fa-redo"></i>
                                </button>
                                <button onClick={() => doAction('stop', b.id, b.name)} style={btn('#ef4444')} title="Stop">
                                  <i className="fas fa-stop"></i>
                                </button>
                              </>
                            )}
                            {b.status === 'paused' && (
                              <>
                                <button onClick={() => doAction('resume', b.id, b.name)} style={btn('#10b981')} title="Resume">
                                  <i className="fas fa-play"></i>
                                </button>
                                <button onClick={() => doAction('stop', b.id, b.name)} style={btn('#ef4444')} title="Stop">
                                  <i className="fas fa-stop"></i>
                                </button>
                              </>
                            )}
                            {b.status === 'inactive' && (
                              <button onClick={() => doAction('start', b.id, b.name)} style={btn('#10b981')} title="Start">
                                <i className="fas fa-play"></i>
                              </button>
                            )}
                            <button onClick={() => navigate(`/batch-maintenance/${b.id}/edit`)} style={btn('#6366f1')} title="Edit">
                              <i className="fas fa-pen"></i>
                            </button>
                            <button onClick={() => doAction('delete', b.id, b.name)} style={btn('#ef4444')} title="Delete">
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function btn(bg) {
  return {
    width: 30, height: 30,
    border: 'none', borderRadius: 6,
    background: bg + '22', color: bg,
    cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '0.72rem',
  }
}
