import { useEffect, useMemo, useState } from 'react'
import api from '../api'

// ---------- Permission structure (must match backend seed) ----------
const PERMISSION_STRUCTURE = [
  { id:'dashboard', title:'Dashboard Permissions', icon:'fa-chart-pie', rows:[
    { key:'dashboard_main', label:'Main Dashboard', actions:['view'] },
    { key:'dashboard_analytics', label:'Analytics Panel', actions:['view','download'] },
    { key:'dashboard_realtime', label:'Realtime Stats', actions:['view'] },
  ]},
  { id:'campaign', title:'Campaign Role Permissions', icon:'fa-bullhorn', rows:[
    { key:'campaign_list', label:'Campaign List', actions:['view','add','edit','delete'] },
    { key:'campaign_create', label:'Create Campaign', actions:['view','add'] },
    { key:'campaign_sub', label:'Sub Campaign', actions:['view','add'] },
    { key:'campaign_assign', label:'Assign Campaign', actions:['view','add'] },
  ]},
  { id:'crm', title:'CRM Role Permissions', icon:'fa-table', rows:[
    { key:'crm_designer', label:'CRM Designer', actions:['view','add','edit'] },
    { key:'crm_table', label:'CRM Table', actions:['view','download'] },
    { key:'crm_history', label:'CRM History Report', actions:['view','download'] },
    { key:'crm_dispositions', label:'Dispositions', actions:['view','add'] },
  ]},
  { id:'reports', title:'Reports Role Permissions', icon:'fa-chart-line', rows:[
    { key:'report_campaign', label:'Campaign', actions:['view'] },
    { key:'report_summary', label:'Summary', actions:['view','download'] },
    { key:'report_cdr', label:'CDRReport', actions:['view','download'] },
  ]},
  { id:'users', title:'User Management Permissions', icon:'fa-users', rows:[
    { key:'users_list', label:'User List', actions:['view','add','edit','delete'] },
    { key:'groups', label:'Groups', actions:['view','add','edit','delete'] },
    { key:'roles', label:'Roles', actions:['view','add','edit','delete'] },
  ]},
]

function initials(n='?') {
  return n.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()
}
const colorFor = (i) => ['blue','purple','orange','pink','teal','green'][i % 6]

// ---------- Modal for Role ----------
function RoleModal({ role, users, onClose, onSave }) {
  const [name, setName] = useState(role?.name || '')
  const [description, setDescription] = useState(role?.description || '')
  const [permissions, setPermissions] = useState(role?.permissions || {})
  const [search, setSearch] = useState('')
  const [collapsed, setCollapsed] = useState({})

  const toggle = (key, action) => {
    setPermissions(prev => {
      const curr = new Set(prev[key] || [])
      curr.has(action) ? curr.delete(action) : curr.add(action)
      return { ...prev, [key]: Array.from(curr) }
    })
  }
  const toggleRowAll = (row, on) => {
    setPermissions(prev => ({ ...prev, [row.key]: on ? [...row.actions] : [] }))
  }
  const toggleSection = (section, on) => {
    setPermissions(prev => {
      const n = { ...prev }
      section.rows.forEach(r => { n[r.key] = on ? [...r.actions] : [] })
      return n
    })
  }

  const totalSelected = useMemo(() =>
    Object.values(permissions).reduce((s, arr) => s + (arr?.length || 0), 0)
  , [permissions])

  const assignedCount = useMemo(() => {
    if (!role?.id) return 0
    return users.filter(u => (u.roles || []).includes(role.id)).length
  }, [role, users])

  const matchesSearch = (section, row) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      section.title.toLowerCase().includes(q) ||
      row.label.toLowerCase().includes(q) ||
      row.key.toLowerCase().includes(q)
    )
  }

  return (
    <div style={{
      position:'fixed', inset:0, background:'rgba(15,23,42,0.6)',
      backdropFilter:'blur(8px)', zIndex:1000,
      display:'flex', alignItems:'center', justifyContent:'center', padding:20,
    }}>
      <div style={{
        background:'var(--bg)', borderRadius:16, width:'100%',
        maxWidth:1400, height:'calc(100vh - 40px)', maxHeight: 960,
        display:'flex', flexDirection:'column', overflow:'hidden',
        boxShadow:'0 32px 80px rgba(0,0,0,0.4)',
      }}>
        {/* Header */}
        <div style={{
          padding:'18px 28px',
          background:'linear-gradient(135deg, var(--primary), var(--primary-dark))',
          color:'white', display:'flex', justifyContent:'space-between', alignItems:'center',
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{
              width:46, height:46, borderRadius:12, background:'rgba(255,255,255,0.18)',
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.1rem'
            }}>
              <i className="fas fa-user-tag"></i>
            </div>
            <div>
              <h2 style={{ fontSize:'1.15rem', fontWeight:800 }}>
                {role?.id ? `Edit Role — ${role.name}` : 'Create New Role'}
              </h2>
              <p style={{ fontSize:'0.78rem', opacity:0.85 }}>
                {role?.id ? 'Update role details and permissions' : 'Define role details and select permissions'}
              </p>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{
              background:'rgba(255,255,255,0.15)', padding:'7px 14px', borderRadius:30,
              fontSize:'0.8rem', fontWeight:600, display:'flex', alignItems:'center', gap:6,
            }}>
              <i className="fas fa-key"></i> Selected:
              <strong style={{ background:'white', color:'var(--primary)', padding:'2px 9px', borderRadius:10, fontSize:'0.76rem', minWidth:28, textAlign:'center' }}>
                {totalSelected}
              </strong>
            </div>
            <button onClick={onClose} style={{
              width:38, height:38, border:'none', background:'rgba(255,255,255,0.15)',
              color:'white', borderRadius:10, cursor:'pointer', fontSize:'0.95rem'
            }}>
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex:1, display:'grid', gridTemplateColumns:'340px 1fr', overflow:'hidden' }}>
          {/* Info panel */}
          <div style={{
            background:'white', borderRight:'1px solid var(--border)',
            padding:24, overflowY:'auto', display:'flex', flexDirection:'column', gap:20,
          }}>
            <div style={{ fontSize:'0.72rem', fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'var(--primary)', display:'flex', alignItems:'center', gap:8 }}>
              <i className="fas fa-circle-info"></i> Role Details
            </div>

            <div>
              <label style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:0.3, display:'block', marginBottom:6 }}>
                Role Name <span style={{ color:'var(--danger)' }}>*</span>
              </label>
              <input value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Campaign Manager"
                style={{ width:'100%', padding:'11px 14px', border:'1.5px solid var(--border)', borderRadius:8, fontSize:'0.88rem', outline:'none' }} />
            </div>

            <div>
              <label style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', letterSpacing:0.3, display:'block', marginBottom:6 }}>
                Description
              </label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                placeholder="What can this role do..."
                rows={4}
                style={{ width:'100%', padding:'11px 14px', border:'1.5px solid var(--border)', borderRadius:8, fontSize:'0.88rem', outline:'none', resize:'vertical', fontFamily:'inherit' }} />
            </div>

            <div style={{
              marginTop:'auto', background:'linear-gradient(135deg, #fafcff, #f0f6ff)',
              border:'1px solid var(--border)', borderRadius:12, padding:'4px 16px'
            }}>
              <div style={{ fontSize:'0.7rem', fontWeight:800, textTransform:'uppercase', letterSpacing:1, color:'var(--primary)', padding:'14px 0 10px' }}>
                <i className="fas fa-chart-simple"></i> Summary
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'11px 0', fontSize:'0.82rem', color:'var(--text-muted)', borderTop:'1px dashed var(--border)' }}>
                <span><i className="fas fa-key" style={{ color:'var(--primary)', marginRight:6 }}></i> Total Permissions</span>
                <strong style={{ color:'var(--text)' }}>{totalSelected}</strong>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'11px 0', fontSize:'0.82rem', color:'var(--text-muted)', borderTop:'1px dashed var(--border)' }}>
                <span><i className="fas fa-users" style={{ color:'var(--primary)', marginRight:6 }}></i> Assigned Users</span>
                <strong style={{ color:'var(--text)' }}>{assignedCount}</strong>
              </div>
            </div>
          </div>

          {/* Permissions panel */}
          <div style={{ background:'#fafcff', display:'flex', flexDirection:'column', overflow:'hidden' }}>
            <div style={{
              padding:'16px 24px', background:'white', borderBottom:'1px solid var(--border)',
              display:'flex', justifyContent:'space-between', alignItems:'center', gap:16, flexWrap:'wrap',
            }}>
              <div style={{ position:'relative', flex:1, maxWidth:340 }}>
                <i className="fas fa-search" style={{ position:'absolute', left:14, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', fontSize:'0.82rem' }}></i>
                <input value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search permissions..."
                  style={{ width:'100%', padding:'9px 14px 9px 38px', border:'1.5px solid var(--border)', borderRadius:8, fontSize:'0.85rem', outline:'none' }} />
              </div>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={() => {
                  const all = {}
                  PERMISSION_STRUCTURE.forEach(s => s.rows.forEach(r => { all[r.key] = [...r.actions] }))
                  setPermissions(all)
                }} style={{ padding:'8px 14px', fontSize:'0.76rem', fontWeight:700, border:'1.5px solid var(--border)', background:'white', borderRadius:8, cursor:'pointer' }}>
                  <i className="fas fa-check-double"></i> Select All
                </button>
                <button onClick={() => setPermissions({})} style={{ padding:'8px 14px', fontSize:'0.76rem', fontWeight:700, border:'1.5px solid var(--border)', background:'white', borderRadius:8, cursor:'pointer' }}>
                  <i className="fas fa-times"></i> Clear
                </button>
              </div>
            </div>

            <div style={{ flex:1, overflowY:'auto', padding:'20px 24px 24px', display:'flex', flexDirection:'column', gap:16 }}>
              {PERMISSION_STRUCTURE.map((section) => {
                const visibleRows = section.rows.filter(r => matchesSearch(section, r))
                if (search && visibleRows.length === 0) return null

                const isCollapsed = !!collapsed[section.id]
                const sectionSelected = section.rows.filter(r => (permissions[r.key]?.length || 0) > 0).length

                return (
                  <div key={section.id} style={{
                    background:'white', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden',
                  }}>
                    <div onClick={() => setCollapsed(p => ({ ...p, [section.id]: !p[section.id] }))}
                      style={{
                        padding:'16px 20px', background:'linear-gradient(135deg, #f8fafd, #eef4fd)',
                        display:'flex', justifyContent:'space-between', alignItems:'center',
                        cursor:'pointer', borderBottom: isCollapsed ? 'none' : '1px solid var(--border)',
                      }}>
                      <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                        <div style={{
                          width:40, height:40, borderRadius:10,
                          background:'linear-gradient(135deg, var(--primary), var(--primary-dark))',
                          color:'white', display:'flex', alignItems:'center', justifyContent:'center',
                        }}>
                          <i className={`fas ${section.icon}`}></i>
                        </div>
                        <div style={{ fontSize:'0.92rem', fontWeight:800, textTransform:'uppercase', letterSpacing:0.3 }}>
                          {section.title}
                        </div>
                        <span style={{
                          fontSize:'0.72rem', fontWeight:700, color:'var(--primary)',
                          background:'var(--primary-light)', padding:'3px 11px', borderRadius:12,
                        }}>
                          {sectionSelected}/{section.rows.length}
                        </span>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <button onClick={(e) => { e.stopPropagation(); toggleSection(section, sectionSelected < section.rows.length) }}
                          style={{ fontSize:'0.76rem', fontWeight:700, color:'var(--primary)', padding:'6px 12px', borderRadius:6, background:'white', border:'1px solid var(--border)', cursor:'pointer' }}>
                          Toggle All
                        </button>
                        <i className="fas fa-chevron-down" style={{
                          color:'var(--text-muted)', fontSize:'0.85rem',
                          transform: isCollapsed ? 'rotate(-90deg)' : 'none', transition:'transform 0.25s'
                        }}></i>
                      </div>
                    </div>

                    {!isCollapsed && visibleRows.map((row) => {
                      const selectedArr = permissions[row.key] || []
                      const rowOn = selectedArr.length > 0
                      return (
                        <div key={row.key} style={{
                          display:'flex', alignItems:'center', gap:16,
                          padding:'13px 20px', borderBottom:'1px solid #f1f5fa',
                          minHeight:54,
                        }}>
                          <label style={{ flex:1, display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}>
                            <input type="checkbox" checked={rowOn}
                              onChange={() => toggleRowAll(row, !rowOn)}
                              style={{ width:18, height:18, accentColor:'var(--primary)', cursor:'pointer' }} />
                            <span style={{ fontSize:'0.88rem', fontWeight:700 }}>
                              {row.label}
                              <span style={{ fontSize:'0.7rem', color:'var(--text-muted)', fontWeight:500, marginLeft:8, fontFamily:'monospace', background:'#f1f5f9', padding:'2px 8px', borderRadius:6 }}>
                                {row.key}
                              </span>
                            </span>
                          </label>
                          <div style={{ display:'flex', gap:8, flexWrap:'wrap', justifyContent:'flex-end' }}>
                            {row.actions.map((a) => {
                              const on = selectedArr.includes(a)
                              return (
                                <label key={a} style={{
                                  display:'flex', alignItems:'center', gap:6,
                                  fontSize:'0.78rem', fontWeight:600,
                                  padding:'6px 12px', borderRadius:20,
                                  border: on ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
                                  background: on ? 'var(--primary)' : 'white',
                                  color: on ? 'white' : 'var(--text-muted)',
                                  cursor:'pointer', userSelect:'none', whiteSpace:'nowrap',
                                }}>
                                  <input type="checkbox" checked={on} onChange={() => toggle(row.key, a)}
                                    style={{ width:14, height:14, accentColor:'white', cursor:'pointer', margin:0 }} />
                                  {a}
                                </label>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding:'16px 28px', background:'white', borderTop:'1px solid var(--border)',
          display:'flex', justifyContent:'space-between', alignItems:'center', gap:16,
        }}>
          <div style={{ fontSize:'0.82rem', color:'var(--text-muted)' }}>
            <i className="fas fa-circle-info" style={{ color:'var(--primary)', marginRight:6 }}></i>
            Selected: <strong style={{ color:'var(--primary)' }}>{totalSelected}</strong> permissions
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={onClose} style={{
              padding:'11px 24px', borderRadius:10, fontSize:'0.88rem', fontWeight:700,
              border:'1.5px solid var(--border)', background:'white', cursor:'pointer'
            }}>Cancel</button>
            <button onClick={() => {
              if (!name.trim()) return alert('Role name required')
              if (totalSelected === 0) return alert('Select at least one permission')
              onSave({ name: name.trim(), description: description.trim(), permissions })
            }} style={{
              padding:'11px 28px', borderRadius:10, fontSize:'0.88rem', fontWeight:700,
              border:'none', background:'linear-gradient(135deg, var(--primary), var(--primary-dark))',
              color:'white', cursor:'pointer', boxShadow:'0 4px 14px rgba(44,95,158,0.3)'
            }}>
              <i className="fas fa-check"></i> Save Role
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------- MAIN PAGE ----------
export default function UserManagement({ showToast }) {
  const [tab, setTab] = useState('users')
  const [users, setUsers] = useState([])
  const [groups, setGroups] = useState([])
  const [roles, setRoles] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [panelMode, setPanelMode] = useState(null) // 'user'|'group'|null
  const [roleModal, setRoleModal] = useState(null) // {role?}

  const loadAll = async () => {
    try {
      const [u, g, r, c] = await Promise.all([
        api.get('/users'), api.get('/groups'), api.get('/roles'), api.get('/campaigns')
      ])
      setUsers(u.data); setGroups(g.data); setRoles(r.data); setCampaigns(c.data)
    } catch { showToast && showToast('Load failed') }
  }
  useEffect(() => { loadAll() }, [])

  const items = tab === 'users' ? users : tab === 'groups' ? groups : roles
  const filtered = items.filter(it =>
    !search || it.name.toLowerCase().includes(search.toLowerCase()) ||
    (it.username && it.username.toLowerCase().includes(search.toLowerCase()))
  )

  const switchTab = (t) => { setTab(t); setSelectedId(null); setSearch(''); setPanelMode(null) }

  const handleAdd = () => {
    if (tab === 'users') { setPanelMode('user'); setSelectedId(null) }
    else if (tab === 'groups') { setPanelMode('group'); setSelectedId(null) }
    else setRoleModal({ role: null })
  }

  // ---------- USERS ----------
  const saveUser = async (data) => {
    try {
      if (selectedId) await api.put(`/users/${selectedId}`, data)
      else await api.post('/users', data)
      showToast && showToast(selectedId ? 'User updated' : 'User created')
      setPanelMode(null); setSelectedId(null); loadAll()
    } catch (e) {
      showToast && showToast(e.response?.data?.error || 'Save failed')
    }
  }
  const deleteUser = async (id) => {
    const u = users.find(x => x.id === id)
    if (!confirm(`Delete user "${u?.name}"?`)) return
    try { await api.delete(`/users/${id}`); showToast && showToast('User deleted'); loadAll(); setSelectedId(null); setPanelMode(null) }
    catch { showToast && showToast('Delete failed') }
  }

  // ---------- GROUPS ----------
  const saveGroup = async (data) => {
    try {
      if (selectedId) await api.put(`/groups/${selectedId}`, data)
      else await api.post('/groups', data)
      showToast && showToast(selectedId ? 'Group updated' : 'Group created')
      setPanelMode(null); setSelectedId(null); loadAll()
    } catch (e) { showToast && showToast('Save failed') }
  }
  const deleteGroup = async (id) => {
    const g = groups.find(x => x.id === id)
    if (!confirm(`Delete group "${g?.name}"?`)) return
    try { await api.delete(`/groups/${id}`); showToast && showToast('Group deleted'); loadAll(); setSelectedId(null); setPanelMode(null) }
    catch { showToast && showToast('Delete failed') }
  }

  // ---------- ROLES ----------
  const saveRole = async (data) => {
    try {
      if (roleModal?.role?.id) await api.put(`/roles/${roleModal.role.id}`, data)
      else await api.post('/roles', data)
      showToast && showToast('Role saved')
      setRoleModal(null); loadAll()
    } catch { showToast && showToast('Save failed') }
  }
  const deleteRole = async (id) => {
    const r = roles.find(x => x.id === id)
    if (!confirm(`Delete role "${r?.name}"?`)) return
    try { await api.delete(`/roles/${id}`); showToast && showToast('Role deleted'); loadAll() }
    catch { showToast && showToast('Delete failed') }
  }

  return (
    <div style={{ padding:'0 0 40px' }}>
      <div className="page-header">
        <div>
          <h1><i className="fas fa-users"></i> User Management</h1>
          <p>Manage users, groups, and roles</p>
        </div>
        <button className="btn-blue" onClick={handleAdd}>
          <i className="fas fa-plus"></i> New {tab.slice(0,-1)}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:8, padding:'0 32px 16px', flexWrap:'wrap' }}>
        {[
          { k:'users', l:'Users', i:'fa-user', count: users.length },
          { k:'groups', l:'Groups', i:'fa-users-cog', count: groups.length },
          { k:'roles', l:'Roles', i:'fa-user-tag', count: roles.length },
        ].map(t => (
          <button key={t.k} onClick={() => switchTab(t.k)}
            style={{
              padding:'9px 16px', borderRadius:8, fontWeight:700, fontSize:'0.82rem',
              border: tab===t.k ? '1.5px solid var(--primary)' : '1.5px solid var(--border)',
              background: tab===t.k ? 'var(--primary)' : 'white',
              color: tab===t.k ? 'white' : 'var(--text-muted)',
              cursor:'pointer', display:'inline-flex', alignItems:'center', gap:8,
            }}>
            <i className={`fas ${t.i}`}></i> {t.l} <span style={{ opacity:0.7 }}>({t.count})</span>
          </button>
        ))}

        <div style={{ marginLeft:'auto', position:'relative' }}>
          <i className="fas fa-search" style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', color:'var(--text-muted)', fontSize:'0.8rem' }}></i>
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            style={{ padding:'9px 14px 9px 36px', border:'1.5px solid var(--border)', borderRadius:8, fontSize:'0.82rem', outline:'none', minWidth:220 }} />
        </div>
      </div>

      {/* Rows */}
      <div style={{ padding:'0 32px' }}>
        <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:12, overflow:'hidden', boxShadow:'var(--shadow-sm)' }}>
          {filtered.length === 0 && (
            <div style={{ padding:'60px 20px', textAlign:'center', color:'var(--text-muted)' }}>
              <i className="fas fa-inbox" style={{ fontSize:'2rem', opacity:0.3, marginBottom:12, display:'block' }}></i>
              No {tab} found
            </div>
          )}

          {filtered.map((item, i) => {
            const isSel = selectedId === item.id
            let badgeCount = 0
            if (tab === 'users') badgeCount = (item.roles?.length || 0) + (item.groups?.length || 0)
            if (tab === 'groups') badgeCount = (item.campaigns?.length || 0)
            if (tab === 'roles') badgeCount = Object.values(item.permissions || {}).reduce((s,a) => s + (a?.length || 0), 0)

            return (
              <div key={item.id} onClick={() => {
                setSelectedId(item.id)
                if (tab === 'users') setPanelMode('user')
                else if (tab === 'groups') setPanelMode('group')
                else setRoleModal({ role: item })
              }} style={{
                display:'flex', alignItems:'center', gap:14, padding:'14px 20px',
                borderBottom:'1px solid var(--border)', cursor:'pointer',
                background: isSel ? 'var(--primary-light)' : 'transparent',
              }}>
                <div style={{
                  width:42, height:42, borderRadius:10,
                  background: `linear-gradient(135deg, var(--primary), var(--primary-dark))`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  color:'white', fontWeight:700, fontSize:'0.85rem'
                }}>
                  {tab === 'users' ? initials(item.name) : <i className={`fas ${tab==='groups'?'fa-users':'fa-user-tag'}`}></i>}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'0.88rem', fontWeight:700, marginBottom:3 }}>
                    {item.name} {item.active === false && <span style={{ fontSize:'0.7rem', color:'var(--danger)', fontWeight:500 }}>· Inactive</span>}
                  </div>
                  <div style={{ fontSize:'0.75rem', color:'var(--text-muted)' }}>
                    {tab === 'users' && <>@{item.username}</>}
                    {tab === 'groups' && <>{item.description || 'No description'}</>}
                    {tab === 'roles' && <>{item.description || 'No description'}</>}
                  </div>
                </div>
                <div style={{
                  fontSize:'0.72rem', fontWeight:700, background:'var(--primary-light)',
                  color:'var(--primary)', padding:'4px 10px', borderRadius:20
                }}>
                  {badgeCount} {tab === 'roles' ? 'perms' : tab === 'groups' ? 'campaigns' : 'links'}
                </div>
                <button onClick={(e) => {
                  e.stopPropagation()
                  if (tab === 'users') deleteUser(item.id)
                  else if (tab === 'groups') deleteGroup(item.id)
                  else deleteRole(item.id)
                }} style={{
                  width:30, height:30, borderRadius:8, border:'1px solid var(--border)',
                  background:'white', color:'var(--text-muted)', cursor:'pointer'
                }}>
                  <i className="fas fa-trash" style={{ fontSize:'0.75rem' }}></i>
                </button>
                <i className="fas fa-chevron-right" style={{ color:'var(--text-muted)', fontSize:'0.8rem' }}></i>
              </div>
            )
          })}
        </div>
      </div>

      {/* SIDE PANEL for User/Group */}
      {panelMode && (
        <SidePanel
          mode={panelMode}
          item={selectedId ? (panelMode==='user' ? users.find(u=>u.id===selectedId) : groups.find(g=>g.id===selectedId)) : null}
          users={users} groups={groups} roles={roles} campaigns={campaigns}
          onClose={() => { setPanelMode(null); setSelectedId(null) }}
          onSave={panelMode==='user' ? saveUser : saveGroup}
          onDelete={panelMode==='user' ? deleteUser : deleteGroup}
        />
      )}

      {/* ROLE MODAL */}
      {roleModal && (
        <RoleModal
          role={roleModal.role}
          users={users}
          onClose={() => setRoleModal(null)}
          onSave={saveRole}
        />
      )}
    </div>
  )
}

// ---------- SIDE PANEL (add/edit user or group) ----------
function SidePanel({ mode, item, users, groups, roles, campaigns, onClose, onSave, onDelete }) {
  const [name, setName] = useState(item?.name || '')
  const [username, setUsername] = useState(item?.username || '')
  const [password, setPassword] = useState('')
  const [description, setDescription] = useState(item?.description || '')
  const [active, setActive] = useState(item?.active !== false)
  const [selRoles, setSelRoles] = useState(item?.roles || [])
  const [selGroups, setSelGroups] = useState(item?.groups || [])
  const [selCamps, setSelCamps] = useState(item?.campaigns || [])

  const toggle = (arr, setArr, val) =>
    setArr(arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val])

  const save = () => {
    if (!name.trim()) return alert('Name required')
    if (mode === 'user') {
      if (!username.trim()) return alert('Username required')
      const payload = { name: name.trim(), username: username.trim(), active, roles: selRoles, groups: selGroups }
      if (password) payload.password = password
      else if (!item) return alert('Password required for new user')
      onSave(payload)
    } else {
      onSave({ name: name.trim(), description, active, campaigns: selCamps })
    }
  }

  return (
    <div style={{
      position:'fixed', top:64, right:0, bottom:0, width:380,
      background:'var(--surface)', borderLeft:'1px solid var(--border)',
      boxShadow:'-8px 0 24px rgba(0,0,0,0.08)', zIndex:500,
      display:'flex', flexDirection:'column',
    }}>
      <div style={{
        padding:'16px 20px',
        background:'linear-gradient(135deg, var(--primary), var(--primary-dark))',
        color:'white', display:'flex', justifyContent:'space-between', alignItems:'center',
      }}>
        <h3 style={{ fontSize:'0.95rem', fontWeight:700 }}>
          <i className="fas fa-sliders-h" style={{ marginRight:8 }}></i>
          {item ? `Edit ${mode}` : `New ${mode}`}
        </h3>
        <button onClick={onClose} style={{
          width:28, height:28, border:'none', background:'rgba(255,255,255,0.15)',
          color:'white', borderRadius:6, cursor:'pointer'
        }}>
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div style={{ flex:1, padding:20, overflowY:'auto', display:'flex', flexDirection:'column', gap:16 }}>
        <div>
          <label style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', display:'block', marginBottom:6 }}>
            Name *
          </label>
          <input value={name} onChange={(e) => setName(e.target.value)}
            style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--border)', borderRadius:6, fontSize:'0.85rem', outline:'none' }} />
        </div>

        {mode === 'user' && (
          <>
            <div>
              <label style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', display:'block', marginBottom:6 }}>
                Username *
              </label>
              <input value={username} onChange={(e) => setUsername(e.target.value)}
                style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--border)', borderRadius:6, fontSize:'0.85rem', outline:'none' }} />
            </div>
            <div>
              <label style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', display:'block', marginBottom:6 }}>
                Password {item ? '(leave blank to keep)' : '*'}
              </label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--border)', borderRadius:6, fontSize:'0.85rem', outline:'none' }} />
            </div>
            <div>
              <label style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', display:'block', marginBottom:6 }}>
                Roles
              </label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, padding:10, background:'#fafcff', border:'1px solid var(--border)', borderRadius:8 }}>
                {roles.map(r => (
                  <label key={r.id} style={{
                    display:'inline-flex', alignItems:'center', gap:5,
                    padding:'5px 10px', borderRadius:20,
                    background: selRoles.includes(r.id) ? 'var(--primary)' : 'white',
                    color: selRoles.includes(r.id) ? 'white' : 'var(--text-muted)',
                    border: '1.5px solid ' + (selRoles.includes(r.id) ? 'var(--primary)' : 'var(--border)'),
                    fontSize:'0.72rem', fontWeight:600, cursor:'pointer'
                  }}>
                    <input type="checkbox" checked={selRoles.includes(r.id)}
                      onChange={() => toggle(selRoles, setSelRoles, r.id)}
                      style={{ display:'none' }} />
                    <i className="fas fa-user-tag"></i> {r.name}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', display:'block', marginBottom:6 }}>
                Groups
              </label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, padding:10, background:'#fafcff', border:'1px solid var(--border)', borderRadius:8 }}>
                {groups.map(g => (
                  <label key={g.id} style={{
                    display:'inline-flex', alignItems:'center', gap:5,
                    padding:'5px 10px', borderRadius:20,
                    background: selGroups.includes(g.id) ? 'var(--primary)' : 'white',
                    color: selGroups.includes(g.id) ? 'white' : 'var(--text-muted)',
                    border: '1.5px solid ' + (selGroups.includes(g.id) ? 'var(--primary)' : 'var(--border)'),
                    fontSize:'0.72rem', fontWeight:600, cursor:'pointer'
                  }}>
                    <input type="checkbox" checked={selGroups.includes(g.id)}
                      onChange={() => toggle(selGroups, setSelGroups, g.id)}
                      style={{ display:'none' }} />
                    <i className="fas fa-users"></i> {g.name}
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        {mode === 'group' && (
          <>
            <div>
              <label style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', display:'block', marginBottom:6 }}>
                Description
              </label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                rows={3}
                style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--border)', borderRadius:6, fontSize:'0.85rem', outline:'none', fontFamily:'inherit', resize:'vertical' }} />
            </div>
            <div>
              <label style={{ fontSize:'0.72rem', fontWeight:700, textTransform:'uppercase', display:'block', marginBottom:6 }}>
                Assigned Campaigns
              </label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6, padding:10, background:'#fafcff', border:'1px solid var(--border)', borderRadius:8 }}>
                {campaigns.map(c => (
                  <label key={c.id} style={{
                    display:'inline-flex', alignItems:'center', gap:5,
                    padding:'5px 10px', borderRadius:20,
                    background: selCamps.includes(c.id) ? 'var(--primary)' : 'white',
                    color: selCamps.includes(c.id) ? 'white' : 'var(--text-muted)',
                    border: '1.5px solid ' + (selCamps.includes(c.id) ? 'var(--primary)' : 'var(--border)'),
                    fontSize:'0.72rem', fontWeight:600, cursor:'pointer'
                  }}>
                    <input type="checkbox" checked={selCamps.includes(c.id)}
                      onChange={() => toggle(selCamps, setSelCamps, c.id)}
                      style={{ display:'none' }} />
                    <i className="fas fa-bullhorn"></i> {c.name}
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        <label style={{ display:'flex', alignItems:'center', gap:8, fontSize:'0.85rem' }}>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Active
        </label>
      </div>

      <div style={{ display:'flex', gap:8, padding:16, borderTop:'1px solid var(--border)', background:'#fafcff' }}>
        {item && (
          <button onClick={() => onDelete(item.id)} style={{
            padding:'9px 14px', border:'1.5px solid var(--danger)', background:'white',
            color:'var(--danger)', borderRadius:6, fontWeight:700, fontSize:'0.8rem', cursor:'pointer'
          }}>
            <i className="fas fa-trash"></i>
          </button>
        )}
        <button onClick={onClose} style={{
          flex:1, padding:'9px 14px', border:'1px solid var(--border)', background:'white',
          color:'var(--text)', borderRadius:6, fontWeight:600, fontSize:'0.82rem', cursor:'pointer'
        }}>
          Cancel
        </button>
        <button onClick={save} style={{
          flex:1, padding:'9px 14px', border:'none',
          background:'var(--primary)', color:'white',
          borderRadius:6, fontWeight:700, fontSize:'0.82rem', cursor:'pointer'
        }}>
          <i className="fas fa-check"></i> Save
        </button>
      </div>
    </div>
  )
}
