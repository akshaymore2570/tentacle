import { useState } from 'react'
import { useTheme, DEFAULT_APP_THEME } from '../store/themeStore'

const APP_THEME_PRESETS = [
  { name: 'Royal Blue', primary: '#2c5f9e', accent: '#e67e22', bg: '#f0f4f8', surface: '#ffffff', border: '#d8e2ee', text: '#1e2a3a', muted: '#6b7d91' },
  { name: 'Emerald', primary: '#0e9f6e', accent: '#f59e0b', bg: '#f0fdf4', surface: '#ffffff', border: '#bbf7d0', text: '#14532d', muted: '#4d7c0f' },
  { name: 'Purple', primary: '#7c3aed', accent: '#ec4899', bg: '#faf5ff', surface: '#ffffff', border: '#e9d5ff', text: '#4c1d95', muted: '#8b5cf6' },
  { name: 'Crimson', primary: '#dc2626', accent: '#0891b2', bg: '#fef2f2', surface: '#ffffff', border: '#fecaca', text: '#7f1d1d', muted: '#b91c1c' },
  { name: 'Teal', primary: '#0d9488', accent: '#f97316', bg: '#f0fdfa', surface: '#ffffff', border: '#99f6e4', text: '#134e4a', muted: '#0f766e' },
  { name: 'Midnight', primary: '#1e293b', accent: '#f59e0b', bg: '#f1f5f9', surface: '#ffffff', border: '#cbd5e1', text: '#0f172a', muted: '#64748b' },
]

const GRADIENT_PRESETS = [
  { name: 'Ocean', c1: '#ffffff', c2: '#2c5f9e', dir: '135deg' },
  { name: 'Sunset', c1: '#fef3c7', c2: '#f97316', dir: '135deg' },
  { name: 'Purple', c1: '#faf5ff', c2: '#7c3aed', dir: '135deg' },
  { name: 'Emerald', c1: '#f0fdf4', c2: '#0e9f6e', dir: '135deg' },
  { name: 'Rose', c1: '#fff1f2', c2: '#e11d48', dir: '135deg' },
  { name: 'Midnight', c1: '#1e293b', c2: '#0f172a', dir: '135deg' },
  { name: 'Sky', c1: '#e0f2fe', c2: '#0284c7', dir: '180deg' },
  { name: 'Peach', c1: '#fff7ed', c2: '#fb7185', dir: '135deg' },
  { name: 'Forest', c1: '#f0fdf4', c2: '#166534', dir: '135deg' },
]

export default function ThemePanel({ onClose, showToast }) {
  const [tab, setTab] = useState('theme')
  const { theme, setTheme, reset, saveToServer } = useTheme()

  const update = (key, val) => setTheme({ [key]: val })

  const applyPreset = (p) => {
    setTheme({ ...p })
    showToast && showToast(`Theme: ${p.name}`)
  }

  const applyGradient = (g) => {
    setTheme({ bgMode: 'gradient', gradC1: g.c1, gradC2: g.c2, gradDir: g.dir })
    showToast && showToast(`Gradient: ${g.name}`)
  }

  const save = async () => {
    const res = await saveToServer()
    showToast && showToast(res.ok ? 'Theme saved' : 'Save failed')
    if (res.ok) onClose()
  }

  const ColorRow = ({ label, value, onChange }) => (
    <div className="tp-color-row">
      <label className="tp-color-preview" style={{ background: value }}>
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} />
      </label>
      <div className="tp-color-info">
        <div className="name">{label}</div>
        <div className="hex">{value.toUpperCase()}</div>
      </div>
      <input
        className="tp-hex-input"
        value={value.toUpperCase()}
        maxLength={7}
        onChange={(e) => {
          let v = e.target.value.trim()
          if (!v.startsWith('#')) v = '#' + v
          if (/^#[0-9a-fA-F]{6}$/.test(v)) onChange(v.toLowerCase())
        }}
      />
    </div>
  )

  return (
    <div className="theme-panel">
      <div className="tp-header">
        <h3><i className="fas fa-palette"></i> App Theme &amp; Colors</h3>
        <button className="tp-close" onClick={onClose}><i className="fas fa-times"></i></button>
      </div>

      <div className="tp-tabs">
        <div className={`tp-tab ${tab === 'theme' ? 'active' : ''}`} onClick={() => setTab('theme')}>
          <i className="fas fa-palette"></i> Theme
        </div>
        <div className={`tp-tab ${tab === 'background' ? 'active' : ''}`} onClick={() => setTab('background')}>
          <i className="fas fa-fill-drip"></i> Background
        </div>
        <div className={`tp-tab ${tab === 'font' ? 'active' : ''}`} onClick={() => setTab('font')}>
          <i className="fas fa-font"></i> Text
        </div>
      </div>

      <div className="tp-body">
        {tab === 'theme' && (
          <>
            <div>
              <div className="tp-section-title">Preset Themes</div>
              <div className="tp-presets">
                {APP_THEME_PRESETS.map((p) => (
                  <div
                    key={p.name}
                    className={`tp-preset ${theme.primary === p.primary && theme.accent === p.accent ? 'active' : ''}`}
                    onClick={() => applyPreset(p)}
                  >
                    <div className="tp-preset-swatches">
                      <div className="tp-preset-swatch" style={{ background: p.primary }} />
                      <div className="tp-preset-swatch" style={{ background: p.accent }} />
                      <div className="tp-preset-swatch" style={{ background: p.bg, borderColor: '#e0e8f0' }} />
                    </div>
                    <span>{p.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="tp-section-title">Custom Colors</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                <ColorRow label="Primary" value={theme.primary} onChange={(v) => update('primary', v)} />
                <ColorRow label="Accent" value={theme.accent} onChange={(v) => update('accent', v)} />
                <ColorRow label="Surface" value={theme.surface} onChange={(v) => update('surface', v)} />
                <ColorRow label="Border" value={theme.border} onChange={(v) => update('border', v)} />
              </div>
            </div>
          </>
        )}

        {tab === 'background' && (
          <>
            <div>
              <div className="tp-section-title">Background Mode</div>
              <div className="bg-mode-toggle">
                <button className={theme.bgMode === 'solid' ? 'active' : ''} onClick={() => update('bgMode', 'solid')}>
                  <i className="fas fa-square"></i> Solid
                </button>
                <button className={theme.bgMode === 'gradient' ? 'active' : ''} onClick={() => update('bgMode', 'gradient')}>
                  <i className="fas fa-fill-drip"></i> Gradient
                </button>
              </div>
            </div>

            {theme.bgMode === 'solid' ? (
              <ColorRow label="Page Background" value={theme.bg} onChange={(v) => update('bg', v)} />
            ) : (
              <>
                <div>
                  <div className="tp-section-title">Gradient Presets</div>
                  <div className="gradient-presets">
                    {GRADIENT_PRESETS.map((g) => (
                      <div
                        key={g.name}
                        className={`gradient-preset ${theme.gradC1 === g.c1 && theme.gradC2 === g.c2 ? 'active' : ''}`}
                        style={{ background: `linear-gradient(${g.dir}, ${g.c1}, ${g.c2})` }}
                        title={g.name}
                        onClick={() => applyGradient(g)}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <div className="tp-section-title">Gradient Colors</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                    <ColorRow label="Start Color" value={theme.gradC1} onChange={(v) => update('gradC1', v)} />
                    <ColorRow label="End Color" value={theme.gradC2} onChange={(v) => update('gradC2', v)} />
                  </div>
                </div>
                <div>
                  <div className="tp-section-title">Direction</div>
                  <div className="direction-picker">
                    {[
                      { d: '135deg', i: 'fa-arrow-down-right' },
                      { d: '225deg', i: 'fa-arrow-down-left' },
                      { d: '90deg', i: 'fa-arrow-down' },
                      { d: '0deg', i: 'fa-arrow-right' },
                    ].map((x) => (
                      <div
                        key={x.d}
                        className={`direction-option ${theme.gradDir === x.d ? 'active' : ''}`}
                        onClick={() => update('gradDir', x.d)}
                      >
                        <i className={`fas ${x.i}`}></i>
                        <span>{x.d}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {tab === 'font' && (
          <>
            <div>
              <div className="tp-section-title">Text Colors</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                <ColorRow label="Main Text" value={theme.text} onChange={(v) => update('text', v)} />
                <ColorRow label="Muted Text" value={theme.muted} onChange={(v) => update('muted', v)} />
              </div>
            </div>
          </>
        )}
      </div>

      <div className="tp-actions">
        <button className="btn btn-grey" onClick={() => { reset(); showToast && showToast('Reset to defaults') }}>
          <i className="fas fa-undo-alt"></i> Reset
        </button>
        <button className="btn btn-blue" onClick={save}>
          <i className="fas fa-check"></i> Save
        </button>
      </div>
    </div>
  )
}
