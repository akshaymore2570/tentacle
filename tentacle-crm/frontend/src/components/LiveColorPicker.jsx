import { useEffect, useRef, useState, useCallback } from 'react'

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.substring(0, 2), 16) || 0,
    g: parseInt(h.substring(2, 4), 16) || 0,
    b: parseInt(h.substring(4, 6), 16) || 0,
  }
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => {
    const h = Math.max(0, Math.min(255, Math.round(x))).toString(16)
    return h.length === 1 ? '0' + h : h
  }).join('')
}

function hexToHsv(hex) {
  const { r, g, b } = hexToRgb(hex)
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  const d = max - min
  let h = 0
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6
    else if (max === gn) h = (bn - rn) / d + 2
    else h = (rn - gn) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  const s = max === 0 ? 0 : d / max
  const v = max
  return { h, s, v }
}

function hsvToHex(h, s, v) {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255)
}

export default function LiveColorPicker({ value, onChange, onClose }) {
  const [hsv, setHsv] = useState(hexToHsv(value))
  const [hexInput, setHexInput] = useState(value.toUpperCase())

  const canvasRef = useRef(null)
  const hueRef = useRef(null)
  const hsvRef = useRef(hsv)         // latest state
  const draggingRef = useRef(null)   // 'sv' | 'hue' | null

  // keep ref synced
  useEffect(() => { hsvRef.current = hsv }, [hsv])

  // sync from outside
  useEffect(() => {
    const newHsv = hexToHsv(value)
    setHsv(newHsv)
    hsvRef.current = newHsv
    setHexInput(value.toUpperCase())
  }, [value])

  // ---------- Draw saturation/value canvas ----------
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const w = canvas.width
    const h = canvas.height

    ctx.fillStyle = hsvToHex(hsv.h, 1, 1)
    ctx.fillRect(0, 0, w, h)

    const whiteGrad = ctx.createLinearGradient(0, 0, w, 0)
    whiteGrad.addColorStop(0, 'rgba(255,255,255,1)')
    whiteGrad.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = whiteGrad
    ctx.fillRect(0, 0, w, h)

    const blackGrad = ctx.createLinearGradient(0, 0, 0, h)
    blackGrad.addColorStop(0, 'rgba(0,0,0,0)')
    blackGrad.addColorStop(1, 'rgba(0,0,0,1)')
    ctx.fillStyle = blackGrad
    ctx.fillRect(0, 0, w, h)
  }, [hsv.h])

  // ---------- Compute color from a client point ----------
  const commitSV = useCallback((clientX, clientY) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left))
    const y = Math.max(0, Math.min(rect.height, clientY - rect.top))
    const s = x / rect.width
    const v = 1 - y / rect.height
    const next = { h: hsvRef.current.h, s, v }
    hsvRef.current = next
    setHsv(next)
    const hex = hsvToHex(next.h, next.s, next.v)
    setHexInput(hex.toUpperCase())
    onChange(hex)
  }, [onChange])

  const commitHue = useCallback((clientX) => {
    const el = hueRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = Math.max(0, Math.min(rect.width, clientX - rect.left))
    const h = (x / rect.width) * 360
    const next = { ...hsvRef.current, h }
    hsvRef.current = next
    setHsv(next)
    const hex = hsvToHex(next.h, next.s, next.v)
    setHexInput(hex.toUpperCase())
    onChange(hex)
  }, [onChange])

  // ---------- Global mouse handling ----------
  useEffect(() => {
    const onMove = (e) => {
      if (draggingRef.current === 'sv') commitSV(e.clientX, e.clientY)
      else if (draggingRef.current === 'hue') commitHue(e.clientX)
    }
    const onUp = () => { draggingRef.current = null }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [commitSV, commitHue])

  // ---------- Mouse down on SV canvas ----------
  const onSVDown = (e) => {
    e.preventDefault()
    e.stopPropagation()
    draggingRef.current = 'sv'
    commitSV(e.clientX, e.clientY)
  }

  // ---------- Mouse down on hue slider ----------
  const onHueDown = (e) => {
    e.preventDefault()
    e.stopPropagation()
    draggingRef.current = 'hue'
    commitHue(e.clientX)
  }

  // ---------- Hex input ----------
  const onHexChange = (e) => {
    let v = e.target.value.trim().toUpperCase()
    if (!v.startsWith('#')) v = '#' + v
    setHexInput(v)
    if (/^#[0-9A-F]{6}$/.test(v)) {
      const newHsv = hexToHsv(v.toLowerCase())
      hsvRef.current = newHsv
      setHsv(newHsv)
      onChange(v.toLowerCase())
    }
  }

  const currentHex = hsvToHex(hsv.h, hsv.s, hsv.v)
  const rgb = hexToRgb(currentHex)

  const onRGBChange = (channel, val) => {
    const n = Math.max(0, Math.min(255, parseInt(val) || 0))
    const newRgb = { ...rgb, [channel]: n }
    const hex = rgbToHex(newRgb.r, newRgb.g, newRgb.b)
    const newHsv = hexToHsv(hex)
    hsvRef.current = newHsv
    setHsv(newHsv)
    setHexInput(hex.toUpperCase())
    onChange(hex)
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        marginTop: 8,
        background: 'white',
        borderRadius: 12,
        boxShadow: '0 12px 40px rgba(0,0,0,0.25), 0 2px 8px rgba(0,0,0,0.1)',
        border: '1px solid #e5e7eb',
        padding: 16,
        width: 280,
        zIndex: 9999,
        userSelect: 'none',
      }}
    >
      {/* SV Canvas */}
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <canvas
          ref={canvasRef}
          width={248}
          height={180}
          onMouseDown={onSVDown}
          style={{
            width: '100%',
            height: 180,
            borderRadius: 8,
            cursor: 'crosshair',
            display: 'block',
          }}
        />
        {/* Marker — cursor ke saath chalega */}
        <div
          style={{
            position: 'absolute',
            left: `calc(${hsv.s * 100}% - 8px)`,
            top: `calc(${(1 - hsv.v) * 100}% - 8px)`,
            width: 16,
            height: 16,
            borderRadius: '50%',
            border: '2px solid white',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.4)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Hue slider */}
      <div
        ref={hueRef}
        onMouseDown={onHueDown}
        style={{
          position: 'relative',
          height: 14,
          borderRadius: 7,
          marginBottom: 14,
          cursor: 'pointer',
          background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.15)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: `calc(${(hsv.h / 360) * 100}% - 8px)`,
            top: -3,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: `hsl(${hsv.h}, 100%, 50%)`,
            border: '3px solid white',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            pointerEvents: 'none',
          }}
        />
      </div>

      {/* Preview + Hex */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 8,
          background: currentHex,
          border: '2px solid white',
          boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          flexShrink: 0,
        }} />
        <input
          value={hexInput}
          onChange={onHexChange}
          maxLength={7}
          style={{
            flex: 1,
            padding: '10px 12px',
            border: '1px solid #e5e7eb',
            borderRadius: 8,
            fontFamily: 'monospace',
            fontSize: '0.88rem',
            fontWeight: 700,
            textAlign: 'center',
            outline: 'none',
            textTransform: 'uppercase',
          }}
        />
      </div>

      {/* RGB */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
        {[
          { key: 'r', label: 'R', val: rgb.r },
          { key: 'g', label: 'G', val: rgb.g },
          { key: 'b', label: 'B', val: rgb.b },
        ].map(({ key, label, val }) => (
          <div key={key} style={{ textAlign: 'center' }}>
            <input
              type="number"
              min={0}
              max={255}
              value={val}
              onChange={(e) => onRGBChange(key, e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #e5e7eb',
                borderRadius: 6,
                textAlign: 'center',
                fontSize: '0.85rem',
                fontWeight: 600,
                outline: 'none',
              }}
            />
            <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 3, fontWeight: 700 }}>
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Actions */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          onClose && onClose()
        }}
        style={{
          width: '100%',
          padding: '9px',
          background: 'var(--primary, #2c5f9e)',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          fontWeight: 700,
          fontSize: '0.82rem',
          cursor: 'pointer',
        }}
      >
        Done
      </button>
    </div>
  )
}
