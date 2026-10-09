import { useNavigate } from 'react-router-dom'

const MENU = [
  { action: 'campaigns',      icon: 'fa-bullhorn',        title: 'Campaigns',       desc: 'Create and manage your campaigns' },
  { action: 'crm',            icon: 'fa-table',           title: 'CRM',             desc: 'Manage and design your CRM forms' },
  { action: 'crm-tables',     icon: 'fa-database',        title: 'CRM Tables',      desc: 'Define data tables with custom columns' },
  { action: 'dispositions',   icon: 'fa-clipboard-list',  title: 'Dispositions',    desc: 'Manage call dispositions and outcomes' },
]

export default function Campaign() {
  const navigate = useNavigate()
  const handle = (action) => {
    if (action === 'campaigns') navigate('/campaigns')
    if (action === 'crm') navigate('/crm')
    if (action === 'crm-tables') navigate('/crm-table')
    if (action === 'dispositions') navigate('/dispositions')
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
          </div>
        ))}
      </div>
    </>
  )
}
