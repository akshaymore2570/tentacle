import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api'

export default function BatchBuilder({ showToast }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = id && id !== 'new'
  const fileInputRef = useRef(null)

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [campaigns, setCampaigns] = useState([])
  const [subCampaigns, setSubCampaigns] = useState([])
  const [crmTables, setCrmTables] = useState([])

  const [form, setForm] = useState({
    name: '',
    description: '',
    campaignId: '',
    subCampaign: '',
    crmTableId: '',
    priority: 3,
  })

  // Upload state
  const [savedBatchId, setSavedBatchId] = useState(isEdit ? id : null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedInfo, setUploadedInfo] = useState(null)
  const [fileName, setFileName] = useState('')

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  // Load campaigns
  useEffect(() => {
    api.get('/ten-campaigns')
      .then(({ data }) => setCampaigns(data || []))
      .catch(() => {})
  }, [])

  // Load sub-campaigns when campaign changes
  useEffect(() => {
    if (!form.campaignId) {
      setSubCampaigns([])
      setCrmTables([])
      return
    }
    const c = campaigns.find(x => String(x.id) === String(form.campaignId))
    if (c && Array.isArray(c.skills)) {
      setSubCampaigns(c.skills.map(s => s.skillName).filter(Boolean))
    } else {
      setSubCampaigns([])
    }
    // Reset sub-campaign and table
    if (form.subCampaign || form.crmTableId) {
      setForm(prev => ({ ...prev, subCampaign: '', crmTableId: '' }))
    }
  }, [form.campaignId, campaigns])

  // Load CRM tables when campaign + sub-campaign selected
  useEffect(() => {
    if (!form.campaignId) {
      setCrmTables([])
      return
    }
    const params = new URLSearchParams()
    params.append('campaignId', form.campaignId)
    if (form.subCampaign) params.append('subCampaign', form.subCampaign)

    api.get(`/crm-tables?${params.toString()}`)
      .then(({ data }) => setCrmTables(data || []))
      .catch(() => setCrmTables([]))

    // Reset CRM table when sub-campaign changes
    if (form.crmTableId) {
      const selectedTable = crmTables.find(t => String(t.id) === String(form.crmTableId))
      if (!selectedTable || selectedTable.subCampaign !== form.subCampaign) {
        setForm(prev => ({ ...prev, crmTableId: '' }))
      }
    }
  }, [form.campaignId, form.subCampaign])

  // Load existing batch in edit mode
  useEffect(() => {
    if (!isEdit) {
      setLoading(false)
      return
    }
    api.get(`/batches/${id}`)
      .then(({ data }) => {
        setForm({
          name: data.name || '',
          description: data.description || '',
          campaignId: data.campaignId || '',
          subCampaign: data.subCampaign || '',
          crmTableId: data.crmTableId || '',
          priority: data.priority || 3,
        })
        setUploadedInfo({
          rows: data.uploadedRows || 0,
          filename: data.sourceFile || null,
        })
      })
      .catch(() => {
        showToast && showToast('Batch not found')
        navigate('/batch-maintenance/list')
      })
      .finally(() => setLoading(false))
  }, [id])

  // Save batch (create or update)
  const saveBatch = async (silent = false) => {
    if (!form.name.trim()) { showToast && showToast('Batch name is required'); return null }
    if (!form.campaignId) { showToast && showToast('Campaign is required'); return null }
    if (!form.subCampaign) { showToast && showToast('Sub-Campaign is required'); return null }
    if (!form.crmTableId) { showToast && showToast('CRM Table is required'); return null }

    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        campaignId: form.campaignId,
        subCampaign: form.subCampaign,
        crmTableId: form.crmTableId,
        priority: parseInt(form.priority) || 3,
      }
      let res
      if (savedBatchId) {
        res = await api.put(`/batches/${savedBatchId}`, payload)
      } else {
        res = await api.post('/batches', payload)
        setSavedBatchId(res.data.id)
      }
      if (!silent) showToast && showToast('Batch saved')
      return res.data.id
    } catch (e) {
      showToast && showToast(e.response?.data?.error || 'Could not save')
      return null
    } finally {
      setSaving(false)
    }
  }

  const saveAndClose = async () => {
    const bid = await saveBatch()
    if (bid) navigate('/batch-maintenance/list')
  }

  // File upload
  const handleFileSelect = (e) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFileName(f.name)
    uploadFile(f)
  }

  const uploadFile = async (file) => {
    let bid = savedBatchId
    if (!bid) {
      if (!form.name.trim()) { showToast && showToast('Enter batch name first'); return }
      if (!form.crmTableId) { showToast && showToast('Select CRM Table first'); return }
      bid = await saveBatch(true)
      if (!bid) return
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const progressInterval = setInterval(() => {
        setUploadProgress(p => Math.min(90, p + Math.random() * 15))
      }, 200)

      const { data } = await api.post(`/batches/${bid}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (e.total) {
            const pct = Math.round((e.loaded / e.total) * 100)
            setUploadProgress(pct)
          }
        },
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      setUploadedInfo({
        rows: data.inserted || 0,
        filename: data.filename || file.name,
      })
      showToast && showToast(`${data.inserted} rows uploaded`)
      setTimeout(() => setUploading(false), 500)
    } catch (e) {
      setUploading(false)
      setUploadProgress(0)
      showToast && showToast(e.response?.data?.error || 'Upload failed')
    }
  }

  // Template download
  const downloadTemplate = async () => {
    let bid = savedBatchId
    if (!bid) {
      if (!form.crmTableId) {
        showToast && showToast('Select CRM Table first')
        return
      }
      bid = await saveBatch(true)
      if (!bid) return
    }
    try {
      const token = localStorage.getItem('tentacle_token')
      const res = await fetch(`/api/batches/${bid}/template`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `template_${form.name || 'batch'}.csv`
      a.click()
      window.URL.revokeObjectURL(url)
    } catch {
      showToast && showToast('Could not download template')
    }
  }

  if (loading) return <p style={{ padding: 30 }}>Loading...</p>

  const input = {
    width: '100%', padding: '11px 14px',
    border: '1px solid var(--border)', borderRadius: 8,
    fontSize: '0.9rem', outline: 'none',
    background: 'var(--surface)', color: 'var(--text)',
  }
  const label = {
    display: 'block', fontSize: '0.78rem', fontWeight: 700,
    color: 'var(--text)', marginBottom: 6,
  }

  const hasFile = uploadedInfo && uploadedInfo.rows > 0
  const selectedTable = crmTables.find(t => String(t.id) === String(form.crmTableId))

  return (
    <div style={{ padding: '24px 40px 60px', background: 'var(--bg)', minHeight: '100%' }}>

      {/* HEADER */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24, paddingBottom: 18, borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => navigate('/batch-maintenance')}
            style={{
              width: 36, height: 36, border: '1px solid var(--border)',
              background: 'var(--surface)', color: 'var(--text)',
              borderRadius: 8, cursor: 'pointer',
            }}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, margin: 0 }}>
            <i className="fas fa-layer-group" style={{ color: 'var(--primary)', marginRight: 10 }}></i>
            {isEdit ? 'Edit Batch' : 'Create Batch'}
          </h1>
        </div>
        <button onClick={saveAndClose} disabled={saving || uploading}
          style={{
            padding: '10px 28px', border: 'none', borderRadius: 8,
            background: saving ? '#94a3b8' : 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
            color: 'white', fontWeight: 700, fontSize: '0.88rem',
            cursor: saving ? 'not-allowed' : 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            boxShadow: '0 2px 8px rgba(44,95,158,0.3)',
          }}>
          {saving ? <><i className="fas fa-spinner fa-spin"></i> Saving...</> : <><i className="fas fa-save"></i> Save</>}
        </button>
      </div>

      {/* FORM */}
      <div style={{
        background: 'var(--surface)', borderRadius: 12,
        border: '1px solid var(--border)', padding: 28,
        maxWidth: 900,
      }}>
        <div style={{ display: 'grid', gap: 20 }}>

          {/* Batch Name */}
          <div>
            <label style={label}>Batch Name <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input value={form.name}
              onChange={(e) => update('name', e.target.value)}
              placeholder="e.g. Mumbai Hindi Leads - Oct 2026"
              style={input} />
          </div>

          {/* Description */}
          <div>
            <label style={label}>Description</label>
            <textarea value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Short description (optional)" rows={2}
              style={{ ...input, resize: 'vertical', fontFamily: 'inherit' }} />
          </div>

          {/* Campaign + Sub-Campaign */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div>
              <label style={label}>Campaign <span style={{ color: 'var(--danger)' }}>*</span></label>
              <select value={form.campaignId}
                onChange={(e) => update('campaignId', e.target.value)}
                style={input}>
                <option value="">-- Select Campaign --</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Sub-Campaign <span style={{ color: 'var(--danger)' }}>*</span></label>
              <select value={form.subCampaign}
                onChange={(e) => update('subCampaign', e.target.value)}
                disabled={!form.campaignId}
                style={input}>
                <option value="">-- Select Sub-Campaign --</option>
                {subCampaigns.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              {form.campaignId && subCampaigns.length === 0 && (
                <div style={{ fontSize: '0.72rem', color: 'var(--danger)', marginTop: 4 }}>
                  <i className="fas fa-exclamation-triangle"></i> No sub-campaigns for this campaign
                </div>
              )}
            </div>
          </div>

          {/* CRM Table + Priority */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
            <div>
              <label style={label}>CRM Table <span style={{ color: 'var(--danger)' }}>*</span></label>
              <select value={form.crmTableId}
                onChange={(e) => update('crmTableId', e.target.value)}
                disabled={!form.campaignId || !form.subCampaign}
                style={input}>
                <option value="">
                  {!form.campaignId
                    ? '-- Select Campaign first --'
                    : !form.subCampaign
                      ? '-- Select Sub-Campaign first --'
                      : '-- Select CRM Table --'}
                </option>
                {crmTables.map(t => <option key={t.id} value={t.id}>{t.displayName || t.name}</option>)}
              </select>
              {form.campaignId && form.subCampaign && crmTables.length === 0 && (
                <div style={{ fontSize: '0.72rem', color: 'var(--danger)', marginTop: 4 }}>
                  <i className="fas fa-exclamation-triangle"></i> No CRM tables for this campaign + sub-campaign
                </div>
              )}
              {selectedTable && (
                <div style={{
                  fontSize: '0.72rem', color: 'var(--primary)', marginTop: 4,
                }}>
                  <i className="fas fa-info-circle"></i> Columns: {selectedTable.columns?.map(c => c.name).join(', ')}
                </div>
              )}
            </div>
            <div>
              <label style={label}>Priority <span style={{ color: 'var(--danger)' }}>*</span></label>
              <select value={form.priority}
                onChange={(e) => update('priority', e.target.value)}
                style={input}>
                <option value="1">P1 · Highest</option>
                <option value="2">P2 · High</option>
                <option value="3">P3 · Normal</option>
                <option value="4">P4 · Low</option>
                <option value="5">P5 · Lowest</option>
              </select>
            </div>
          </div>

          {/* FILE UPLOAD */}
          {selectedTable && (
            <div style={{ borderTop: '1px dashed var(--border)', paddingTop: 22, marginTop: 4 }}>
              <div style={{
                fontSize: '0.85rem', fontWeight: 800,
                color: 'var(--text)', marginBottom: 12,
                display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
              }}>
                <i className="fas fa-file-upload" style={{ color: 'var(--primary)' }}></i>
                Upload Leads File (CSV)
                <button onClick={downloadTemplate} style={{
                  marginLeft: 'auto',
                  padding: '6px 14px', border: '1px solid var(--primary)',
                  background: 'var(--surface)', color: 'var(--primary)',
                  borderRadius: 6, fontSize: '0.75rem', fontWeight: 700,
                  cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5,
                }}>
                  <i className="fas fa-download"></i> Download Template
                </button>
              </div>

              <div style={{
                background: 'var(--primary-light)', borderRadius: 8,
                padding: '10px 14px', marginBottom: 12,
                fontSize: '0.78rem', color: 'var(--primary)',
              }}>
                <strong>Required columns:</strong>{' '}
                <span style={{ fontFamily: 'monospace' }}>
                  {selectedTable.columns?.map(c => c.name).join(', ')}
                </span>
              </div>

              <div
                onClick={() => !uploading && fileInputRef.current?.click()}
                style={{
                  border: '2px dashed ' + (hasFile ? '#10b981' : 'var(--border)'),
                  background: hasFile ? '#f0fdf4' : 'var(--bg)',
                  borderRadius: 10, padding: 24, textAlign: 'center',
                  cursor: uploading ? 'wait' : 'pointer',
                }}>
                <input ref={fileInputRef} type="file" accept=".csv,.txt"
                  onChange={handleFileSelect} style={{ display: 'none' }} />

                {uploading ? (
                  <>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--primary)', marginBottom: 12, display: 'block' }}></i>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: 6 }}>Uploading...</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>{fileName}</div>
                    <div style={{
                      width: '100%', maxWidth: 400, margin: '0 auto',
                      height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden',
                    }}>
                      <div style={{
                        height: '100%', width: `${uploadProgress}%`,
                        background: 'linear-gradient(90deg, #2563eb, #1d4ed8)',
                        transition: 'width 0.3s',
                      }}></div>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--primary)', marginTop: 8, fontWeight: 700 }}>
                      {Math.round(uploadProgress)}%
                    </div>
                  </>
                ) : hasFile ? (
                  <>
                    <i className="fas fa-check-circle" style={{ fontSize: '2rem', color: '#10b981', marginBottom: 12, display: 'block' }}></i>
                    <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#047857', marginBottom: 4 }}>
                      {uploadedInfo.rows.toLocaleString()} rows uploaded
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      <i className="fas fa-file-csv"></i> {uploadedInfo.filename || fileName}
                    </div>
                  </>
                ) : (
                  <>
                    <i className="fas fa-cloud-upload-alt" style={{ fontSize: '2rem', color: 'var(--primary)', marginBottom: 12, display: 'block' }}></i>
                    <div style={{ fontSize: '0.92rem', fontWeight: 700, marginBottom: 4 }}>
                      Click to upload CSV
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      First row must be column headers matching the required columns
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {!selectedTable && (
            <div style={{
              background: 'var(--primary-light)', borderRadius: 10,
              padding: 14, fontSize: '0.82rem', color: 'var(--primary)',
              lineHeight: 1.6,
            }}>
              <i className="fas fa-info-circle"></i>&nbsp;
              Select Campaign → Sub-Campaign → CRM Table to enable file upload
            </div>
          )}

        </div>
      </div>

      {/* FOOTER */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, maxWidth: 900 }}>
        <button onClick={() => navigate('/batch-maintenance/list')}
          style={{
            padding: '10px 24px', border: '1px solid var(--border)',
            background: 'var(--surface)', color: 'var(--text)',
            borderRadius: 8, fontWeight: 600, cursor: 'pointer',
          }}>
          Cancel
        </button>
        <button onClick={saveAndClose} disabled={saving || uploading}
          style={{
            padding: '10px 28px', border: 'none',
            background: (saving || uploading) ? '#94a3b8' : 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
            color: 'white', borderRadius: 8, fontWeight: 700,
            cursor: (saving || uploading) ? 'not-allowed' : 'pointer',
          }}>
          {saving ? 'Saving...' : (isEdit ? 'Update Batch' : 'Create Batch')}
        </button>
      </div>
    </div>
  )
}
