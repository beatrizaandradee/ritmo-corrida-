// Desenha o percurso da corrida em SVG, ajustando a escala ao tamanho do trajeto
export default function RouteMap({ points, live, height = 220, grid = true }) {
  const pts = points.length ? points : [{ x: 0, y: 0 }]
  const xs = pts.map((p) => p.x)
  const ys = pts.map((p) => p.y)
  const pad = 60
  const minX = Math.min(...xs) - pad
  const minY = Math.min(...ys) - pad
  const w = Math.max(Math.max(...xs) - minX + pad, 300)
  const h = Math.max(Math.max(...ys) - minY + pad, 300)
  const size = Math.max(w, h)
  const vb = `${minX - (size - w) / 2} ${minY - (size - h) / 2} ${size} ${size}`
  const line = pts.map((p) => `${p.x},${p.y}`).join(' ')
  const last = pts[pts.length - 1]
  const stroke = size / 70

  return (
    <svg className="routemap" viewBox={vb} style={{ height }} preserveAspectRatio="xMidYMid slice" role="img" aria-label="Mapa do percurso">
      <defs>
        <linearGradient id="rg" x1="0" x2="1">
          <stop offset="0" stopColor="#d4ff3a" />
          <stop offset="1" stopColor="#3affc8" />
        </linearGradient>
        <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
          <path d="M100 0H0V100" fill="none" stroke="rgba(255,255,255,.05)" strokeWidth="4" />
        </pattern>
      </defs>
      {grid && <rect x={minX - size} y={minY - size} width={size * 3} height={size * 3} fill="url(#grid)" />}
      <polyline points={line} fill="none" stroke="rgba(212,255,58,.18)" strokeWidth={stroke * 3} strokeLinejoin="round" strokeLinecap="round" />
      <polyline points={line} fill="none" stroke="url(#rg)" strokeWidth={stroke} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[0].x} cy={pts[0].y} r={stroke * 1.4} fill="#fff" />
      <circle cx={last.x} cy={last.y} r={stroke * 1.8} fill={live ? '#d4ff3a' : '#ff5470'} stroke="#0b0d10" strokeWidth={stroke / 2}>
        {live && <animate attributeName="r" values={`${stroke * 1.6};${stroke * 2.6};${stroke * 1.6}`} dur="1.2s" repeatCount="indefinite" />}
      </circle>
    </svg>
  )
}
