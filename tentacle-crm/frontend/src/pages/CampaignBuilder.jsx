import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api'

const emptyDisposition = () => ({
  dispositionType: '', dispositionName: '', description: '',
  status: 'ACTIVE', autoDisposition: ''
})

const emptySkill = () => ({
  skillName: '', skillDesc: '', skillColor: '#2c5f9e', status: 'ACTIVE'
})

export default function CampaignBuilder({ showToast }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const isEdit = id && id !== 'new'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dropdowns, setDropdowns] = useState({ crms: [], statuses: [], autoDisposes: [], yesNo: [] })

  const [form, setForm] = useState({
    name: '', description: '', status: 'INACTIVE', autoDispose: 'DISALLOW',
    crmId: '', crmHistory: 'NO', startCallUrl: '', mask: '',
    dispositions: [], skills: []
  })

  const [selectedDisp, setSelectedDisp] = useState([])
  const [selectedSkill, setSelectedSkill] = useState([])

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }))

  useEffect(() => {
    (async () => {
      try {
        const { data: opts } = await api.get('/ten-campaigns/dropdowns')
        setDropdowns(opts)
        if (isEdit) {
          const { data } = await api.get('/ten-campaigns/' + id)
          setForm({
            name: data.name || '', description: data.description || '',
            status: data.status || 'INACTIVE', autoDispose: data.autoDispose || 'DISALLOW',
            crmId: data.crmId || '', crmHistory: data.crmHistory || 'NO',
            startCallUrl: data.startCallUrl || '', mask: data.mask || '',
            dispositions: data.dispositions || [], skills: data.skills || []
          })
        }
      } catch {
        showToast && showToast('Could not load')
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  const save = async () => {
    if (!form.name.trim()) return showToast && showToast('Campaign name is required')
    setSaving(true)
    try {
      const payload = { ...form, crmId: form.crmId || null }
      if (isEdit) await api.put('/ten-campaigns/' + id, payload)
      else await api.post('/ten-campaigns', payload)
      showToast && showToast(isEdit ? 'Campaign updated' : 'Campaign created')
      navigate('/campaigns')
    } catch (e) {
      showToast && showToast(e.response?.data?.error || 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  // Dispositions
  const addDisposition = () => {
    update('dispositions', [...form.dispositions, emptyDisposition()])
  }
  const updateDisposition = (i, patch) =>
    update('dispositions', form.dispositions.map((d, idx) => idx === i ? { ...d, ...patch } : d))
  const removeSelectedDispositions = () => {
    const remaining = form.dispositions.filter((_, idx) => !selectedDisp.includes(idx))
    update('dispositions', remaining)
    setSelectedDisp([])
  }
  const toggleDisp = (i) => {
    setSelectedDisp(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])
  }

  // Skills
  const addSkill = () => update('skills', [...form.skills, emptySkill()])
  const updateSkill = (i, patch) =>
    update('skills', form.skills.map((s, idx) => idx === i ? { ...s, ...patch } : s))
  const removeSelectedSkills = () => {
    const remaining = form.skills.filter((_, idx) => !selectedSkill.includes(idx))
    update('skills', remaining)
    setSelectedSkill([])
  }
  const toggleSkill = (i) => {
    setSelectedSkill(prev => prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i])
  }

  if (loading) return <p style={{ padding: 30 }}>Loading...</p>

  const input = {
    width: '100%', padding: '8px 12px',
    border: '1px solid #d8e2ee', borderRadius: 4,
    fontSize: '0.88rem', outline: 'none',
    background: 'white', color: '#1e2a3a',
  }
  const label = {
    display: 'block', fontSize: '0.82rem', fontWeight: 600,
    color: '#1e2a3a', marginBottom: 6,
  }

  return (
    <div style={{ padding: '20px 40px 60px', background: '#f5f8fc', minHeight: '100%' }}>

      {/* HEADER */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigate('/campaigns')}
            style={{
              width: 32, height: 32, border: 'none',
              background: 'transparent', color: '#2c5f9e',
              cursor: 'pointer', fontSize: '1.1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
            <i className="fas fa-arrow-left"></i>
          </button>
          <h1 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#1e2a3a' }}>
            {isEdit ? 'Edit Campaign' : 'Add Campaign'}
          </h1>
        </div>
        <button
          onClick={save}
          disabled={saving}
          style={{
            padding: '8px 28px',
            border: 'none',
            background: saving ? '#94a3b8' : '#1e6fb8',
            color: 'white',
            fontWeight: 600,
            fontSize: '0.85rem',
            cursor: saving ? 'not-allowed' : 'pointer',
            borderRadius: 4,
          }}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* BASIC INFO — 2 column grid */}
      <div style={{
        background: 'white',
        borderRadius: 6,
        border: '1px solid #e0e8f0',
        padding: 20,
        marginBottom: 20,
      }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px 40px',
        }}>
          {/* ROW 1 */}
          <div>
            <label style={label}>Name <span style={{ color: '#e74c3c' }}>*</span></label>
            <input value={form.name} onChange={(e) => update('name', e.target.value)} style={input} />
          </div>
          <div>
            <label style={label}>Description <span style={{ color: '#e74c3c' }}>*</span></label>
            <input value={form.description} onChange={(e) => update('description', e.target.value)} style={input} />
          </div>

          {/* ROW 2 */}
          <div>
            <label style={label}>Status <span style={{ color: '#e74c3c' }}>*</span></label>
            <select value={form.status} onChange={(e) => update('status', e.target.value)}
              style={{ ...input, background: '#f0f2f5' }}>
              {dropdowns.statuses.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>Auto Dispose <span style={{ color: '#e74c3c' }}>*</span></label>
            <select value={form.autoDispose} onChange={(e) => update('autoDispose', e.target.value)}
              style={{ ...input, background: '#f0f2f5' }}>
              {dropdowns.autoDisposes.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* ROW 3 */}
          <div>
            <label style={label}>CRM <span style={{ color: '#e74c3c' }}>*</span></label>
            <select value={form.crmId} onChange={(e) => update('crmId', e.target.value)}
              style={{ ...input, background: '#f0f2f5' }}>
              <option value=""></option>
              {dropdowns.crms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label style={label}>CRM History <span style={{ color: '#e74c3c' }}>*</span></label>
            <select value={form.crmHistory} onChange={(e) => update('crmHistory', e.target.value)}
              style={{ ...input, background: '#f0f2f5' }}>
              {dropdowns.yesNo.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* ROW 4 */}
          <div>
            <label style={label}>Start Call Url</label>
            <select value={form.startCallUrl} onChange={(e) => update('startCallUrl', e.target.value)}
              style={{ ...input, background: '#f0f2f5' }}>
              <option value=""></option>
              <option value="https://api.example.com/call">https://api.example.com/call</option>
            </select>
          </div>
          <div>
            <label style={label}>Mask</label>
            <select value={form.mask} onChange={(e) => update('mask', e.target.value)}
              style={{ ...input, background: '#f0f2f5' }}>
              <option value=""></option>
              <option value="default">Default</option>
            </select>
          </div>
        </div>
      </div>

      {/* DISPOSITIONS SECTION */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}>
          <h2 style={{
            fontSize: '0.95rem', fontWeight: 700,
            color: '#1e2a3a', margin: 0,
          }}>
            Campaign Dispositions
          </h2>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={addDisposition}
              title="Add"
              style={{
                width: 26, height: 26, border: 'none', borderRadius: '50%',
                background: '#1e6fb8', color: 'white',
                cursor: 'pointer', fontSize: '0.72rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <i className="fas fa-plus"></i>
            </button>
            <button onClick={removeSelectedDispositions}
              disabled={selectedDisp.length === 0}
              title="Delete selected"
              style={{
                width: 26, height: 26, border: 'none', borderRadius: '50%',
                background: selectedDisp.length === 0 ? '#cbd5e1' : '#dc2626',
                color: 'white',
                cursor: selectedDisp.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: '0.72rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <i className="fas fa-trash"></i>
            </button>
          </div>
        </div>

        <div style={{
          background: 'white',
          border: '1px solid #d0dae6',
          borderRadius: 4,
          overflow: 'hidden',
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '40px 1.5fr 1.5fr 2fr 1fr 1.5fr',
            background: '#eaf3fb',
            borderBottom: '1px solid #d0dae6',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#1e6fb8',
          }}>
            <div style={{ padding: '12px 8px' }}></div>
            <div style={{ padding: '12px 12px' }}>Disposition Type</div>
            <div style={{ padding: '12px 12px' }}>Disposition Name</div>
            <div style={{ padding: '12px 12px' }}>Description</div>
            <div style={{ padding: '12px 12px' }}>Status</div>
            <div style={{ padding: '12px 12px' }}>Select Auto Disposition</div>
          </div>

          {/* Rows or empty state */}
          {form.dispositions.length === 0 ? (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              fontSize: '0.82rem',
              color: '#6b7d91',
              background: 'white',
            }}>
              Add Campaign Dispositions
            </div>
          ) : (
            form.dispositions.map((d, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '40px 1.5fr 1.5fr 2fr 1fr 1.5fr',
                borderBottom: i < form.dispositions.length - 1 ? '1px solid #f0f2f5' : 'none',
                alignItems: 'center',
              }}>
                <div style={{ padding: '8px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selectedDisp.includes(i)}
                    onChange={() => toggleDisp(i)}
                    style={{ cursor: 'pointer' }}
                  />
                </div>
                <div style={{ padding: '6px 8px' }}>
                  <input value={d.dispositionType}
                    onChange={(e) => updateDisposition(i, { dispositionType: e.target.value })}
                    placeholder="Enter type"
                    style={{ ...input, padding: '6px 10px', fontSize: '0.82rem' }} />
                </div>
                <div style={{ padding: '6px 8px' }}>
                  <input value={d.dispositionName}
                    onChange={(e) => updateDisposition(i, { dispositionName: e.target.value })}
                    placeholder="Enter name"
                    style={{ ...input, padding: '6px 10px', fontSize: '0.82rem' }} />
                </div>
                <div style={{ padding: '6px 8px' }}>
                  <input value={d.description}
                    onChange={(e) => updateDisposition(i, { description: e.target.value })}
                    placeholder="Enter description"
                    style={{ ...input, padding: '6px 10px', fontSize: '0.82rem' }} />
                </div>
                <div style={{ padding: '6px 8px' }}>
                  <select value={d.status}
                    onChange={(e) => updateDisposition(i, { status: e.target.value })}
                    style={{ ...input, padding: '6px 10px', fontSize: '0.82rem', background: '#f0f2f5' }}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
                <div style={{ padding: '6px 8px' }}>
                  <input value={d.autoDisposition}
                    onChange={(e) => updateDisposition(i, { autoDisposition: e.target.value })}
                    placeholder="Auto"
                    style={{ ...input, padding: '6px 10px', fontSize: '0.82rem' }} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SKILLS SECTION */}
      <div style={{ marginBottom: 24 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}>
          <h2 style={{
            fontSize: '0.95rem', fontWeight: 700,
            color: '#1e2a3a', margin: 0,
          }}>
            Campaign Skill
          </h2>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={addSkill}
              title="Add"
              style={{
                width: 26, height: 26, border: 'none', borderRadius: '50%',
                background: '#1e6fb8', color: 'white',
                cursor: 'pointer', fontSize: '0.72rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <i className="fas fa-plus"></i>
            </button>
            <button onClick={removeSelectedSkills}
              disabled={selectedSkill.length === 0}
              title="Delete selected"
              style={{
                width: 26, height: 26, border: 'none', borderRadius: '50%',
                background: selectedSkill.length === 0 ? '#cbd5e1' : '#dc2626',
                color: 'white',
                cursor: selectedSkill.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: '0.72rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              <i className="fas fa-trash"></i>
            </button>
          </div>
        </div>

        <div style={{
          background: 'white',
          border: '1px solid #d0dae6',
          borderRadius: 4,
          overflow: 'hidden',
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '40px 1.5fr 2fr 1.2fr 1fr',
            background: '#eaf3fb',
            borderBottom: '1px solid #d0dae6',
            fontSize: '0.78rem',
            fontWeight: 700,
            color: '#1e6fb8',
          }}>
            <div style={{ padding: '12px 8px' }}></div>
            <div style={{ padding: '12px 12px' }}>Skill name</div>
            <div style={{ padding: '12px 12px' }}>Skill Desc</div>
            <div style={{ padding: '12px 12px' }}>Skill Color</div>
            <div style={{ padding: '12px 12px' }}>Status</div>
          </div>

          {/* Rows or empty state */}
          {form.skills.length === 0 ? (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              fontSize: '0.82rem',
              color: '#6b7d91',
              background: 'white',
            }}>
              Add Campaign Skills
            </div>
          ) : (
            form.skills.map((s, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: '40px 1.5fr 2fr 1.2fr 1fr',
                borderBottom: i < form.skills.length - 1 ? '1px solid #f0f2f5' : 'none',
                alignItems: 'center',
              }}>
                <div style={{ padding: '8px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selectedSkill.includes(i)}
                    onChange={() => toggleSkill(i)}
                    style={{ cursor: 'pointer' }}
                  />
                </div>
                <div style={{ padding: '6px 8px' }}>
                  <input value={s.skillName}
                    onChange={(e) => updateSkill(i, { skillName: e.target.value })}
                    placeholder="Enter skill name"
                    style={{ ...input, padding: '6px 10px', fontSize: '0.82rem' }} />
                </div>
                <div style={{ padding: '6px 8px' }}>
                  <input value={s.skillDesc}
                    onChange={(e) => updateSkill(i, { skillDesc: e.target.value })}
                    placeholder="Enter description"
                    style={{ ...input, padding: '6px 10px', fontSize: '0.82rem' }} />
                </div>
                <div style={{ padding: '6px 8px' }}>
                  <input type="color" value={s.skillColor}
                    onChange={(e) => updateSkill(i, { skillColor: e.target.value })}
                    style={{
                      width: '100%', height: 34, padding: 2,
                      border: '1px solid #d8e2ee', borderRadius: 4,
                      cursor: 'pointer', background: 'white',
                    }} />
                </div>
                <div style={{ padding: '6px 8px' }}>
                  <select value={s.status}
                    onChange={(e) => updateSkill(i, { status: e.target.value })}
                    style={{ ...input, padding: '6px 10px', fontSize: '0.82rem', background: '#f0f2f5' }}>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="INACTIVE">INACTIVE</option>
                  </select>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  )
}
