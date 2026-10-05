import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api'

export default function CrmTable({ showToast }) {
  const { crmId } = useParams()
  const navigate = useNavigate()
  const [tables, setTables] = useState([])
  const [activeCrm, setActiveCrm] = useState(crmId ? parseInt(crmId) : null)
  const [tableData, setTableData] = useState(null)
  const [loading, setLoading] = useState(false)

  const loadTables = async () => {
    try {
      const { data } = await api.get('/crm/tables')
      setTables(data)
      if (!activeCrm && data.length > 0) {
        setActiveCrm(data[0].crmId)
      }
    } catch {
      showToast && showToast('Failed to load tables')
    }
  }

  const loadTableData = async (id) => {
    if (!id) return
    setLoading(true)
    try {
      const { data } = await api.get(`/crm/table/${id}`)
      setTableData(data)
    } catch {
      showToast && showToast('Failed to load table data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadTables() }, [])
  useEffect(() => { if (activeCrm) loadTableData(activeCrm) }, [activeCrm])

  const fmtCell = (val) => {
    if (val === null || val === undefined) return <span style={{ color: '#a0aec0', fontStyle: 'italic' }}>NULL</span>
    if (typeof val === 'object') return JSON.stringify(val)
    return String(val)
  }

  const exportCsv = async (id) => {
    try {
      const token = localStorage.getItem('tentacle_token')
      const res = await fetch(`/api/crm/table/${id}/export`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${tableData?.tableName || 'crm'}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      showToast && showToast('Export failed')
    }
  }

  const deleteRow = async (rowId) => {
    if (!confirm('Delete this row?')) return
    try {
      await api.delete(`/crm/table/${activeCrm}/row/${rowId}`)
      showToast && showToast('Row deleted')
      loadTableData(activeCrm)
      loadTables()
    } catch {
      showToast && showToast('Delete failed')
    }
  }

  const activeTable = tables.find(t => t.crmId === activeCrm)

  return (
    <>
      <div className="breadcrumb">
        <a onClick={() => navigate('/campaign')}>Campaign</a>
        <span className="sep">›</span>
        <a onClick={() => navigate('/campaign')}>CRM Table</a>
      </div>

      <div className="page-header">
        <div>
          <h1><i className="fas fa-database"></i> CRM Table</h1>
          <p>View raw CRM data tables — auto-generated from CRM designs</p>
        </div>
        <button className="btn btn-grey" onClick={loadTables}>
          <i className="fas fa-rotate-right"></i> Refresh
        </button>
      </div>

      <div style={{ padding: '0 32px 40px' }}>
        {tables.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '80px 20px',
            background: 'var(--surface)', borderRadius: 14,
            border: '1px solid var(--border)', color: 'var(--text-muted)',
          }}>
            <i className="fas fa-database" style={{ fontSize: '3rem', opacity: 0.25, marginBottom: 16, display: 'block' }}></i>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
              No CRM tables yet
            </h3>
            <p style={{ fontSize: '0.85rem', marginBottom: 20 }}>
              Create a CRM design first — a staging table will be created automatically
            </p>
            <button className="btn-create-new" onClick={() => navigate('/crm')}>
              <i className="fas fa-plus"></i> Go to CRM Designs
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 20 }}>
            {/* SIDEBAR — table list */}
            <aside style={{
              background: 'var(--surface)', borderRadius: 12,
              border: '1px solid var(--border)', overflow: 'hidden',
              height: 'fit-content', position: 'sticky', top: 20,
            }}>
              <div style={{
                padding: '14px 16px', borderBottom: '1px solid var(--border)',
                fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: 0.8, color: 'var(--text-muted)',
              }}>
                Tables ({tables.length})
              </div>
              {tables.map(t => (
                <div
                  key={t.crmId}
                  onClick={() => setActiveCrm(t.crmId)}
                  style={{
                    padding: '14px 16px',
                    borderBottom: '1px solid var(--border)',
                    cursor: 'pointer',
                    background: activeCrm === t.crmId ? 'var(--primary-light)' : 'transparent',
                    borderLeft: activeCrm === t.crmId ? '3px solid var(--primary)' : '3px solid transparent',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <i className="fas fa-table" style={{
                      color: t.exists ? 'var(--primary)' : '#cbd5e1',
                      fontSize: '0.85rem',
                    }}></i>
                    <div style={{
                      fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {t.crmName}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {t.tableName}
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6, fontSize: '0.7rem' }}>
                    <span style={{
                      background: t.exists ? '#d1fae5' : '#fee2e2',
                      color: t.exists ? '#047857' : '#b91c1c',
                      padding: '2px 8px', borderRadius: 10, fontWeight: 700,
                    }}>
                      {t.exists ? `${t.rowCount} rows` : 'missing'}
                    </span>
                    <span style={{
                      background: 'var(--primary-light)', color: 'var(--primary)',
                      padding: '2px 8px', borderRadius: 10, fontWeight: 700,
                    }}>
                      {t.columns.length} cols
                    </span>
                  </div>
                </div>
              ))}
            </aside>

            {/* MAIN — table data */}
            <div style={{
              background: 'var(--surface)', borderRadius: 12,
              border: '1px solid var(--border)', overflow: 'hidden',
            }}>
              {!activeTable ? (
                <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                  Select a table from the left
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div style={{
                    padding: '16px 24px', borderBottom: '1px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    flexWrap: 'wrap', gap: 12,
                  }}>
                    <div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, marginBottom: 4 }}>
                        {activeTable.crmName}
                      </div>
                      <div style={{
                        fontSize: '0.78rem', color: 'var(--text-muted)',
                        fontFamily: 'monospace',
                      }}>
                        <i className="fas fa-database"></i> {activeTable.tableName}
                        {activeTable.exists && (
                          <> · {activeTable.rowCount} rows · {activeTable.columns.length} columns</>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-grey" onClick={() => exportCsv(activeCrm)} disabled={!activeTable.exists}>
                        <i className="fas fa-download"></i> Export CSV
                      </button>
                      <button className="btn btn-blue" onClick={() => loadTableData(activeCrm)}>
                        <i className="fas fa-rotate-right"></i> Reload
                      </button>
                    </div>
                  </div>

                  {/* Data */}
                  {loading ? (
                    <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                      <i className="fas fa-spinner fa-spin"></i> Loading...
                    </div>
                  ) : !tableData?.exists ? (
                    <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                      <i className="fas fa-exclamation-triangle" style={{ fontSize: '2rem', color: '#f59e0b', marginBottom: 12, display: 'block' }}></i>
                      <p>Table <strong style={{ fontFamily: 'monospace' }}>{activeTable.tableName}</strong> does not exist yet.</p>
                      <p style={{ fontSize: '0.82rem', marginTop: 8 }}>
                        Open the CRM design and click <strong>Save</strong> to create the table.
                      </p>
                      <button className="btn btn-blue" style={{ marginTop: 20 }}
                        onClick={() => navigate(`/crm/${activeCrm}`)}>
                        <i className="fas fa-pen"></i> Open CRM Design
                      </button>
                    </div>
                  ) : tableData.rows.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
                      <i className="fas fa-inbox" style={{ fontSize: '2rem', opacity: 0.3, marginBottom: 12, display: 'block' }}></i>
                      <p>No rows yet in this table.</p>
                      <p style={{ fontSize: '0.82rem', marginTop: 8 }}>
                        Rows will be added when calls are made / CRM data is submitted.
                      </p>
                    </div>
                  ) : (
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{
                        width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem',
                      }}>
                        <thead>
                          <tr style={{ background: '#fafcff', borderBottom: '2px solid var(--border)' }}>
                            {tableData.columns.map(c => (
                              <th key={c.name} style={{
                                padding: '12px 14px', textAlign: 'left',
                                fontSize: '0.7rem', fontWeight: 700,
                                textTransform: 'uppercase', color: 'var(--text-muted)',
                                whiteSpace: 'nowrap', borderRight: '1px solid var(--border)',
                              }}>
                                {c.name}
                                <div style={{ fontSize: '0.65rem', fontWeight: 500, opacity: 0.7, fontFamily: 'monospace', marginTop: 2 }}>
                                  {c.type.split('(')[0].trim()}
                                </div>
                              </th>
                            ))}
                            <th style={{ padding: '12px 14px', width: 60 }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {tableData.rows.map(row => (
                            <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                              {tableData.columns.map(c => (
                                <td key={c.name} style={{
                                  padding: '10px 14px', borderRight: '1px solid var(--border)',
                                  maxWidth: 300, overflow: 'hidden',
                                  textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                }}>
                                  {fmtCell(row[c.name])}
                                </td>
                              ))}
                              <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                                <button
                                  onClick={() => deleteRow(row.id)}
                                  title="Delete row"
                                  style={{
                                    width: 28, height: 28, border: '1px solid var(--border)',
                                    background: 'white', color: 'var(--text-muted)',
                                    borderRadius: 6, cursor: 'pointer', fontSize: '0.75rem',
                                  }}>
                                  <i className="fas fa-trash"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}
