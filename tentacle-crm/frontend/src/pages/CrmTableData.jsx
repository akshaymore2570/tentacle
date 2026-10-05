import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api'

export default function CrmTableData({ showToast }) {
  const { id } = useParams()
  const navigate = useNavigate()

  const [table, setTable] = useState(null)
  const [columns, setColumns] = useState([])
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddRow, setShowAddRow] = useState(false)
  const [newRow, setNewRow] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [showColumns, setShowColumns] = useState(false)
  const [formError, setFormError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})

  const load = async () => {
    setLoading(true)
    try {
      const { data: t } = await api.get(`/crm-tables/${id}`)
      setTable(t)
      const { data: d } = await api.get(`/crm-tables/${id}/rows`)
      setColumns(d.columns || [])
      setRows(d.rows || [])
    } catch {
      showToast && showToast('Could not load table')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const resetForm = () => {
    setNewRow({})
    setFormError('')
    setFieldErrors({})
  }

  // Find column DB type for a given column name
  const getColType = (colName) => {
    const c = columns.find(x => x.name === colName)
    if (!c) return 'text'
    const t = c.type.toLowerCase()
    if (t.includes('int') || t.includes('numeric') || t.includes('double') || t.includes('float') || t.includes('decimal')) return 'number'
    if (t.includes('bool')) return 'boolean'
    if (t.includes('timestamp') || t.includes('datetime')) return 'datetime-local'
    if (t.includes('date')) return 'date'
    return 'text'
  }

  // Validate client-side
  const validate = () => {
    const errs = {}
    let hasError = false

    editableCols.forEach(col => {
      const value = newRow[col.name]
      const type = getColType(col.name)

      if (value === undefined || value === '' || value === null) return

      if (type === 'number' && isNaN(Number(value))) {
        errs[col.name] = 'Must be a number'
        hasError = true
      }
      if (type === 'boolean' && !['true', 'false', '0', '1'].includes(String(value).toLowerCase())) {
        errs[col.name] = 'Must be true or false'
        hasError = true
      }
      if (type === 'date' && isNaN(new Date(value).getTime())) {
        errs[col.name] = 'Invalid date'
        hasError = true
      }
    })

    setFieldErrors(errs)
    return !hasError
  }

  const addRow = async () => {
    setFormError('')
    if (!validate()) {
      setFormError('Please fix the highlighted fields')
      return
    }
    setSubmitting(true)
    try {
      await api.post(`/crm-tables/${id}/rows`, newRow)
      showToast && showToast('Row added')
      resetForm()
      setShowAddRow(false)
      load()
    } catch (e) {
      const serverMsg = e.response?.data?.error
      setFormError(serverMsg || 'Could not save row. Please check your input.')
    } finally {
      setSubmitting(false)
    }
  }

  const deleteRow = async (rid) => {
    if (!confirm('Delete this row?')) return
    try {
      await api.delete(`/crm-tables/${id}/rows/${rid}`)
      showToast && showToast('Row deleted')
      load()
    } catch {
      showToast && showToast('Could not delete row')
    }
  }

  const deleteTable = async () => {
    if (!confirm(`Delete "${table.name}"?\n\nAll data will be permanently removed.`)) return
    try {
      await api.delete(`/crm-tables/${id}?drop=true`)
      showToast && showToast('Table deleted')
      navigate('/crm-table')
    } catch {
      showToast && showToast('Could not delete table')
    }
  }

  const dropColumn = async (colname) => {
    if (!confirm(`Remove column "${colname}" permanently?\n\nAll data in this column will be lost.`)) return
    try {
      await api.delete(`/crm-tables/${id}/column/${colname}`)
      showToast && showToast(`Column "${colname}" removed`)
      load()
    } catch (e) {
      showToast && showToast(e.response?.data?.error || 'Could not remove column')
    }
  }

  const exportCsv = async () => {
    try {
      const token = localStorage.getItem('tentacle_token')
      const res = await fetch(`/api/crm-tables/${id}/export`, {
        headers: { Authorization: 'Bearer ' + token },
      })
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${table?.name || 'table'}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      showToast && showToast('Export failed')
    }
  }

  const editableCols = columns.filter(c => !['id', 'created_at', 'updated_at'].includes(c.name))

  const definedCols = (table?.columns || []).map(c => (c.name || '').toLowerCase())
  const orphanCols = columns.filter(c =>
    !['id', 'created_at', 'updated_at'].includes(c.name) &&
    !definedCols.includes(c.name.toLowerCase())
  )

  const fmtCell = (v) => {
    if (v === null || v === undefined) return <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>—</span>
    if (typeof v === 'object') return JSON.stringify(v)
    return String(v)
  }

  if (loading) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
    <i className="fas fa-spinner fa-spin"></i> Loading...
  </div>

  if (!table) return <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>Table not found</div>

  return (
    <div style={{ padding: '0 32px 40px' }}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1><i className="fas fa-table"></i> {table.displayName || table.name}</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            {rows.length} row{rows.length !== 1 ? 's' : ''} · {columns.length} column{columns.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-grey" onClick={() => navigate(`/crm-table/${table.id}/edit`)}>
            <i className="fas fa-pen"></i> Edit Schema
          </button>
          <button className="btn btn-grey" onClick={() => setShowColumns(v => !v)}>
            <i className="fas fa-columns"></i> Manage Columns
          </button>
          <button className="btn btn-grey" onClick={exportCsv}>
            <i className="fas fa-download"></i> Export
          </button>
          <button onClick={deleteTable}
            style={{
              padding: '9px 18px', border: '1px solid var(--danger)',
              background: 'var(--surface)', color: 'var(--danger)',
              borderRadius: 6, fontWeight: 600, fontSize: '0.82rem',
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7,
            }}>
            <i className="fas fa-trash"></i> Delete Table
          </button>
          <button className="btn btn-blue" onClick={() => { resetForm(); setShowAddRow(v => !v) }}>
            <i className="fas fa-plus"></i> Add Row
          </button>
        </div>
      </div>

      {/* MANAGE COLUMNS PANEL */}
      {showColumns && (
        <div style={{
          background: 'var(--surface)', border: '1.5px solid var(--primary)',
          borderRadius: 12, padding: 20, marginBottom: 20,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{
              fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: 0.8, color: 'var(--primary)',
            }}>
              <i className="fas fa-columns"></i> Table Columns ({columns.length})
            </div>
            <button onClick={() => setShowColumns(false)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 12 }}>
            <i className="fas fa-info-circle"></i>&nbsp;
            These are the actual columns in this table. You can remove unused columns.
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: 10,
          }}>
            {columns.map(col => {
              const isReserved = ['id', 'created_at', 'updated_at'].includes(col.name)
              const isOrphan = orphanCols.find(o => o.name === col.name)
              return (
                <div key={col.name} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: isReserved ? 'var(--primary-light)'
                    : isOrphan ? '#fff4e6'
                    : 'var(--bg)',
                  border: '1px solid var(--border)', borderRadius: 8,
                  gap: 10,
                }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{
                      fontFamily: 'monospace', fontSize: '0.85rem', fontWeight: 700,
                      color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {col.name}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {col.type.split('(')[0].trim()}
                      {isReserved && ' · system column'}
                      {isOrphan && ' · unused'}
                    </div>
                  </div>
                  {!isReserved && (
                    <button onClick={() => dropColumn(col.name)}
                      title="Remove column permanently"
                      style={{
                        width: 30, height: 30, border: '1px solid var(--danger)',
                        background: 'var(--surface)', color: 'var(--danger)',
                        borderRadius: 6, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.72rem', flexShrink: 0,
                      }}>
                      <i className="fas fa-trash"></i>
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ADD ROW FORM */}
      {showAddRow && (
        <div style={{
          background: 'var(--surface)', border: '1.5px solid var(--primary)',
          borderRadius: 12, padding: 20, marginBottom: 20,
        }}>
          <div style={{
            fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase',
            letterSpacing: 0.8, color: 'var(--primary)', marginBottom: 14,
          }}>
            <i className="fas fa-plus-circle"></i> Add New Row
          </div>

          {/* ERROR BANNER */}
          {formError && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 16px', marginBottom: 16,
              background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 8, color: '#b91c1c',
              fontSize: '0.85rem', fontWeight: 600,
            }}>
              <i className="fas fa-exclamation-circle" style={{ flexShrink: 0 }}></i>
              <span>{formError}</span>
            </div>
          )}

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 14, marginBottom: 16,
          }}>
            {editableCols.map(col => {
              const type = getColType(col.name)
              const err = fieldErrors[col.name]
              return (
                <div key={col.name}>
                  <label style={{
                    display: 'block', fontSize: '0.72rem', fontWeight: 700,
                    marginBottom: 4, color: 'var(--text-muted)',
                    fontFamily: 'monospace',
                  }}>
                    {col.name}
                    <span style={{
                      marginLeft: 6, fontWeight: 500, fontFamily: 'inherit',
                      textTransform: 'uppercase', fontSize: '0.62rem',
                      color: 'var(--primary)', background: 'var(--primary-light)',
                      padding: '1px 6px', borderRadius: 6,
                    }}>
                      {col.type.split('(')[0].trim()}
                    </span>
                  </label>
                  <input
                    type={type}
                    value={newRow[col.name] || ''}
                    onChange={(e) => {
                      setNewRow({ ...newRow, [col.name]: e.target.value })
                      if (fieldErrors[col.name]) {
                        setFieldErrors(prev => {
                          const n = { ...prev }
                          delete n[col.name]
                          return n
                        })
                      }
                    }}
                    placeholder={type === 'number' ? 'Enter number' : type === 'date' ? '' : 'Enter value'}
                    style={{
                      width: '100%', padding: '9px 12px',
                      border: err ? '1.5px solid #f87171' : '1px solid var(--border)',
                      borderRadius: 6, fontSize: '0.85rem', outline: 'none',
                      background: 'var(--surface)', color: 'var(--text)',
                    }}
                  />
                  {err && (
                    <div style={{
                      fontSize: '0.7rem', color: '#dc2626',
                      marginTop: 3, display: 'flex', alignItems: 'center', gap: 4,
                    }}>
                      <i className="fas fa-times-circle" style={{ fontSize: '0.65rem' }}></i>
                      {err}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn btn-grey" onClick={() => { setShowAddRow(false); resetForm() }}>
              Cancel
            </button>
            <button className="btn btn-blue" onClick={addRow} disabled={submitting}>
              {submitting ? <><i className="fas fa-spinner fa-spin"></i> Adding...</> : <><i className="fas fa-check"></i> Add Row</>}
            </button>
          </div>
        </div>
      )}

      {/* DATA TABLE */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, overflow: 'hidden',
      }}>
        {rows.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted)' }}>
            <i className="fas fa-inbox" style={{ fontSize: '3rem', opacity: 0.25, marginBottom: 16, display: 'block' }}></i>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
              No data yet
            </h3>
            <p style={{ fontSize: '0.85rem', marginBottom: 20 }}>
              Add rows manually, or they will be filled automatically when CRM forms are submitted
            </p>
            <button className="btn btn-blue" onClick={() => setShowAddRow(true)}>
              <i className="fas fa-plus"></i> Add First Row
            </button>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: 'var(--primary-light)', borderBottom: '2px solid var(--border)' }}>
                  {columns.map(c => (
                    <th key={c.name} style={{
                      padding: '12px 14px', textAlign: 'left',
                      fontSize: '0.7rem', fontWeight: 700,
                      textTransform: 'uppercase', color: 'var(--text-muted)',
                      whiteSpace: 'nowrap', fontFamily: 'monospace',
                      borderRight: '1px solid var(--border)',
                    }}>
                      {c.name}
                    </th>
                  ))}
                  <th style={{ padding: '12px 14px', width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    {columns.map(c => (
                      <td key={c.name} style={{
                        padding: '10px 14px', borderRight: '1px solid var(--border)',
                        maxWidth: 300, overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        color: 'var(--text)',
                      }}>
                        {fmtCell(row[c.name])}
                      </td>
                    ))}
                    <td style={{ padding: '6px 10px', textAlign: 'center' }}>
                      <button onClick={() => deleteRow(row.id)}
                        style={{
                          width: 28, height: 28, border: '1px solid var(--border)',
                          background: 'var(--surface)', color: 'var(--text-muted)',
                          borderRadius: 6, cursor: 'pointer',
                        }}>
                        <i className="fas fa-trash" style={{ fontSize: '0.72rem' }}></i>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
