import { useEffect, useRef, useState } from 'react'
import RouteMap from './RouteMap'
import { stepRunner, paceOf, formatPace, formatDuration, formatKm, calories, splits, haversine } from '../utils/run'

const SPEEDS = [1, 10, 30]

/**
 * Corrida ao vivo.
 * - modo "simulado": um GPS de mentira percorre um trajeto no ritmo escolhido (dá para acelerar o tempo)
 * - modo "gps": usa a localização real do celular (navigator.geolocation)
 */
export default function LiveRun({ weight, targetPace, useRealGps, onFinish, onCancel }) {
  const [count, setCount] = useState(3)
  const [paused, setPaused] = useState(false)
  const [speed, setSpeed] = useState(10)
  const [gpsError, setGpsError] = useState('')
  const [, force] = useState(0)
  const sim = useRef({ x: 0, y: 0, heading: Math.random() * 6.28, d: 0, t: 0 })
  const points = useRef([{ x: 0, y: 0, d: 0, t: 0 }])
  const origin = useRef(null)
  const lastFix = useRef(null)

  // contagem regressiva 3, 2, 1
  useEffect(() => {
    if (count <= 0) return
    const id = setTimeout(() => setCount((c) => c - 1), 800)
    return () => clearTimeout(id)
  }, [count])

  const running = count <= 0 && !paused

  // relógio + simulador
  useEffect(() => {
    if (!running) return
    const TICK = 100
    const id = setInterval(() => {
      const dt = useRealGps ? TICK / 1000 : (TICK / 1000) * speed
      if (useRealGps) {
        sim.current = { ...sim.current, t: sim.current.t + dt }
      } else {
        sim.current = stepRunner(sim.current, dt, targetPace)
        const last = points.current[points.current.length - 1]
        if (sim.current.t - last.t >= 3) points.current.push({ x: Math.round(sim.current.x), y: Math.round(sim.current.y), d: Math.round(sim.current.d), t: sim.current.t })
      }
      force((n) => n + 1)
    }, TICK)
    return () => clearInterval(id)
  }, [running, speed, targetPace, useRealGps])

  // GPS real
  useEffect(() => {
    if (!useRealGps || !running) return
    if (!navigator.geolocation) {
      setGpsError('Este navegador não tem GPS.')
      return
    }
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const fix = { lat: pos.coords.latitude, lon: pos.coords.longitude }
        if (pos.coords.accuracy > 40) return // ignora leituras imprecisas
        if (!origin.current) origin.current = fix
        const step = lastFix.current ? haversine(lastFix.current, fix) : 0
        lastFix.current = fix
        const s = sim.current
        // converte para metros locais para desenhar
        const x = haversine(origin.current, { lat: origin.current.lat, lon: fix.lon }) * Math.sign(fix.lon - origin.current.lon)
        const y = -haversine(origin.current, { lat: fix.lat, lon: origin.current.lon }) * Math.sign(fix.lat - origin.current.lat)
        sim.current = { ...s, x, y, d: s.d + step }
        points.current.push({ x: Math.round(x), y: Math.round(y), d: Math.round(sim.current.d), t: s.t })
      },
      (err) => setGpsError(err.code === 1 ? 'Permita o acesso à localização para usar o GPS real.' : 'Não foi possível obter o GPS.'),
      { enableHighAccuracy: true, maximumAge: 1000 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [useRealGps, running])

  const s = sim.current
  const pts = points.current
  // pace atual = últimos ~200 m
  const recent = pts.filter((p) => p.d >= s.d - 200)
  const cur = recent.length > 1 ? paceOf(s.t - recent[0].t, s.d - recent[0].d) : 0
  const sp = splits([...pts, { d: s.d, t: s.t }])

  function finish() {
    const all = [...pts, { x: Math.round(s.x), y: Math.round(s.y), d: Math.round(s.d), t: s.t }]
    onFinish({
      id: String(Date.now()),
      name: new Date().getHours() < 12 ? 'Corrida matinal' : new Date().getHours() < 18 ? 'Corrida da tarde' : 'Corrida noturna',
      date: new Date().toISOString(),
      distance: Math.round(s.d),
      duration: s.t,
      points: all,
      calories: calories(weight, s.d),
    })
  }

  if (count > 0)
    return (
      <div className="live live--count">
        <span key={count} className="countdown">
          {count}
        </span>
        <p>Prepare-se…</p>
      </div>
    )

  return (
    <div className="live">
      <div className="live__map">
        <RouteMap points={[...pts, { x: s.x, y: s.y }]} live height="100%" />
        {!useRealGps && (
          <div className="speed" role="group" aria-label="Velocidade da simulação">
            <span>Demo</span>
            {SPEEDS.map((v) => (
              <button key={v} className={v === speed ? 'is-on' : ''} onClick={() => setSpeed(v)}>
                {v}x
              </button>
            ))}
          </div>
        )}
        {gpsError && <p className="gps-error">{gpsError}</p>}
      </div>

      <div className="live__panel">
        <div className="big-stat">
          <b>{formatKm(s.d)}</b>
          <small>quilômetros</small>
        </div>
        <div className="live__grid">
          <div>
            <b>{formatDuration(s.t)}</b>
            <small>tempo</small>
          </div>
          <div>
            <b>{formatPace(cur)}</b>
            <small>pace atual</small>
          </div>
          <div>
            <b>{formatPace(paceOf(s.t, s.d))}</b>
            <small>pace médio</small>
          </div>
          <div>
            <b>{calories(weight, s.d)}</b>
            <small>kcal</small>
          </div>
        </div>
        {sp.length > 0 && (
          <p className="last-split">
            ⚡ Km {sp.length}: <b>{formatPace(sp[sp.length - 1].seconds)}</b>
          </p>
        )}
        <div className="controls">
          {paused ? (
            <>
              <button className="ctl ctl--stop" onClick={finish} aria-label="Finalizar">
                ■
              </button>
              <button className="ctl ctl--go" onClick={() => setPaused(false)} aria-label="Continuar">
                ▶
              </button>
            </>
          ) : (
            <button className="ctl ctl--pause" onClick={() => setPaused(true)} aria-label="Pausar">
              ❚❚
            </button>
          )}
        </div>
        {paused && (
          <button className="link" onClick={onCancel}>
            Descartar corrida
          </button>
        )}
      </div>
    </div>
  )
}
