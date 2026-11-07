import { useState } from 'react'
import { RANGES } from './mock'

export default function Onboard({ onDone }) {
  const [id, setId] = useState('')
  return (
    <main className="au ob"><section className="ob-c">
      <h1>What is your monthly income range?</h1>
      <p className="au-s">The Guardian uses it to suggest what to keep or cancel. We never ask for your bank login or account balance.</p>
      <div className="ob-l" role="radiogroup">
        {RANGES.map(r => (
          <button key={r.id} role="radio" aria-checked={id === r.id} className={'ob-o' + (id === r.id ? ' on' : '')} onClick={() => setId(r.id)}>{r.label}</button>
        ))}
      </div>
      <button className="pill blue" disabled={!id} onClick={() => onDone(id)}>Continue</button>
    </section></main>
  )
}
