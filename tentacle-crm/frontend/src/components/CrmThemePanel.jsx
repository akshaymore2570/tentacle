import { useState } from 'react'
import LiveColorPicker from './LiveColorPicker'

const DEFAULT_CRM_THEME = {
  crmPrimary: '#2c5f9e',
  crmAccent: '#e67e22',
  crmBg: '#ffffff',
  crmBgMode: 'solid',           // 'solid' | 'gradient'
  crmBgGrad1: '#ffffff',
  crmBgGrad2: '#e8f0fe',
  crmBgGradDir: '135deg',
  fieldBg: '#ffffff',
  fieldText: '#1e2a3a',
  fieldBorder: '#d8e2ee',
  fieldLabel: '#1e2a3a',
  fieldSize: 'medium',
  fieldRadius: '6',
  columns: '2',
  gap: '20',
}

const CRM_PRESETS = [
  { name: 'Royal Blue', primary: '#2c5f9e', accent: '#e67e22', bg: '#ffffff' },
  { name: 'Emerald',    primary: '#0e9f6e', accent: '#f59e0b', bg: '#f0fdf4' },
  { name: 'Purple',     primary: '#7c3aed', accent: '#ec4899', bg: '#faf5ff' },
  { name: 'Crimson',    primary: '#dc2626', accent: '#0891b2', bg: '#fef2f2' },
  { name: 'Teal',       primary: '#0d9488', accent: '#f97316', bg: '#f0fdfa' },
  { name: 'Midnight',   primary: '#1e293b', accent: '#f59e0b', bg: '#f1f5f9' },
]

const BACKGROUND_PRESETS = [
  { name: 'White',      c1: '#ffffff', c2: '#ffffff', mode: 'solid' },
  { name: 'Light Grey', c1: '#f5f8fc', c2: '#f5f8fc', mode: 'solid' },
  { name: 'Cream',      c1: '#fefaf0', c2: '#fefaf0', mode: 'solid' },
  { name: 'Sky',        c1: '#e0f2fe', c2: '#bae6fd', mode: 'gradient', dir: '135deg' },
  { name: 'Sunset',     c1: '#fef3c7', c2: '#fed7aa', mode: 'gradient', dir: '135deg' },
  { name: 'Mint',       c1: '#d1fae5', c2: '#a7f3d0', mode: 'gradient', dir: '135deg' },
  { name: 'Rose',       c1: '#ffe4e6', c2: '#fecdd3', mode: 'gradient', dir: '135deg' },
  { name: 'Ocean',      c1: '#ffffff', c2: '#2c5f9e', mode: 'gradient', dir: '135deg' },
  { name: 'Lavender',   c1: '#ede9fe', c2: '#ddd6fe', mode: 'gradient', dir: '135deg' },
]

const GRADIENT_DIRS = [
  { label: '↘', value: '135deg' },
  { label: '↙', value: '225deg' },
  { label: '↓', value: '90deg' },
  { label: '→', value: '0deg' },
]

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  }
}
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const h = Math.max(0, Math.min(255, Math.round(x))).toString(16)
    return h.length === 1 ? '0' + h : h
  }).join('')
}
export function adjustColor(hex, percent) {
  try {
    const { r, g, b } = hexToRgb(hex)
    const adj = (c) => c + (percent > 0 ? (255 - c) * percent : c * percent)
    return rgbToHex(adj(r), adj(g), adj(b))
  } catch { return hex }
}

export { DEFAULT_CRM_THEME, CRM_PRESETS }

export default function CrmThemePanel({ theme, onChange, onClose }) {
  const [tab, setTab] = useState('theme')
  const [openPicker, setOpenPicker] = useState(null)

  const set = (key, val) => onChange({ ...theme, [key]: val })

  // Live color picker row
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
          if (/^#[0-9a-fA-F]{6}$/.test(v)) set(field, v.toLowerCase())
        }}
      />
      {openPicker === field && (
        <LiveColorPicker
          value={value}
          onChange={(newColor) => set(field, newColor)}
          onClose={() => setOpenPicker(null)}
        />
      )}
    </div>
  )

  // Current canvas background CSS
  const canvasBg = theme.crmBgMode === 'gradient'
    ? `linear-gradient(${theme.crmBgGradDir || '135deg'}, ${theme.crmBgGrad1 || '#ffffff'}, ${theme.crmBgGrad2 || '#e8f0fe'})`
    : theme.crmBg

  return (
    <div
      className="theme-panel"
      style={{ top: 76, right: 24, position: 'fixed' }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div className="tp-header">
        <h3><i className="fas fa-palette"></i> CRM Designer Settings</h3>
        <button className="tp-close" onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
      </div>

      <div className="tp-tabs">
        <div className={`tp-tab ${tab === 'theme' ? 'active' : ''}`} onClick={() => setTab('theme')}>
          <i className="fas fa-palette"></i> Theme
        </div>
        <div className={`tp-tab ${tab === 'background' ? 'active' : ''}`} onClick={() => setTab('background')}>
          <i className="fas fa-fill-drip"></i> Background
        </div>
        <div className={`tp-tab ${tab === 'fields' ? 'active' : ''}`} onClick={() => setTab('fields')}>
          <i className="fas fa-i-cursor"></i> Fields
        </div>
        <div className={`tp-tab ${tab === 'layout' ? 'active' : ''}`} onClick={() => setTab('layout')}>
          <i className="fas fa-columns"></i> Layout
        </div>
      </div>

      <div className="tp-body">

        {/* ============ THEME TAB ============ */}
        {tab === 'theme' && (
          <>
            <div>
              <div className="tp-section-title">Preset Themes</div>
              <div className="tp-presets">
                {CRM_PRESETS.map(p => (
                  <div
                    key={p.name}
                    className={`tp-preset ${theme.crmPrimary === p.primary && theme.crmAccent === p.accent ? 'active' : ''}`}
                    onClick={() => onChange({
                      ...theme,
                      crmPrimary: p.primary,
                      crmAccent: p.accent,
                      crmBg: p.bg,
                      crmBgMode: 'solid',
                    })}
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
              <div className="tp-section-title">Brand Colors</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                <ColorRow label="Primary Color" value={theme.crmPrimary} field="crmPrimary" />
                <ColorRow label="Accent Color" value={theme.crmAccent} field="crmAccent" />
              </div>
            </div>
          </>
        )}

        {/* ============ BACKGROUND TAB — NEW! ============ */}
        {tab === 'background' && (
          <>
            <div className="tp-info" style={{
              padding: 10, background: 'var(--primary-light)', borderRadius: 6,
              fontSize: '0.75rem', color: 'var(--primary)', marginBottom: 12,
              lineHeight: 1.4,
            }}>
              <i className="fas fa-info-circle"></i> Canvas/Form ka poora background — Solid ya Gradient.
            </div>

            {/* Live preview of canvas background */}
            <div>
              <div className="tp-section-title">Preview</div>
              <div style={{
                height: 80, borderRadius: 8,
                border: '1px solid var(--border)',
                background: canvasBg,
                marginTop: 8,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', color: theme.crmBgMode === 'gradient' && theme.crmBgGrad1 < '#888' ? 'white' : 'var(--text-muted)',
                boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.05)',
              }}>
                Canvas Background Preview
              </div>
            </div>

            {/* Mode toggle */}
            <div>
              <div className="tp-section-title">Background Mode</div>
              <div style={{ display: 'flex', gap: 4, background: '#f5f8fc', padding: 4, borderRadius: 8, border: '1px solid var(--border)', marginTop: 8 }}>
                <button
                  onClick={() => set('crmBgMode', 'solid')}
                  style={{
                    flex: 1, padding: '8px 12px', border: 'none',
                    background: theme.crmBgMode === 'solid' ? 'var(--primary)' : 'transparent',
                    color: theme.crmBgMode === 'solid' ? 'white' : 'var(--text-muted)',
                    borderRadius: 6, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                  }}>
                  <i className="fas fa-square"></i> Solid
                </button>
                <button
                  onClick={() => set('crmBgMode', 'gradient')}
                  style={{
                    flex: 1, padding: '8px 12px', border: 'none',
                    background: theme.crmBgMode === 'gradient' ? 'var(--primary)' : 'transparent',
                    color: theme.crmBgMode === 'gradient' ? 'white' : 'var(--text-muted)',
                    borderRadius: 6, fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                  }}>
                  <i className="fas fa-fill-drip"></i> Gradient
                </button>
              </div>
            </div>

            {/* Preset backgrounds */}
            <div>
              <div className="tp-section-title">Preset Backgrounds</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 8 }}>
                {BACKGROUND_PRESETS.map(p => (
                  <div
                    key={p.name}
                    onClick={() => onChange({
                      ...theme,
                      crmBgMode: p.mode,
                      crmBg: p.c1,
                      crmBgGrad1: p.c1,
                      crmBgGrad2: p.c2,
                      crmBgGradDir: p.dir || '135deg',
                    })}
                    title={p.name}
                    style={{
                      height: 52, borderRadius: 6, border: '2px solid var(--border)',
                      cursor: 'pointer', position: 'relative',
                      background: p.mode === 'gradient'
                        ? `linear-gradient(${p.dir || '135deg'}, ${p.c1}, ${p.c2})`
                        : p.c1,
                    }}
                  >
                    <div style={{
                      position: 'absolute', bottom: 2, left: 4,
                      fontSize: '0.62rem', fontWeight: 700,
                      color: p.c1 === '#1e293b' ? 'white' : 'var(--text)',
                      textShadow: '0 1px 2px rgba(255,255,255,0.8)',
                    }}>
                      {p.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Solid color picker */}
            {theme.crmBgMode === 'solid' && (
              <div>
                <div className="tp-section-title">Solid Color</div>
                <div style={{ marginTop: 8 }}>
                  <ColorRow label="Canvas Color" value={theme.crmBg} field="crmBg" />
                </div>
              </div>
            )}

            {/* Gradient options */}
            {theme.crmBgMode === 'gradient' && (
              <>
                <div>
                  <div className="tp-section-title">Gradient Colors</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                    <ColorRow label="Start Color" value={theme.crmBgGrad1 || '#ffffff'} field="crmBgGrad1" />
                    <ColorRow label="End Color" value={theme.crmBgGrad2 || '#e8f0fe'} field="crmBgGrad2" />
                  </div>
                </div>

                <div>
                  <div className="tp-section-title">Direction</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginTop: 8 }}>
                    {GRADIENT_DIRS.map(d => (
                      <div
                        key={d.value}
                        onClick={() => set('crmBgGradDir', d.value)}
                        style={{
                          padding: '10px 6px',
                          border: `2px solid ${theme.crmBgGradDir === d.value ? 'var(--primary)' : 'var(--border)'}`,
                          borderRadius: 6,
                          background: theme.crmBgGradDir === d.value ? 'var(--primary-light)' : 'var(--surface)',
                          textAlign: 'center', fontSize: '1rem', cursor: 'pointer',
                          color: theme.crmBgGradDir === d.value ? 'var(--primary)' : 'var(--text-muted)',
                        }}>
                        {d.label}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* ============ FIELDS TAB ============ */}
        {tab === 'fields' && (
          <>
            <div>
              <div className="tp-section-title">Field Colors</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                <ColorRow label="Field Background" value={theme.fieldBg} field="fieldBg" />
                <ColorRow label="Field Text" value={theme.fieldText} field="fieldText" />
                <ColorRow label="Field Border" value={theme.fieldBorder} field="fieldBorder" />
                <ColorRow label="Label Color" value={theme.fieldLabel} field="fieldLabel" />
              </div>
            </div>

            <div>
              <div className="tp-section-title">Field Size (Global)</div>
              <div className="size-picker" style={{ display: 'flex', gap: 6 }}>
                {['small', 'medium', 'large'].map(s => (
                  <div
                    key={s}
                    onClick={() => set('fieldSize', s)}
                    style={{
                      flex: 1, padding: '10px 8px',
                      border: `2px solid ${theme.fieldSize === s ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: 6,
                      background: theme.fieldSize === s ? 'var(--primary-light)' : 'var(--surface)',
                      textAlign: 'center', fontSize: '0.72rem', fontWeight: 600,
                      cursor: 'pointer', textTransform: 'capitalize',
                    }}
                  >
                    {s}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="tp-section-title">Border Radius</div>
              <div className="size-picker" style={{ display: 'flex', gap: 6 }}>
                {[
                  { label: 'Square', value: '0' },
                  { label: 'Rounded', value: '6' },
                  { label: 'Pill', value: '20' },
                ].map(r => (
                  <div
                    key={r.value}
                    onClick={() => set('fieldRadius', r.value)}
                    style={{
                      flex: 1, padding: '10px 8px',
                      border: `2px solid ${theme.fieldRadius === r.value ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: 6,
                      background: theme.fieldRadius === r.value ? 'var(--primary-light)' : 'var(--surface)',
                      textAlign: 'center', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {r.label}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ============ LAYOUT TAB ============ */}
        {tab === 'layout' && (
          <>
            <div>
              <div className="tp-section-title">Columns per Row</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                {['1', '2', '3', '4'].map(n => (
                  <div
                    key={n}
                    onClick={() => set('columns', n)}
                    style={{
                      flex: 1, padding: '10px 8px',
                      border: `2px solid ${theme.columns === n ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: 6,
                      background: theme.columns === n ? 'var(--primary-light)' : 'var(--surface)',
                      textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
                      color: theme.columns === n ? 'var(--primary)' : 'var(--text)',
                    }}
                  >
                    {n}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="tp-section-title">Gap Between Fields</div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                {[
                  { label: 'Compact', value: '12' },
                  { label: 'Normal', value: '20' },
                  { label: 'Spacious', value: '32' },
                ].map(g => (
                  <div
                    key={g.value}
                    onClick={() => set('gap', g.value)}
                    style={{
                      flex: 1, padding: '10px 8px',
                      border: `2px solid ${theme.gap === g.value ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: 6,
                      background: theme.gap === g.value ? 'var(--primary-light)' : 'var(--surface)',
                      textAlign: 'center', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    {g.label}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

      </div>

      <div className="tp-actions">
        <button className="btn btn-grey" onClick={() => onChange({ ...DEFAULT_CRM_THEME })}>
          <i className="fas fa-undo-alt"></i> Reset
        </button>
        <button className="btn btn-blue" onClick={onClose}>
          <i className="fas fa-check"></i> Done
        </button>
      </div>
    </div>
  )
}
