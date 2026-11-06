import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login, signup } from './auth'

export default function AuthForm({ mode }) {
  const reg = mode === 'register', nav = useNavigate()
  const [email, setE] = useState(''), [pw, setP] = useState('')
  const [err, setErr] = useState(''), [busy, setB] = useState(false)
  const go = async e => {
    e.preventDefault(); setErr(''); setB(true)
    try { await (reg ? signup : login)(email.trim(), pw); nav('/hub', { replace: true }) }
    catch (x) { setErr(x.message) }
    setB(false)
  }
  return (
    <main className="auth">
      <form className="authc" onSubmit={go}>
        <Link to="/" className="back">PayPal Hub</Link>
        <h1>{reg ? 'Create your account' : 'Sign in'}</h1>
        {err && <div className="aerr" role="alert">{err}</div>}
        <input type="email" placeholder="Email" value={email} onChange={e => setE(e.target.value)} required autoComplete="email" />
        <input type="password" placeholder={reg ? 'Password (8+ characters)' : 'Password'} value={pw}
          onChange={e => setP(e.target.value)} required minLength={reg ? 8 : undefined}
          autoComplete={reg ? 'new-password' : 'current-password'} />
        <button className="pill blue" disabled={busy}>{busy ? 'Please wait…' : reg ? 'Create account' : 'Sign in'}</button>
        <p>{reg ? <>Have an account? <Link to="/login">Sign in</Link></> : <>New here? <Link to="/register">Create account</Link></>}</p>
      </form>
    </main>
  )
}
