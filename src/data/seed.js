import { stepRunner, calories } from '../utils/run'

// Gerador aleatório com semente: os dados de exemplo são sempre iguais
function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Gera uma corrida simulada: distância alvo (m), pace alvo (s/km) */
export function simulateRun(meters, pace, seed, date, name) {
  const rnd = seeded(seed)
  let s = { x: 0, y: 0, heading: rnd() * Math.PI * 2, d: 0, t: 0 }
  const points = [{ x: 0, y: 0, d: 0, t: 0 }]
  while (s.d < meters) {
    s = stepRunner(s, 5, pace, rnd)
    points.push({ x: Math.round(s.x), y: Math.round(s.y), d: Math.round(s.d), t: s.t })
  }
  return { id: `seed-${seed}`, name, date, distance: Math.round(s.d), duration: s.t, points, calories: calories(60, s.d) }
}

export function createSeed(today = new Date()) {
  const at = (daysAgo, hour) => {
    const d = new Date(today)
    d.setDate(d.getDate() - daysAgo)
    d.setHours(hour, 10, 0, 0)
    return d.toISOString()
  }
  return [
    simulateRun(5200, 348, 11, at(1, 6), 'Corrida matinal'),
    simulateRun(3100, 330, 12, at(3, 18), 'Treino de ritmo'),
    simulateRun(8000, 372, 13, at(5, 7), 'Longão de domingo'),
    simulateRun(4000, 355, 14, at(8, 6), 'Corrida leve'),
    simulateRun(6200, 361, 15, at(10, 19), 'Volta na lagoa'),
    simulateRun(3000, 325, 16, at(12, 6), 'Tiros curtos'),
    simulateRun(10050, 380, 17, at(15, 7), 'Primeiros 10K! 🎉'),
    simulateRun(5000, 359, 18, at(18, 18), 'Corrida no parque'),
  ]
}
