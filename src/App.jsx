import { useEffect, useMemo, useState } from 'react'
import RouteMap from './components/RouteMap'
import LiveRun from './components/LiveRun'
import { createSeed } from './data/seed'
import { paceOf, formatPace, formatDuration, formatKm, splits, bestSplit, records, weekly, streak, riegel } from './utils/run'

function useStored(key, initial) {
  const [v, setV] = useState(() => {
    try {
      const raw = localStorage.getItem(key)
      if (raw) return JSON.parse(raw)
    } catch {
      /* ignora */
    }
    return typeof initial === 'function' ? initial() : initial
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(v))
    } catch {
      /* ignora */
    }
  }, [key, v])
  return [v, setV]
}

const DAYS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']
const dateLabel = (iso) => new Date(iso).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }).replace('.', '')

function Ring({ value, goal }) {
  const r = 52
  const c = 2 * Math.PI * r
  const k = Math.min(1, value / goal)
  return (
    <svg viewBox="0 0 120 120" className="ring">
      <circle cx="60" cy="60" r={r} className="ring__bg" />
      <circle cx="60" cy="60" r={r} className="ring__fg" strokeDasharray={c} strokeDashoffset={c * (1 - k)} />
    </svg>
  )
}

function RunSummary({ run, onSave, onDiscard, saved }) {
  const sp = splits(run.points)
  const best = bestSplit(sp)
  const maxS = Math.max(...sp.map((s) => s.seconds), 1)
  return (
    <div className="summary">
      <RouteMap points={run.points} height={250} />
      <div className="summary__body">
        <small className="muted">{dateLabel(run.date)}</small>
        <h2>{run.name}</h2>
        <div className="summary__stats">
          <div>
            <b>{formatKm(run.distance)}</b>
            <small>km</small>
          </div>
          <div>
            <b>{formatDuration(run.duration)}</b>
            <small>tempo</small>
          </div>
          <div>
            <b>{formatPace(paceOf(run.duration, run.distance))}</b>
            <small>pace médio</small>
          </div>
          <div>
            <b>{run.calories}</b>
            <small>kcal</small>
          </div>
        </div>
        {sp.length > 0 && (
          <>
            <h3>Parciais</h3>
            <ul className="splits">
              {sp.map((s) => (
                <li key={s.km} className={best && s.km === best.km ? 'is-best' : ''}>
                  <span>Km {s.km}</span>
                  <div className="splits__bar">
                    <div style={{ width: `${(s.seconds / maxS) * 100}%` }} />
                  </div>
                  <b>{formatPace(s.seconds)}</b>
                  {best && s.km === best.km && <em>melhor</em>}
                </li>
              ))}
            </ul>
          </>
        )}
        {!saved ? (
          <div className="row">
            <button className="btn btn--ghost" onClick={onDiscard}>
              Descartar
            </button>
            <button className="btn btn--lime" onClick={onSave}>
              Salvar corrida
            </button>
          </div>
        ) : (
          <button className="btn btn--ghost btn--block" onClick={onDiscard}>
            ← Voltar
          </button>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const [runs, setRuns] = useStored('ritmo.runs', () => createSeed())
  const [profile, setProfile] = useStored('ritmo.profile', { name: 'Beatriz', weight: 60, weeklyGoal: 20, targetPace: 345, realGps: false })
  const [tab, setTab] = useState('home')
  const [live, setLive] = useState(false)
  const [pending, setPending] = useState(null)
  const [viewing, setViewing] = useState(null)
  const [calc, setCalc] = useState({ dist: 5000, h: 0, m: 30, s: 0 })

  const sorted = useMemo(() => [...runs].sort((a, b) => b.date.localeCompare(a.date)), [runs])
  const week = useMemo(() => weekly(runs), [runs])
  const weekKm = week.reduce((a, b) => a + b, 0)
  const rec = useMemo(() => records(runs), [runs])
  const str = useMemo(() => streak(runs), [runs])
  const maxDay = Math.max(...week, 1)
  const today = (new Date().getDay() + 6) % 7

  if (live)
    return (
      <div className="device">
        <div className="phone">
          <LiveRun
            weight={profile.weight}
            targetPace={profile.targetPace}
            useRealGps={profile.realGps}
            onCancel={() => setLive(false)}
            onFinish={(run) => {
              setLive(false)
              setPending(run)
            }}
          />
        </div>
      </div>
    )

  const detail = pending || viewing

  return (
    <div className="device">
      <div className="phone">
        {detail ? (
          <div className="screen">
            <RunSummary
              run={detail}
              saved={!pending}
              onSave={() => {
                if (pending.distance > 10) setRuns((r) => [pending, ...r])
                setPending(null)
                setTab('history')
              }}
              onDiscard={() => {
                setPending(null)
                setViewing(null)
              }}
            />
          </div>
        ) : (
          <div className="screen">
            {tab === 'home' && (
              <div className="pad">
                <header className="top">
                  <div>
                    <small className="muted">Olá, {profile.name} 👋</small>
                    <h1>
                      Bora <span className="lime">correr</span>?
                    </h1>
                  </div>
                  <span className="streak" title="Dias seguidos">
                    🔥 {str}
                  </span>
                </header>

                <section className="card goal">
                  <div className="goal__ring">
                    <Ring value={weekKm} goal={profile.weeklyGoal} />
                    <div>
                      <b>{weekKm.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</b>
                      <small>de {profile.weeklyGoal} km</small>
                    </div>
                  </div>
                  <div className="goal__text">
                    <h3>Meta da semana</h3>
                    <p className="muted">
                      {weekKm >= profile.weeklyGoal
                        ? 'Meta batida! 🏆'
                        : `Faltam ${(profile.weeklyGoal - weekKm).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`}
                    </p>
                    <div className="bars">
                      {week.map((km, i) => (
                        <div key={i} className={`bars__col ${i === today ? 'is-today' : ''}`}>
                          <div className="bars__bar" style={{ height: `${(km / maxDay) * 100}%` }} title={`${km} km`} />
                          <span>{DAYS[i]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <button className="start" onClick={() => setLive(true)}>
                  <span>▶</span>
                  Iniciar corrida
                </button>

                {sorted[0] && (
                  <>
                    <h3 className="section">Última corrida</h3>
                    <button className="card last" onClick={() => setViewing(sorted[0])}>
                      <RouteMap points={sorted[0].points} height={120} grid={false} />
                      <div>
                        <b>{sorted[0].name}</b>
                        <small className="muted">{dateLabel(sorted[0].date)}</small>
                        <p>
                          <b>{formatKm(sorted[0].distance)} km</b> · {formatDuration(sorted[0].duration)} · {formatPace(paceOf(sorted[0].duration, sorted[0].distance))}/km
                        </p>
                      </div>
                    </button>
                  </>
                )}

                {rec && (
                  <>
                    <h3 className="section">Recordes pessoais</h3>
                    <div className="records">
                      <div className="card">
                        <span>🏃‍♀️</span>
                        <b>{formatKm(rec.longest.distance, 1)} km</b>
                        <small>Maior distância</small>
                      </div>
                      <div className="card">
                        <span>⚡</span>
                        <b>{formatPace(paceOf(rec.fastest.duration, rec.fastest.distance))}</b>
                        <small>Melhor pace</small>
                      </div>
                      <div className="card">
                        <span>🏅</span>
                        <b>{rec.best5k ? formatDuration(rec.best5k) : '–'}</b>
                        <small>Estimativa 5K</small>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {tab === 'history' && (
              <div className="pad">
                <h1>Histórico</h1>
                {rec && (
                  <div className="totals">
                    <div>
                      <b>{runs.length}</b>
                      <small>corridas</small>
                    </div>
                    <div>
                      <b>{rec.totalKm.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</b>
                      <small>km no total</small>
                    </div>
                    <div>
                      <b>{formatDuration(runs.reduce((a, r) => a + r.duration, 0))}</b>
                      <small>tempo correndo</small>
                    </div>
                  </div>
                )}
                <ul className="history">
                  {sorted.map((r) => (
                    <li key={r.id}>
                      <button onClick={() => setViewing(r)}>
                        <div className="history__map">
                          <RouteMap points={r.points} height={64} grid={false} />
                        </div>
                        <div className="history__info">
                          <b>{r.name}</b>
                          <small className="muted">{dateLabel(r.date)}</small>
                          <span>
                            {formatKm(r.distance)} km · {formatDuration(r.duration)} · {formatPace(paceOf(r.duration, r.distance))}
                          </span>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
                {runs.length === 0 && <p className="muted center">Nenhuma corrida ainda. Bora começar! 🏃‍♀️</p>}
              </div>
            )}

            {tab === 'profile' && (
              <div className="pad">
                <h1>Perfil</h1>
                <div className="card form">
                  <label>
                    Nome
                    <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
                  </label>
                  <label>
                    Peso (kg) para calcular calorias
                    <input type="number" min="30" max="200" value={profile.weight} onChange={(e) => setProfile({ ...profile, weight: Number(e.target.value) || 60 })} />
                  </label>
                  <label>
                    Meta semanal: <b>{profile.weeklyGoal} km</b>
                    <input type="range" min="5" max="80" step="1" value={profile.weeklyGoal} onChange={(e) => setProfile({ ...profile, weeklyGoal: Number(e.target.value) })} />
                  </label>
                  <label>
                    Ritmo da simulação: <b>{formatPace(profile.targetPace)}/km</b>
                    <input type="range" min="240" max="480" step="5" value={profile.targetPace} onChange={(e) => setProfile({ ...profile, targetPace: Number(e.target.value) })} />
                  </label>
                  <label className="switch">
                    <input type="checkbox" checked={profile.realGps} onChange={(e) => setProfile({ ...profile, realGps: e.target.checked })} />
                    <span>
                      Usar GPS real do celular
                      <small>Desligado = modo demonstração com trajeto simulado</small>
                    </span>
                  </label>
                </div>

                <h3 className="section">Calculadora de pace</h3>
                <div className="card form">
                  <div className="chips">
                    {[
                      [5000, '5K'],
                      [10000, '10K'],
                      [21097, '21K'],
                      [42195, '42K'],
                    ].map(([d, l]) => (
                      <button key={d} className={calc.dist === d ? 'is-on' : ''} onClick={() => setCalc({ ...calc, dist: d })}>
                        {l}
                      </button>
                    ))}
                  </div>
                  <div className="time-inputs">
                    {['h', 'm', 's'].map((k) => (
                      <label key={k}>
                        <input type="number" min="0" max={k === 'h' ? 9 : 59} value={calc[k]} onChange={(e) => setCalc({ ...calc, [k]: Math.max(0, Number(e.target.value) || 0) })} />
                        {k}
                      </label>
                    ))}
                  </div>
                  {(() => {
                    const secs = calc.h * 3600 + calc.m * 60 + calc.s
                    return secs > 0 ? (
                      <p className="calc-result">
                        Pace necessário: <b className="lime">{formatPace(paceOf(secs, calc.dist))}/km</b>
                        <small>
                          Na mesma forma, você faria 10K em {formatDuration(riegel(secs, calc.dist, 10000))} e 21K em {formatDuration(riegel(secs, calc.dist, 21097))}.
                        </small>
                      </p>
                    ) : (
                      <p className="muted">Digite o tempo alvo.</p>
                    )
                  })()}
                </div>

                <button
                  className="btn btn--ghost btn--block"
                  onClick={() => {
                    if (confirm('Restaurar as corridas de exemplo?')) setRuns(createSeed())
                  }}
                >
                  Restaurar dados de exemplo
                </button>
                <p className="muted tiny center">Projeto de portfólio · Beatriz Almeida Andrade · PUC Minas</p>
              </div>
            )}
          </div>
        )}

        {!detail && (
          <nav className="tabbar">
            {[
              ['home', '🏠', 'Início'],
              ['run', '▶', 'Correr'],
              ['history', '📊', 'Histórico'],
              ['profile', '👤', 'Perfil'],
            ].map(([id, icon, label]) => (
              <button key={id} className={tab === id ? 'is-on' : ''} onClick={() => (id === 'run' ? setLive(true) : setTab(id))}>
                <span className={id === 'run' ? 'run-icon' : ''}>{icon}</span>
                {label}
              </button>
            ))}
          </nav>
        )}
      </div>
    </div>
  )
}
