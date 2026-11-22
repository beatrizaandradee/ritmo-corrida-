import { test } from 'node:test'
import assert from 'node:assert/strict'
import { haversine, paceOf, formatPace, formatDuration, calories, splits, bestSplit, riegel, records, weekly, streak, stepRunner } from './run.js'

const near = (a, b, tol) => assert.ok(Math.abs(a - b) <= tol, `${a} ≈ ${b}`)

test('haversine: 1 grau de latitude ≈ 111 km', () => {
  near(haversine({ lat: 0, lon: 0 }, { lat: 1, lon: 0 }), 111195, 10)
})

test('haversine: Praça da Liberdade → Savassi (BH) ≈ 1 km', () => {
  const d = haversine({ lat: -19.9320, lon: -43.9380 }, { lat: -19.9385, lon: -43.9333 })
  near(d, 870, 120)
})

test('pace e formatação', () => {
  assert.equal(paceOf(1800, 5000), 360)
  assert.equal(formatPace(332), `5'32"`)
  assert.equal(formatPace(0), `–'––"`)
  assert.equal(formatPace(59.6), `1'00"`)
})

test('duração', () => {
  assert.equal(formatDuration(125), '02:05')
  assert.equal(formatDuration(3725), '1:02:05')
})

test('calorias proporcionais ao peso e à distância', () => {
  assert.equal(calories(60, 5000), 311)
  assert.equal(calories(0, 5000), 0)
})

test('parciais por km com interpolação', () => {
  // corredor constante a 5'00"/km = 3,333 m/s, pontos a cada 100 s
  const pts = Array.from({ length: 11 }, (_, i) => ({ t: i * 100, d: (i * 100 * 1000) / 300 }))
  const sp = splits(pts)
  assert.equal(sp.length, 3)
  for (const s of sp) near(s.seconds, 300, 0.001)
})

test('parcial com ritmo variado e melhor parcial', () => {
  const pts = [
    { t: 0, d: 0 },
    { t: 330, d: 1000 },
    { t: 610, d: 2000 },
    { t: 950, d: 3000 },
  ]
  const sp = splits(pts)
  assert.deepEqual(sp.map((s) => Math.round(s.seconds)), [330, 280, 340])
  assert.equal(bestSplit(sp).km, 2)
})

test('fórmula de Riegel', () => {
  near(riegel(1500, 5000, 10000), 3127, 2)
})

test('recordes pessoais', () => {
  const runs = [
    { date: '2026-11-01', distance: 5000, duration: 1650 },
    { date: '2026-11-03', distance: 10000, duration: 3500 },
    { date: '2026-11-05', distance: 3000, duration: 900 },
  ]
  const r = records(runs)
  assert.equal(r.longest.distance, 10000)
  assert.equal(r.fastest.distance, 3000)
  assert.equal(r.totalKm, 18)
  assert.equal(Math.round(r.best5k), 1650)
})

test('resumo semanal começa na segunda-feira', () => {
  const today = new Date(2026, 10, 22) // domingo
  const w = weekly(
    [
      { date: new Date(2026, 10, 16, 7).toISOString(), distance: 5000 }, // segunda
      { date: new Date(2026, 10, 22, 7).toISOString(), distance: 8000 }, // domingo
      { date: new Date(2026, 10, 15, 7).toISOString(), distance: 9000 }, // semana passada
    ],
    today
  )
  assert.deepEqual(w, [5, 0, 0, 0, 0, 0, 8])
})

test('sequência de dias', () => {
  const today = new Date(2026, 10, 22, 12)
  const runs = [20, 21, 22, 18].map((d) => ({ date: new Date(2026, 10, d, 7).toISOString() }))
  assert.equal(streak(runs, today), 3)
  assert.equal(streak([], today), 0)
})

test('simulador de GPS avança no ritmo alvo e fica na área', () => {
  let s = { x: 0, y: 0, heading: 0, d: 0, t: 0 }
  const fixed = () => 0.5
  for (let i = 0; i < 600; i++) s = stepRunner(s, 1, 300, fixed)
  near(s.d, 2000, 1) // 10 min a 5'00"/km = 2 km
  assert.equal(s.t, 600)
  assert.ok(Math.hypot(s.x, s.y) < 1100)
})
