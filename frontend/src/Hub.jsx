import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, clearToken } from './auth'

export default function Hub() {
  const [u, setU] = useState(null), nav = useNavigate()
  useEffect(() => { api('/auth/me').then(setU).catch(() => {}) }, [])
  const out = () => { api('/auth/logout', { method: 'POST' }).catch(() => {}); clearToken(); nav('/') }
  return (
    <main className="auth"><div className="authc">
      <h1>You're in.</h1>
      <p>{u ? JSON.stringify(u) : 'Loading…'}</p>
      <button className="pill line" onClick={out}>Sign out</button>
    </div></main>
  )
}
