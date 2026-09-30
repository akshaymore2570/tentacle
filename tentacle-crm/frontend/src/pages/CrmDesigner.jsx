import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../api'

const TOOLS = [
  { cat: 'Basic', items: [
    { type: 'HEADING', icon: 'fa-heading' },
    { type: 'INPUT FIELD', icon: 'fa-i-cursor' },
    { type: 'TEXT AREA', icon: 'fa-align-left' },
  ]},
  { cat: 'Selection', items: [
    { type: 'SELECT BOX', icon: 'fa-caret-square-down' },
    { type: 'SELECT CHILD BOX', icon: 'fa-code-branch' },
    { type: 'RADIO BUTTON', icon: 'fa-dot-circle' },
    { type: 'CHECKBOX', icon: 'fa-check-square' },
  ]},
  { cat: 'Date & Time', items: [
    { type: 'DATE FIELD', icon: 'fa-calendar-alt' },
    { type: 'DATETIME FIELD', icon: 'fa-clock' },
  ]},
  { cat: 'Actions', items: [
    { type: 'SUBMIT BUTTON', icon: 'fa-check-square' },
    { type: 'DIAL BUTTON', icon: 'fa-phone-alt' },
  ]},
  { cat: 'Advanced', items: [
    { type: 'LIST', icon: 'fa-list' },
    { type: 'SELECT PHONE', icon: 'fa-phone' },
    { type: 'DISPOSITION COMBO', icon: 'fa-clipboard-list' },
    { type: 'COMMENTS', icon: 'fa-comment' },
  ]},
]

const DEFAULT_THEME = {
  columns: '2',
  gap: '20',
}

let uid = 1
const nextId = () => `f${uid++}_${Date.now()}`

function defaultField(type) {
  return {
    id: nextId(),
    type,
    label: '',
    placeholder: '',
    required: false,
    value: '',
    options: '',
    height: null,
    colspan: 1,
    floating: false,
    x: 0, y: 0, w: 0, h: 0,
  }
}

function FieldControl({ field, onChange }) {
  const t = field.type
  if (t === 'TEXT AREA' || t === 'COMMENTS') {
    return <textarea placeholder={field.placeholder || `Enter ${t.toLowerCase()}...`}
      value={field.value} onChange={(e) => onChange({ value: e.target.value })} />
  }
  if (['SELECT BOX','SELECT CHILD BOX','SELECT PHONE','DISPOSITION COMBO','LIST'].includes(t)) {
    const opts = (field.options || '').split(',').map(s => s.trim()).filter(Boolean)
    return (
      <select value={field.value} onChange={(e) => onChange({ value: e.target.value })}>
        <option value="">-- Select --</option>
        {opts.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    )
  }
  if (t === 'DATE FIELD') return <input type="date" value={field.value} onChange={(e) => onChange({ value: e.target.value })} />
  if (t === 'DATETIME FIELD') return <input type="datetime-local" value={field.value} onChange={(e) => onChange({ value: e.target.value })} />
  if (t === 'RADIO BUTTON' || t === 'CHECKBOX') {
    const opts = (field.options || '').split(',').map(s => s.trim()).filter(Boolean)
    const type = t === 'RADIO BUTTON' ? 'radio' : 'checkbox'
    return (
      <div style={{ display:'flex', gap:16, padding:'6px 0', flexWrap:'wrap' }}>
        {(opts.length ? opts : ['Option 1','Option 2']).map((o,i) => (
          <label key={i} style={{ display:'flex', gap:6, alignItems:'center', fontSize:'0.85rem' }}>
            <input type={type} name={field.id} /> {o}
          </label>
        ))}
      </div>
    )
  }
  if (t === 'SUBMIT BUTTON' || t === 'DIAL BUTTON') {
    return <button type="button" className="btn-blue"
      style={{ width:'100%', padding:'10px', border:'none', borderRadius:6, color:'white',
        background:'var(--primary)', cursor:'pointer', fontWeight:600 }}>
      {field.label || t}
    </button>
  }
  return <input type="text" placeholder={field.placeholder || `Enter ${t.toLowerCase()}...`}
    value={field.value} onChange={(e) => onChange({ value: e.target.value })} />
}

export default function CrmDesigner({ showToast }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [crmName, setCrmName] = useState('Untitled CRM')
  const [fields, setFields] = useState([])
  const [theme, setTheme] = useState(DEFAULT_THEME)
  const [selectedId, setSelectedId] = useState(null)
  const [mode, setMode] = useState('grid')  // grid | free
  const [preview, setPreview] = useState(false)

  const gridRef = useRef(null)
  const workspaceRef = useRef(null)
  const dragRef = useRef({ active:false, sourceType:null, sourceEl:null, offsetX:0, offsetY:0 })

  // ---------- Load ----------
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/crm/${id}`)
        setCrmName(data.name)
        setFields((data.fields || []).map(f => ({ ...defaultField(f.type), ...f, id: f.id || nextId() })))
        setTheme({ ...DEFAULT_THEME, ...(data.theme || {}) })
      } catch {
        showToast && showToast('CRM not found')
        navigate('/crm')
      } finally {
        setLoading(false)
      }
    })()
  }, [id])

  const selected = useMemo(() => fields.find(f => f.id === selectedId), [fields, selectedId])

  const updateField = (fid, patch) =>
    setFields(prev => prev.map(f => f.id === fid ? { ...f, ...patch } : f))

  const addField = (type, dropPoint) => {
    const nf = defaultField(type)
    setFields(prev => [...prev, nf])
    setSelectedId(nf.id)
    if (dropPoint) { /* can compute x,y for free mode if needed */ }
    showToast && showToast(`"${type}" added`)
  }

  const removeField = (fid) => {
    setFields(prev => prev.filter(f => f.id !== fid))
    if (selectedId === fid) setSelectedId(null)
  }

  // ---------- Drag from tool palette ----------
  const onToolDragStart = (e, type) => {
    dragRef.current = { active:true, sourceType:'tool', toolType:type }
    e.dataTransfer.effectAllowed = 'copy'
    e.dataTransfer.setData('text/plain', type)
  }

  const onCanvasDrop = (e) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('text/plain') || dragRef.current.toolType
    if (!type) return
    addField(type)
    dragRef.current.active = false
  }

  // ---------- Move existing field (free mode) ----------
  const startFieldDrag = (e, field) => {
    if (mode !== 'free' || !field.floating) return
    if (e.target.closest('.field-actions') || e.target.closest('.resize-handle')) return
    if (['INPUT','SELECT','TEXTAREA','BUTTON'].includes(e.target.tagName)) return
    e.preventDefault()
    const startX = e.clientX, startY = e.clientY
    const startLeft = field.x, startTop = field.y
    dragRef.current = { active:true, sourceType:'field', fid: field.id, startX, startY, startLeft, startTop }

    const move = (ev) => {
      const dx = ev.clientX - startX
      const dy = ev.clientY - startY
      updateField(field.id, { x: startLeft + dx, y: startTop + dy })
    }
    const up = () => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
      dragRef.current.active = false
    }
    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }

  const toggleFloat = (fid) => {
    const f = fields.find(x => x.id === fid)
    if (!f) return
    if (f.floating) {
      updateField(fid, { floating:false, x:0, y:0, w:0, h:0 })
    } else {
      const el = document.querySelector(`[data-fid="${fid}"]`)
      const rect = el?.getBoundingClientRect()
      const ws = workspaceRef.current?.getBoundingClientRect()
      updateField(fid, {
        floating:true,
        x: rect && ws ? rect.left - ws.left : 20,
        y: rect && ws ? rect.top - ws.top : 20,
        w: rect ? rect.width : 220,
        h: rect ? rect.height : 80,
      })
    }
  }

  // ---------- Save / Preview ----------
  const save = async () => {
    try {
      await api.put(`/crm/${id}`, { name: crmName, fields, theme })
      showToast && showToast('CRM saved')
    } catch {
      showToast && showToast('Save failed')
    }
  }

  if (loading) return <p style={{ padding: 30 }}>Loading...</p>

  return (
    <>
      <div className="breadcrumb">
        <a onClick={() => navigate('/campaign')}>Campaign</a>
        <span className="sep">›</span>
        <a onClick={() => navigate('/crm')}>CRM</a>
        <span className="sep">›</span>
        <span className="current">{crmName}</span>
      </div>

      <div style={{ display:'flex', gap: 0, height: 'calc(100vh - 120px)', overflow:'hidden' }}>
        {/* TOOLS PANEL */}
        {!preview && (
          <aside style={{
            width: 220, background:'var(--surface)', borderRight:'1px solid var(--border)',
            overflowY:'auto', padding: '12px 8px', flexShrink: 0,
          }}>
            <div style={{ fontSize:'0.72rem', fontWeight:700, color:'var(--text-muted)',
              textTransform:'uppercase', letterSpacing:'0.6px', padding:'8px 12px' }}>
              Form Elements
            </div>
            {TOOLS.map((group) => (
              <div key={group.cat}>
                <div style={{ fontSize:'0.65rem', fontWeight:700, textTransform:'uppercase',
                  letterSpacing:'0.6px', color:'var(--text-muted)', padding:'12px 8px 6px' }}>
                  {group.cat}
                </div>
                {group.items.map((it) => (
                  <div
                    key={it.type}
                    draggable
                    onDragStart={(e) => onToolDragStart(e, it.type)}
                    style={{
                      display:'flex', alignItems:'center', gap:10, padding:'9px 12px',
                      background:'#fafcff', border:'1px solid var(--border)', borderRadius:6,
                      fontSize:'0.8rem', fontWeight:500, cursor:'grab', marginBottom:6,
                      userSelect:'none',
                    }}
                  >
                    <i className={`fas ${it.icon}`} style={{ color:'var(--primary)', width:18, textAlign:'center' }}></i>
                    <span>{it.type}</span>
                  </div>
                ))}
              </div>
            ))}
          </aside>
        )}

        {/* CANVAS AREA */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
          {!preview && (
            <div style={{
              display:'flex', justifyContent:'space-between', alignItems:'flex-start',
              marginBottom: 16, flexWrap:'wrap', gap:12
            }}>
              <div>
                <input
                  value={crmName}
                  onChange={(e) => setCrmName(e.target.value)}
                  style={{
                    fontSize:'1.3rem', fontWeight:700, border:'none', background:'transparent',
                    color:'var(--text)', outline:'none', borderBottom:'1px dashed transparent',
                    padding:'4px 0', minWidth:220,
                  }}
                  onFocus={(e) => e.target.style.borderBottomColor = 'var(--border)'}
                  onBlur={(e) => e.target.style.borderBottomColor = 'transparent'}
                />
                <div style={{ fontSize:'0.8rem', color:'var(--text-muted)', marginTop:4 }}>
                  {fields.length} field{fields.length !== 1 ? 's' : ''} · {theme.columns} columns · {theme.gap}px gap
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-grey" onClick={() => setFields([])}>
                  <i className="fas fa-undo-alt"></i> Clear
                </button>
                <button className="btn btn-outline" onClick={() => setPreview(true)}>
                  <i className="fas fa-eye"></i> Preview
                </button>
                <button className="btn btn-blue" onClick={save}>
                  <i className="fas fa-save"></i> Save
                </button>
              </div>
            </div>
          )}

          {preview && (
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom: 16 }}>
              <div style={{ fontSize:'1.3rem', fontWeight:700 }}>{crmName} (Preview)</div>
              <button className="btn btn-blue" onClick={() => setPreview(false)}>
                <i className="fas fa-times"></i> Exit Preview
              </button>
            </div>
          )}

          {/* Mode toggles */}
          {!preview && (
            <div style={{
              display:'flex', gap:12, alignItems:'center', marginBottom:16,
              padding:'8px 12px', background:'var(--surface)', borderRadius:8,
              border:'1px solid var(--border)', flexWrap:'wrap'
            }}>
              <div style={{ display:'flex', gap:2, background:'#f5f8fc', padding:3, borderRadius:8, border:'1px solid var(--border)' }}>
                <button
                  onClick={() => setMode('grid')}
                  style={{
                    padding:'6px 12px', border:'none',
                    background: mode==='grid' ? 'var(--primary)' : 'transparent',
                    color: mode==='grid' ? 'white' : 'var(--text-muted)',
                    borderRadius:6, fontSize:'0.72rem', fontWeight:700, cursor:'pointer',
                  }}
                >
                  <i className="fas fa-th"></i> Grid
                </button>
                <button
                  onClick={() => setMode('free')}
                  style={{
                    padding:'6px 12px', border:'none',
                    background: mode==='free' ? 'var(--primary)' : 'transparent',
                    color: mode==='free' ? 'white' : 'var(--text-muted)',
                    borderRadius:6, fontSize:'0.72rem', fontWeight:700, cursor:'pointer',
                  }}
                >
                  <i className="fas fa-arrows-alt"></i> Free
                </button>
              </div>

              <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.78rem' }}>
                <span style={{ color:'var(--text-muted)' }}>Columns:</span>
                {['1','2','3','4'].map(c => (
                  <button key={c} onClick={() => setTheme({ ...theme, columns:c })}
                    style={{
                      width:28, height:26, border:'1px solid var(--border)', borderRadius:6,
                      background: theme.columns===c ? 'var(--primary)' : 'var(--surface)',
                      color: theme.columns===c ? 'white' : 'var(--text-muted)',
                      fontWeight:700, fontSize:'0.75rem', cursor:'pointer'
                    }}>
                    {c}
                  </button>
                ))}
              </div>

              <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:'0.78rem' }}>
                <span style={{ color:'var(--text-muted)' }}>Gap:</span>
                {['12','20','32'].map(g => (
                  <button key={g} onClick={() => setTheme({ ...theme, gap:g })}
                    style={{
                      padding:'4px 10px', border:'1px solid var(--border)', borderRadius:6,
                      background: theme.gap===g ? 'var(--primary)' : 'var(--surface)',
                      color: theme.gap===g ? 'white' : 'var(--text-muted)',
                      fontWeight:700, fontSize:'0.72rem', cursor:'pointer'
                    }}>
                    {g}px
                  </button>
                ))}
              </div>
            </div>
          )}

          {mode === 'free' && !preview && (
            <div style={{
              padding:'10px 16px', background:'linear-gradient(135deg,#fff4e6,#ffe8cc)',
              border:'1.5px solid #ffc078', borderRadius:6, marginBottom:16,
              fontSize:'0.8rem', fontWeight:600, color:'#8a4a00', display:'flex',
              alignItems:'center', gap:10
            }}>
              <i className="fas fa-arrows-alt"></i>
              <span><strong>Free Position Mode</strong> — Field ko pakad ke kahin bhi drag karo.</span>
            </div>
          )}

          {/* WORKSPACE */}
          <div
            ref={workspaceRef}
            onDragOver={(e) => e.preventDefault()}
            onDrop={onCanvasDrop}
            style={{
              background:'var(--surface)', borderRadius:14, padding:'28px 32px',
              minHeight: 500, border:'2px dashed var(--border)',
              position:'relative', transition:'border-color 0.2s',
            }}
          >
            {fields.length === 0 && (
              <div style={{
                textAlign:'center', padding:'60px 20px', color:'var(--text-muted)'
              }}>
                <i className="fas fa-arrow-left" style={{ fontSize:'2rem', opacity:0.3, marginBottom:12, display:'block' }}></i>
                <p>Drag form elements from the left panel to start</p>
              </div>
            )}

            <div
              ref={gridRef}
              style={{
                display: mode === 'grid' ? 'grid' : 'block',
                gridTemplateColumns: mode === 'grid' ? `repeat(${theme.columns}, 1fr)` : 'none',
                gap: `${theme.gap}px`,
                position: 'relative',
                minHeight: 200,
              }}
            >
              {fields.map((f) => {
                const isSel = f.id === selectedId
                if (f.floating && mode === 'free') {
                  return (
                    <div
                      key={f.id}
                      data-fid={f.id}
                      onMouseDown={(e) => startFieldDrag(e, f)}
                      onClick={(e) => { if (!e.target.closest('.field-actions')) setSelectedId(f.id) }}
                      style={{
                        position:'absolute', left: f.x, top: f.y,
                        width: f.w || 220, minHeight: f.h || undefined,
                        background:'var(--surface)', border: isSel ? '2px solid var(--accent)' : '1.5px solid var(--primary-light)',
                        borderRadius:8, padding:10, cursor:'move', zIndex: isSel ? 50 : 10,
                        boxShadow:'0 4px 16px rgba(44,95,158,0.15)',
                      }}
                    >
                      <FieldBlock
                        field={f}
                        selected={isSel}
                        onSelect={() => setSelectedId(f.id)}
                        onUpdate={(patch) => updateField(f.id, patch)}
                        onDelete={() => removeField(f.id)}
                        onToggleFloat={() => toggleFloat(f.id)}
                        isFloating
                      />
                    </div>
                  )
                }
                return (
                  <div
                    key={f.id}
                    data-fid={f.id}
                    onClick={(e) => { if (!e.target.closest('.field-actions')) setSelectedId(f.id) }}
                    style={{
                      border: isSel ? '2px solid var(--primary)' : '1px solid transparent',
                      background: isSel ? 'var(--primary-light)' : 'transparent',
                      borderRadius:6, padding:8, cursor:'pointer',
                      gridColumn: `span ${f.colspan || 1}`,
                      transition:'all 0.15s',
                    }}
                  >
                    <FieldBlock
                      field={f}
                      selected={isSel}
                      onSelect={() => setSelectedId(f.id)}
                      onUpdate={(patch) => updateField(f.id, patch)}
                      onDelete={() => removeField(f.id)}
                      onToggleFloat={() => toggleFloat(f.id)}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* PROPERTY PANEL */}
        {!preview && selected && (
          <aside style={{
            width: 340, background:'var(--surface)',
            borderLeft:'1px solid var(--border)',
            overflowY:'auto', flexShrink: 0,
            display:'flex', flexDirection:'column',
          }}>
            <div style={{
              padding:'16px 20px',
              background:'linear-gradient(135deg, var(--primary), var(--primary-dark))',
              color:'white', display:'flex', justifyContent:'space-between', alignItems:'center'
            }}>
              <h3 style={{ fontSize:'0.9rem', fontWeight:700, display:'flex', alignItems:'center', gap:8 }}>
                <i className="fas fa-sliders-h"></i> Field Properties
              </h3>
              <button onClick={() => setSelectedId(null)}
                style={{
                  width:26, height:26, border:'none', background:'rgba(255,255,255,0.15)',
                  color:'white', borderRadius:6, cursor:'pointer', fontSize:'0.7rem'
                }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div style={{ padding:20, display:'flex', flexDirection:'column', gap:16, overflowY:'auto', flex:1 }}>
              <div style={{ fontSize:'0.72rem', color:'var(--text-muted)' }}>
                Type: <strong>{selected.type}</strong>
              </div>

              <div>
                <label style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:0.4, color:'var(--text)', display:'block', marginBottom:6 }}>
                  Label
                </label>
                <input
                  value={selected.label}
                  onChange={(e) => updateField(selected.id, { label: e.target.value })}
                  placeholder="Field label"
                  style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--border)', borderRadius:6, fontSize:'0.85rem', outline:'none' }}
                />
              </div>

              {['INPUT FIELD','TEXT AREA','COMMENTS','SELECT PHONE'].includes(selected.type) && (
                <div>
                  <label style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:0.4, color:'var(--text)', display:'block', marginBottom:6 }}>
                    Placeholder
                  </label>
                  <input
                    value={selected.placeholder}
                    onChange={(e) => updateField(selected.id, { placeholder: e.target.value })}
                    placeholder="Hint text"
                    style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--border)', borderRadius:6, fontSize:'0.85rem', outline:'none' }}
                  />
                </div>
              )}

              {['SELECT BOX','SELECT CHILD BOX','RADIO BUTTON','CHECKBOX','LIST'].includes(selected.type) && (
                <div>
                  <label style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:0.4, color:'var(--text)', display:'block', marginBottom:6 }}>
                    Options (comma separated)
                  </label>
                  <textarea
                    value={selected.options}
                    onChange={(e) => updateField(selected.id, { options: e.target.value })}
                    placeholder="Option 1, Option 2, Option 3"
                    rows={3}
                    style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--border)', borderRadius:6, fontSize:'0.85rem', outline:'none', resize:'vertical', fontFamily:'inherit' }}
                  />
                </div>
              )}

              <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:'0.85rem', cursor:'pointer' }}>
                <input type="checkbox"
                  checked={selected.required}
                  onChange={(e) => updateField(selected.id, { required: e.target.checked })} />
                Required field
              </label>

              {mode === 'grid' && (
                <div>
                  <label style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:0.4, color:'var(--text)', display:'block', marginBottom:6 }}>
                    Colspan (width)
                  </label>
                  <select
                    value={selected.colspan || 1}
                    onChange={(e) => updateField(selected.id, { colspan: parseInt(e.target.value) })}
                    style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--border)', borderRadius:6, fontSize:'0.85rem', outline:'none' }}
                  >
                    {[1,2,3,4].map(n => (
                      <option key={n} value={n}>{n} column{n>1?'s':''}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ height:1, background:'var(--border)', margin:'4px 0' }} />

              <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:'0.85rem', cursor:'pointer' }}>
                <input type="checkbox"
                  checked={selected.floating}
                  onChange={() => toggleFloat(selected.id)}
                  disabled={mode !== 'free'} />
                Free Position (absolute)
              </label>

              <button className="btn btn-grey"
                onClick={() => removeField(selected.id)}
                style={{ marginTop:8, width:'100%', justifyContent:'center', color:'var(--danger)', borderColor:'var(--danger)' }}>
                <i className="fas fa-trash"></i> Delete Field
              </button>
            </div>
          </aside>
        )}
      </div>
    </>
  )
}

// ---------- Field block (label + control) ----------
function FieldBlock({ field, selected, onUpdate, onDelete, onToggleFloat, isFloating }) {
  return (
    <>
      <div style={{
        display:'flex', justifyContent:'space-between', alignItems:'center',
        marginBottom:6
      }}>
        <div style={{ fontSize:'0.78rem', fontWeight:700, color:'var(--text)' }}>
          {field.label || <span style={{ opacity:0.4, fontStyle:'italic' }}>{field.type}</span>}
          {field.required && <span style={{ color:'var(--danger)', marginLeft:3 }}>*</span>}
        </div>
        <div className="field-actions" style={{ display:'flex', gap:4, opacity: selected ? 1 : 0.6 }}>
          <button onClick={onToggleFloat} title="Toggle free position"
            style={{ width:22, height:22, border:'none', background:'transparent', color: isFloating ? 'var(--accent)' : 'var(--text-muted)', borderRadius:4, cursor:'pointer', fontSize:'0.7rem' }}>
            <i className="fas fa-arrows-alt"></i>
          </button>
          <button onClick={onDelete} title="Delete"
            style={{ width:22, height:22, border:'none', background:'transparent', color:'var(--text-muted)', borderRadius:4, cursor:'pointer', fontSize:'0.7rem' }}>
            <i className="fas fa-trash"></i>
          </button>
        </div>
      </div>

      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <FieldControl field={field} onChange={onUpdate} />
      </div>
    </>
  )
}
