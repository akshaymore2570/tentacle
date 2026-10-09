import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../api'

export default function BatchMaintenance({ showToast }) {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ totalBatches: 0, activeBatches: 0, inactiveBatches: 0, totalRecords: 0 })
  const [batches, setBatches] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [campaignFilter, setCampaignFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Pagination
  const [page, setPage] = useState(1)
  const pageSize = 10

  const loadStats = async () => {
    try {
      const { data } = await api.get('/batches/stats')
      setStats(data)
    } catch {}
  }

  const loadBatches = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (search) params.append('search', search)
      if (campaignFilter) params.append('campaignId', campaignFilter)
      const { data } = await api.get(`/batches?${params.toString()}`)
      setBatches(data)
    } catch {
      showToast && showToast('Could not load batches')
    }
  }

  const loadCampaigns = async () => {
    try {
      const { data } = await api.get('/ten-campaigns').catch(() => ({ data: [] }))
      setCampaigns(data || [])
    } catch {}
  }

  useEffect(() => {
    (async () => {
      setLoading(true)
      await Promise.all([loadStats(), loadBatches(), loadCampaigns()])
      setLoading(false)
    })()
  }, [])

  useEffect(() => {
    loadBatches()
  }, [statusFilter, campaignFilter])

  const handleSearch = () => {
    setPage(1)
    loadBatches()
  }

  const resetFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setCampaignFilter('')
    setDateFrom('')
    setDateTo('')
    setPage(1)
    setTimeout(loadBatches, 0)
  }

  const doAction = async (action, id, name) => {
    const msgs = {
      start: `Start batch "${name}"?\n\nLeads will be loaded into the working table.`,
      stop: `Stop batch "${name}"?\n\nAll records will be removed from working table.`,
      restart: `Restart batch "${name}"?\n\nLeads will be reset and reloaded.`,
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
      await loadStats()
      await loadBatches()
    } catch (e) {
      showToast && showToast(e.response?.data?.error || `Could not ${action}`)
    }
  }

  const statusStyle = (s) => {
    switch (s) {
      case 'active':    return { bg: '#d1fae5', color: '#047857', dot: '#10b981', label: 'Active' }
      case 'paused':    return { bg: '#fef3c7', color: '#a16207', dot: '#f59e0b', label: 'Paused' }
      case 'inactive':  return { bg: '#f1f5f9', color: '#64748b', dot: '#94a3b8', label: 'Inactive' }
      case 'completed': return { bg: '#dbeafe', color: '#1e40af', dot: '#3b82f6', label: 'Completed' }
      default:          return { bg: '#f1f5f9', color: '#64748b', dot: '#94a3b8', label: 'Draft' }
    }
  }

  const fmtDate = (iso) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  }

  // Pagination
  const totalPages = Math.max(1, Math.ceil(batches.length / pageSize))
  const paged = batches.slice((page-1)*pageSize, page*pageSize)

  return (
    <div style={{ padding: '24px 32px 60px', background: 'var(--bg)', minHeight: '100%' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: '1.7rem', fontWeight: 800, margin: 0, color: 'var(--text)', letterSpacing: '-0.02em' }}>
            Dialer Batch Maintenance
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginTop: 6 }}>
            Create, manage and control dialer batches. Activate or deactivate batches as per your requirement.
          </p>
        </div>
        <button
          onClick={() => navigate('/batch-maintenance/create')}
          style={{
            padding: '11px 22px', border: 'none', borderRadius: 8,
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            color: 'white', fontWeight: 700, fontSize: '0.9rem',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(37,99,235,0.35)',
          }}
        >
          <i className="fas fa-plus"></i> Create New Batch
        </button>
      </div>

      {/* STATS CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: 16, marginBottom: 24,
      }}>
        <StatCard icon="fa-database" label="Total Batches" value={stats.totalBatches} color="#3b82f6" />
        <StatCard icon="fa-play-circle" label="Active Batches" value={stats.activeBatches} color="#10b981" />
        <StatCard icon="fa-pause-circle" label="Inactive Batches" value={stats.inactiveBatches} color="#ef4444" />
        <StatCard icon="fa-users" label="Total Records" value={stats.totalRecords.toLocaleString()} color="#8b5cf6" />
      </div>

      {/* FILTER BAR */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 16, marginBottom: 20,
        display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end',
      }}>
        {/* Search */}
        <div style={{ flex: '1 1 260px', minWidth: 200 }}>
          <div style={{ position: 'relative' }}>
            <i className="fas fa-search" style={{
              position: 'absolute', left: 14, top: '50%',
              transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.85rem',
            }}></i>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by Batch Name, Campaign, or ID..."
              style={{
                width: '100%', padding: '10px 14px 10px 40px',
                border: '1px solid var(--border)', borderRadius: 8,
                fontSize: '0.88rem', outline: 'none',
                background: 'var(--surface)', color: 'var(--text)',
              }}
            />
          </div>
        </div>

        {/* Status */}
        <FilterBlock label="Status" width="150px">
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
            style={selectStyle}
          >
            <option value="all">All</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="draft">Draft</option>
          </select>
        </FilterBlock>

        {/* Campaign */}
        <FilterBlock label="Campaign" width="180px">
          <select
            value={campaignFilter}
            onChange={(e) => { setCampaignFilter(e.target.value); setPage(1) }}
            style={selectStyle}
          >
            <option value="">All</option>
            {campaigns.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </FilterBlock>

        {/* Date Range */}
        <FilterBlock label="Created Date" width="230px">
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              style={{ ...selectStyle, padding: '9px 10px' }}
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              style={{ ...selectStyle, padding: '9px 10px' }}
            />
          </div>
        </FilterBlock>

        {/* Reset */}
        <button onClick={resetFilters}
          style={{
            padding: '10px 18px', border: '1px solid var(--border)',
            background: 'var(--surface)', color: 'var(--text)',
            borderRadius: 8, fontWeight: 600, fontSize: '0.85rem',
            cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
            height: 40,
          }}>
          <i className="fas fa-rotate-left"></i> Reset
        </button>
      </div>

      {/* BATCHES TABLE */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fas fa-spinner fa-spin"></i> Loading...
          </div>
        ) : batches.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fas fa-layer-group" style={{ fontSize: '3rem', opacity: 0.25, display: 'block', marginBottom: 16 }}></i>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
              No batches yet
            </h3>
            <p style={{ fontSize: '0.85rem', marginBottom: 20 }}>
              Create your first dialer batch to get started
            </p>
            <button
              onClick={() => navigate('/batch-maintenance/create')}
              style={{
                padding: '10px 22px', border: 'none', borderRadius: 8,
                background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                color: 'white', fontWeight: 700, fontSize: '0.88rem',
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
              }}>
              <i className="fas fa-plus"></i> Create New Batch
            </button>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#fafcff', borderBottom: '2px solid var(--border)' }}>
                    <th style={th}>#</th>
                    <th style={th}>Batch Name</th>
                    <th style={th}>Campaign</th>
                    <th style={th}>Total Records</th>
                    <th style={th}>Created Date</th>
                    <th style={th}>Status</th>
                    <th style={{ ...th, textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((b, idx) => {
                    const sc = statusStyle(b.status)
                    const rowNum = (page - 1) * pageSize + idx + 1
                    return (
                      <tr key={b.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={td}>{rowNum}</td>
                        <td style={{ ...td, fontWeight: 700, color: 'var(--text)' }}>
                          {b.name}
                        </td>
                        <td style={td}>{b.campaignName || '—'}</td>
                        <td style={{ ...td, fontWeight: 600 }}>
                          {(b.totalRecords || 0).toLocaleString()}
                        </td>
                        <td style={td}>{fmtDate(b.createdAt)}</td>
                        <td style={td}>
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '4px 12px', borderRadius: 20,
                            background: sc.bg, color: sc.color,
                            fontSize: '0.72rem', fontWeight: 700,
                          }}>
                            <span style={{
                              width: 7, height: 7, borderRadius: '50%',
                              background: sc.dot, display: 'inline-block',
                            }}></span>
                            {sc.label}
                          </span>
                        </td>
                        <td style={{ ...td, textAlign: 'center' }}>
                          <div style={{ display: 'inline-flex', gap: 6, flexWrap: 'wrap' }}>
                            <button onClick={() => navigate(`/batch-maintenance/${b.id}`)} style={btnView()} title="View">
                              <i className="fas fa-eye"></i> View
                            </button>
                            <button onClick={() => navigate(`/batch-maintenance/${b.id}/edit`)}
                              style={btnEdit()}
                              disabled={b.status === 'active'}
                              title="Edit">
                              <i className="fas fa-pen"></i> Edit
                            </button>
                            {b.status === 'active' || b.status === 'paused' ? (
                              <button onClick={() => doAction('stop', b.id, b.name)} style={btnStop()} title="Stop">
                                <i className="fas fa-stop"></i> Stop
                              </button>
                            ) : (
                              <button onClick={() => doAction('start', b.id, b.name)} style={btnStart()} title="Start">
                                <i className="fas fa-play"></i> Start
                              </button>
                            )}
                            {b.status === 'active' && (
                              <button onClick={() => doAction('restart', b.id, b.name)} style={btnRestart()} title="Restart">
                                <i className="fas fa-redo"></i>
                              </button>
                            )}
                            <button onClick={() => doAction('delete', b.id, b.name)} style={btnDelete()} title="Delete">
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

            {/* Pagination */}
            <div style={{
              padding: '14px 20px', borderTop: '1px solid var(--border)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              flexWrap: 'wrap', gap: 12,
            }}>
              <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                Showing {batches.length === 0 ? 0 : (page - 1) * pageSize + 1} to {Math.min(page * pageSize, batches.length)} of {batches.length} batches
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={pagBtn(page <= 1)}>
                  <i className="fas fa-chevron-left"></i>
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).slice(0, 5).map(p => (
                  <button key={p} onClick={() => setPage(p)} style={pagBtn(false, page === p)}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={pagBtn(page >= totalPages)}>
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Subcomponents ───

function StatCard({ icon, label, value, color }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 12, padding: 20,
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        background: color + '18', color: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.4rem', flexShrink: 0,
      }}>
        <i className={`fas ${icon}`}></i>
      </div>
      <div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500, marginBottom: 4 }}>
          {label}
        </div>
        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
          {value}
        </div>
      </div>
    </div>
  )
}

function FilterBlock({ label, width, children }) {
  return (
    <div style={{ width }}>
      <label style={{
        display: 'block', fontSize: '0.72rem', fontWeight: 700,
        color: 'var(--text)', marginBottom: 6,
      }}>{label}</label>
      {children}
    </div>
  )
}

// ─── Styles ───

const th = {
  padding: '14px 16px', textAlign: 'left',
  fontSize: '0.72rem', fontWeight: 800,
  textTransform: 'uppercase', letterSpacing: 0.5,
  color: 'var(--text-muted)', whiteSpace: 'nowrap',
}

const td = {
  padding: '14px 16px',
  color: 'var(--text-muted)',
  whiteSpace: 'nowrap',
}

const selectStyle = {
  width: '100%', padding: '10px 14px',
  border: '1px solid var(--border)', borderRadius: 8,
  fontSize: '0.85rem', outline: 'none',
  background: 'var(--surface)', color: 'var(--text)',
  cursor: 'pointer',
}

function btnView() {
  return {
    padding: '6px 14px', border: 'none', borderRadius: 6,
    background: '#2563eb', color: 'white', fontWeight: 700,
    fontSize: '0.72rem', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 5,
  }
}
function btnEdit() {
  return {
    padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 6,
    background: 'var(--surface)', color: 'var(--text)', fontWeight: 700,
    fontSize: '0.72rem', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 5,
  }
}
function btnStart() {
  return {
    padding: '6px 14px', border: '1px solid #10b981', borderRadius: 6,
    background: '#d1fae5', color: '#047857', fontWeight: 700,
    fontSize: '0.72rem', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 5,
  }
}
function btnStop() {
  return {
    padding: '6px 14px', border: '1px solid #ef4444', borderRadius: 6,
    background: '#fee2e2', color: '#b91c1c', fontWeight: 700,
    fontSize: '0.72rem', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 5,
  }
}
function btnRestart() {
  return {
    padding: '6px 12px', border: '1px solid #f59e0b', borderRadius: 6,
    background: '#fef3c7', color: '#a16207', fontWeight: 700,
    fontSize: '0.72rem', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 5,
  }
}
function btnDelete() {
  return {
    padding: '6px 12px', border: 'none', borderRadius: 6,
    background: '#fee2e2', color: '#b91c1c', fontWeight: 700,
    fontSize: '0.72rem', cursor: 'pointer',
    display: 'inline-flex', alignItems: 'center', gap: 5,
  }
}
function pagBtn(disabled, active) {
  return {
    minWidth: 34, height: 34, padding: '0 10px',
    border: '1px solid ' + (active ? '#2563eb' : 'var(--border)'),
    background: active ? '#2563eb' : 'var(--surface)',
    color: active ? 'white' : 'var(--text)',
    borderRadius: 6, fontWeight: 700, fontSize: '0.82rem',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  }
}
