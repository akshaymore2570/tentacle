import { useState, useEffect } from 'react'
import { useTheme, DEFAULT_APP_THEME } from '../store/themeStore'
import LiveColorPicker from './LiveColorPicker'

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

const FONTS = [
  { name: 'Inter', value: "'Inter', system-ui, sans-serif" },
  { name: 'Roboto', value: "'Roboto', sans-serif" },
  { name: 'Poppins', value: "'Poppins', sans-serif" },
  { name: 'Open Sans', value: "'Open Sans', sans-serif" },
  { name: 'Lato', value: "'Lato', sans-serif" },
  { name: 'Montserrat', value: "'Montserrat', sans-serif" },
  { name: 'Nunito', value: "'Nunito', sans-serif" },
  { name: 'System Default', value: 'system-ui, -apple-system, sans-serif' },
  { name: 'Serif', value: 'Georgia, serif' },
  { name: 'Monospace', value: "'Courier New', monospace" },
]

const FONT_SIZES = [
  { label: 'Small', value: '13px', preview: 'Aa' },
  { label: 'Medium', value: '14px', preview: 'Aa' },
  { label: 'Large', value: '16px', preview: 'Aa' },
  { label: 'X-Large', value: '18px', preview: 'Aa' },
]

const LINE_HEIGHTS = [
  { label: 'Compact', value: '1.3' },
  { label: 'Normal', value: '1.5' },
  { label: 'Relaxed', value: '1.7' },
]

export default function ThemePanel({ onClose, showToast }) {
  const [tab, setTab] = useState('theme')
  const [openPicker, setOpenPicker] = useState(null)
  const [fontsLoaded, setFontsLoaded] = useState(false)
  const { theme, setTheme, reset, saveToServer } = useTheme()

  const update = (key, val) => setTheme({ [key]: val })

  // Dynamically load Google Fonts when font family changes
  useEffect(() => {
    if (!theme.fontFamily) return
    const fontName = theme.fontFamily.split(',')[0].replace(/['"]/g, '').trim()
    if (!fontName || fontName === 'system-ui' || fontName === 'Georgia' || fontName === 'Courier New') return

    const existing = document.querySelector(`link[data-font="${fontName}"]`)
    if (existing) return

    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.dataset.font = fontName
    link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/ /g, '+')}:wght@300;400;500;600;700&display=swap`
    document.head.appendChild(link)
    setFontsLoaded(true)
  }, [theme.fontFamily])

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

  const ColorRow = ({ label, value, field }) => (
    <div className="tp-color-row" style={{ position: 'relative' }}>
      <div
        className="tp-color-preview"
        style={{ background: value, cursor: 'pointer' }}
        onClick={(e) => {
          e.stopPropagation()
          setOpenPicker(openPicker === field ? null : field)
        }}
      />
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
          if (/^#[0-9a-fA-F]{6}$/.test(v)) update(field, v.toLowerCase())
        }}
      />
      {openPicker === field && (
        <LiveColorPicker
          value={value}
          onChange={(newColor) => update(field, newColor)}
          onClose={() => setOpenPicker(null)}
        />
      )}
    </div>
  )

  return (
    <div
      className="theme-panel"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
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
        <div className={`tp-tab ${tab === 'text' ? 'active' : ''}`} onClick={() => setTab('text')}>
          <i className="fas fa-font"></i> Text
        </div>
      </div>

      <div className="tp-body">

        {/* ============ THEME TAB ============ */}
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
                <ColorRow label="Primary" value={theme.primary} field="primary" />
                <ColorRow label="Accent" value={theme.accent} field="accent" />
                <ColorRow label="Surface" value={theme.surface} field="surface" />
                <ColorRow label="Border" value={theme.border} field="border" />
              </div>
            </div>
          </>
        )}

        {/* ============ BACKGROUND TAB ============ */}
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
              <ColorRow label="Page Background" value={theme.bg} field="bg" />
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
                    <ColorRow label="Start Color" value={theme.gradC1} field="gradC1" />
                    <ColorRow label="End Color" value={theme.gradC2} field="gradC2" />
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

        {/* ============ TEXT TAB — UPDATED! ============ */}
        {tab === 'text' && (
          <>
            {/* Text Colors */}
            <div>
              <div className="tp-section-title">Text Colors</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                <ColorRow label="Main Text" value={theme.text || '#1e2a3a'} field="text" />
                <ColorRow label="Muted Text" value={theme.muted || '#6b7d91'} field="muted" />
              </div>
            </div>

            {/* ★ FONT FAMILY */}
            <div>
              <div className="tp-section-title">Font Family</div>
              <select
                value={theme.fontFamily || "'Inter', system-ui, sans-serif"}
                onChange={(e) => update('fontFamily', e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', marginTop: 8,
                  border: '1px solid var(--border)', borderRadius: 6,
                  fontSize: '0.88rem', outline: 'none',
                  background: 'var(--surface)', color: 'var(--text)',
                  fontFamily: theme.fontFamily || "'Inter', system-ui, sans-serif",
                }}
              >
                {FONTS.map(f => (
                  <option key={f.name} value={f.value} style={{ fontFamily: f.value }}>
                    {f.name}
                  </option>
                ))}
              </select>

              {/* Font preview */}
              <div style={{
                marginTop: 8, padding: '14px 16px',
                border: '1px solid var(--border)', borderRadius: 8,
                background: 'var(--bg)',
                fontFamily: theme.fontFamily || "'Inter', system-ui, sans-serif",
                fontSize: theme.fontSize || '14px',
                lineHeight: theme.lineHeight || '1.5',
                color: 'var(--text)',
              }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 4 }}>
                  The quick brown fox
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.85 }}>
                  jumps over the lazy dog. 1234567890
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 6 }}>
                  Preview: {FONTS.find(f => f.value === (theme.fontFamily || FONTS[0].value))?.name || 'Inter'}
                  {' · '}{theme.fontSize || '14px'}
                  {' · '}{theme.lineHeight || '1.5'}
                </div>
              </div>
            </div>

            {/* ★ FONT SIZE */}
            <div>
              <div className="tp-section-title">Base Font Size</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 8 }}>
                {FONT_SIZES.map(fs => (
                  <div
                    key={fs.value}
                    onClick={() => update('fontSize', fs.value)}
                    style={{
                      padding: '10px 6px',
                      border: `2px solid ${(theme.fontSize || '14px') === fs.value ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: 6,
                      background: (theme.fontSize || '14px') === fs.value ? 'var(--primary-light)' : 'var(--surface)',
                      textAlign: 'center',
                      cursor: 'pointer',
                      color: (theme.fontSize || '14px') === fs.value ? 'var(--primary)' : 'var(--text-muted)',
                      fontSize: fs.value,
                      fontWeight: 600,
                      lineHeight: 1,
                    }}
                  >
                    <div style={{ fontSize: fs.value }}>{fs.preview}</div>
                    <div style={{ fontSize: '0.65rem', marginTop: 4, fontWeight: 700 }}>
                      {fs.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ★ LINE HEIGHT */}
            <div>
              <div className="tp-section-title">Line Height</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 8 }}>
                {LINE_HEIGHTS.map(lh => (
                  <div
                    key={lh.value}
                    onClick={() => update('lineHeight', lh.value)}
                    style={{
                      padding: '10px 6px',
                      border: `2px solid ${(theme.lineHeight || '1.5') === lh.value ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: 6,
                      background: (theme.lineHeight || '1.5') === lh.value ? 'var(--primary-light)' : 'var(--surface)',
                      textAlign: 'center',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      color: (theme.lineHeight || '1.5') === lh.value ? 'var(--primary)' : 'var(--text)',
                    }}
                  >
                    {lh.label}
                  </div>
                ))}
              </div>
            </div>

            {/* ★ FONT WEIGHT FOR HEADINGS */}
            <div>
              <div className="tp-section-title">Heading Weight</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 8 }}>
                {[
                  { label: 'Light', value: '300' },
                  { label: 'Normal', value: '400' },
                  { label: 'Bold', value: '600' },
                  { label: 'Black', value: '800' },
                ].map(w => (
                  <div
                    key={w.value}
                    onClick={() => update('headingWeight', w.value)}
                    style={{
                      padding: '10px 6px',
                      border: `2px solid ${(theme.headingWeight || '600') === w.value ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: 6,
                      background: (theme.headingWeight || '600') === w.value ? 'var(--primary-light)' : 'var(--surface)',
                      textAlign: 'center',
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                      fontWeight: parseInt(w.value),
                      color: (theme.headingWeight || '600') === w.value ? 'var(--primary)' : 'var(--text)',
                    }}
                  >
                    {w.label}
                  </div>
                ))}
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
