import { create } from 'zustand'
import api from '../api'

export const DEFAULT_APP_THEME = {
  primary: '#2c5f9e',
  accent: '#e67e22',
  bg: '#f0f4f8',
  surface: '#ffffff',
  border: '#d8e2ee',
  text: '#1e2a3a',
  muted: '#6b7d91',
  bgMode: 'solid',
  gradC1: '#ffffff',
  gradC2: '#2c5f9e',
  gradDir: '135deg',
  // ★ NEW: Typography
  fontFamily: "'Inter', system-ui, sans-serif",
  fontSize: '14px',
  lineHeight: '1.5',
  headingWeight: '600',
}

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

export function applyThemeToDOM(theme) {
  const root = document.documentElement
  root.style.setProperty('--primary', theme.primary)
  root.style.setProperty('--primary-dark', adjustColor(theme.primary, -0.35))
  root.style.setProperty('--primary-light', adjustColor(theme.primary, 0.88))
  root.style.setProperty('--accent', theme.accent)
  root.style.setProperty('--bg', theme.bg)
  root.style.setProperty('--surface', theme.surface)
  root.style.setProperty('--border', theme.border)
  root.style.setProperty('--text', theme.text)
  root.style.setProperty('--text-muted', theme.muted)
  root.style.setProperty('--bg-gradient-c1', theme.gradC1)
  root.style.setProperty('--bg-gradient-c2', theme.gradC2)
  root.style.setProperty('--bg-gradient-dir', theme.gradDir)

  // ★ Typography
  root.style.setProperty('--font-family', theme.fontFamily || "'Inter', system-ui, sans-serif")
  root.style.setProperty('--font-size-base', theme.fontSize || '14px')
  root.style.setProperty('--line-height-base', theme.lineHeight || '1.5')
  root.style.setProperty('--heading-weight', theme.headingWeight || '600')

  // Also update body
  document.body.style.fontFamily = theme.fontFamily || "'Inter', system-ui, sans-serif"
  document.body.style.fontSize = theme.fontSize || '14px'
  document.body.style.lineHeight = theme.lineHeight || '1.5'

  if (theme.bgMode === 'gradient') document.body.classList.add('gradient-bg')
  else document.body.classList.remove('gradient-bg')
}

export const useTheme = create((set, get) => ({
  theme: { ...DEFAULT_APP_THEME },

  loadFromServer: async () => {
    try {
      const { data } = await api.get('/theme')
      const merged = { ...DEFAULT_APP_THEME, ...(data || {}) }
      applyThemeToDOM(merged)
      set({ theme: merged })
    } catch {
      applyThemeToDOM(DEFAULT_APP_THEME)
    }
  },

  setTheme: (partial) => {
    const next = { ...get().theme, ...partial }
    applyThemeToDOM(next)
    set({ theme: next })
  },

  saveToServer: async () => {
    try {
      await api.put('/theme', get().theme)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e.message }
    }
  },

  reset: () => {
    applyThemeToDOM(DEFAULT_APP_THEME)
    set({ theme: { ...DEFAULT_APP_THEME } })
  },
}))
