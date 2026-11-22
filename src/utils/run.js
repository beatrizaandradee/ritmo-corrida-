// =====================================================================
//  Cálculos de corrida: distância por GPS, pace, parciais, calorias,
//  recordes e resumo semanal. Funções puras, testadas em run.test.js
// =====================================================================

/** Distância em metros entre duas coordenadas (fórmula de Haversine) */
export function haversine(a, b) {
  const R = 6371000
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

/** Pace (segundos por km) a partir de segundos e metros */
export const paceOf = (seconds, meters) => (meters > 0 ? seconds / (meters / 1000) : 0)

/** 332 s/km → 5'32" */
export function formatPace(secPerKm) {
  if (!secPerKm || !Number.isFinite(secPerKm) || secPerKm > 3599) return `–'––"`
  const total = Math.round(secPerKm)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}'${String(s).padStart(2, '0')}"`
}

/** 3725 → 1:02:05 · 125 → 02:05 */
export function formatDuration(seconds) {
  const t = Math.max(0, Math.round(seconds))
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export const formatKm = (meters, digits = 2) => (meters / 1000).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })

/** Estimativa clássica de gasto calórico na corrida: ~1,036 kcal × kg × km */
export const calories = (weightKg, meters) => Math.round(1.036 * weightKg * (meters / 1000))

/**
 * Parciais por km. Recebe pontos com distância acumulada (d, metros) e tempo (t, segundos)
 * e interpola o instante exato em que cada km foi completado.
 */
export function splits(points) {
  const out = []
  let nextKm = 1000
  let lastT = 0
  for (let i = 1; i < points.length; i++) {
    const p = points[i - 1]
    const q = points[i]
    while (q.d >= nextKm && p.d < nextKm + 1e-9) {
      const k = q.d === p.d ? 0 : (nextKm - p.d) / (q.d - p.d)
      const t = p.t + (q.t - p.t) * k
      out.push({ km: nextKm / 1000, seconds: t - lastT })
      lastT = t
      nextKm += 1000
      if (q.d < nextKm) break
    }
  }
  return out
}

/** Melhor parcial (menor tempo) */
export const bestSplit = (list) => (list.length ? list.reduce((best, s) => (s.seconds < best.seconds ? s : best)) : null)

/** Tempo previsto para outra distância (fórmula de Riegel: T2 = T1 × (D2/D1)^1,06) */
export const riegel = (seconds, meters, targetMeters) => seconds * Math.pow(targetMeters / meters, 1.06)

/** Recordes pessoais a partir do histórico */
export function records(runs) {
  if (!runs.length) return null
  const longest = runs.reduce((a, r) => (r.distance > a.distance ? r : a))
  const fastest = runs.filter((r) => r.distance >= 1000).reduce((a, r) => (!a || paceOf(r.duration, r.distance) < paceOf(a.duration, a.distance) ? r : a), null)
  const fiveK = runs.filter((r) => r.distance >= 5000).map((r) => riegel(r.duration, r.distance, 5000))
  return {
    longest,
    fastest,
    best5k: fiveK.length ? Math.min(...fiveK) : null,
    totalKm: runs.reduce((a, r) => a + r.distance, 0) / 1000,
  }
}

/** Início da semana (segunda-feira) */
export function weekStart(date = new Date()) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const day = (d.getDay() + 6) % 7 // segunda = 0
  d.setDate(d.getDate() - day)
  return d
}

/** Km por dia da semana atual (seg → dom) */
export function weekly(runs, today = new Date()) {
  const start = weekStart(today)
  const days = Array(7).fill(0)
  for (const r of runs) {
    const d = new Date(r.date)
    const diff = Math.floor((d - start) / 86400000)
    if (diff >= 0 && diff < 7) days[diff] += r.distance / 1000
  }
  return days.map((km) => Math.round(km * 100) / 100)
}

/** Dias seguidos com pelo menos uma corrida (contando hoje ou ontem) */
export function streak(runs, today = new Date()) {
  const key = (d) => new Date(d).toDateString()
  const set = new Set(runs.map((r) => key(r.date)))
  const d = new Date(today)
  if (!set.has(key(d))) d.setDate(d.getDate() - 1)
  let n = 0
  while (set.has(key(d))) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}

/**
 * Simulador de GPS: avança o corredor em um percurso suave dentro de uma área.
 * state = { x, y, heading, d, t } em metros e segundos. rnd = função aleatória (para testes).
 */
export function stepRunner(state, dt, targetPace, rnd = Math.random) {
  const speed = 1000 / targetPace // m/s
  const v = speed * (0.92 + rnd() * 0.16) // variação natural de ritmo
  let heading = state.heading + (rnd() - 0.5) * 0.35
  const R = 900 // mantém o percurso dentro de um círculo de 900 m
  if (Math.hypot(state.x, state.y) > R) heading = Math.atan2(-state.y, -state.x) + (rnd() - 0.5) * 0.6
  const dist = v * dt
  return {
    x: state.x + Math.cos(heading) * dist,
    y: state.y + Math.sin(heading) * dist,
    heading,
    d: state.d + dist,
    t: state.t + dt,
  }
}
