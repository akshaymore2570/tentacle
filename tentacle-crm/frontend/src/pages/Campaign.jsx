import { useNavigate } from 'react-router-dom'

const MENU = [
  { action: 'crm',            icon: 'fa-table',           title: 'CRM',             desc: 'Manage and design your CRM forms' },
  { action: 'dispositions',   icon: 'fa-clipboard-list',  title: 'Dispositions',    desc: 'Manage call dispositions and outcomes' },
  { action: 'create-campaign',icon: 'fa-plus-circle',     title: 'Create Campaign', desc: 'Start a new outbound campaign' },
  { action: 'sub-campaign',   icon: 'fa-layer-group',     title: 'Sub Campaign',    desc: 'Manage sub-campaigns and lists' },
  { action: 'crm-table',      icon: 'fa-database',        title: 'CRM Table',       desc: 'View raw CRM data tables' },
]

export default function Campaign() {
  const navigate = useNavigate()

  const handle = (action) => {
    if (action === 'crm') navigate('/crm')
  }

  return (
    <>
      <div className="breadcrumb"><a>Campaign</a></div>
      <div className="page-header">
        <div>
          <h1><i className="fas fa-bullhorn"></i> Campaign</h1>
          <p>Manage your campaign settings</p>
        </div>
      </div>

      <div className="submenu-grid">
        {MENU.map((m) => (
          <div key={m.action} className="submenu-card" onClick={() => handle(m.action)}>
            <div className="submenu-icon"><i className={`fas ${m.icon}`}></i></div>
            <h3>{m.title}</h3>
            <p>{m.desc}</p>
            <i className="fas fa-arrow-right" style={{
              position: 'absolute', top: 20, right: 20,
              color: 'var(--text-muted)', fontSize: '0.75rem'
            }}></i>
          </div>
        ))}
      </div>
    </>
  )
}
