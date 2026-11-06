import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login, signup, googleLogin } from './auth'
import { googleReady, googleIdToken } from './google'
import GIcon from './GIcon'

const still = matchMedia('(prefers-reduced-motion: reduce)').matches

export default function AuthForm({ mode }) {
  const reg = mode === 'register', nav = useNavigate()
  const [email, setE] = useState(''), [pw, setP] = useState('')
  const [err, setErr] = useState(''), [busy, setB] = useState(false)
  const run = async fn => {
    setErr(''); setB(true)
    try { await fn(); nav('/hub', { replace: true }) } catch (x) { setErr(x.message) }
    setB(false)
  }
  const go = e => { e.preventDefault(); run(() => (reg ? signup : login)(email.trim(), pw)) }
  const google = () => {
    if (!googleReady) return setErr('Google sign-in is being set up. Please use your email for now.')
    run(async () => googleLogin(await googleIdToken()))
  }
  return (
    <main className="au">
      <section className="au-l">
        <Link to="/" className="au-brand">PayPal Hub</Link>
        <form className="au-f" onSubmit={go}>
          <h1>{reg ? 'Create your account' : 'Welcome back'}</h1>
          <p className="au-s">{reg ? 'Discover what you need, pay with PayPal, and keep your subscriptions in check.' : 'Sign in to your PayPal Hub account.'}</p>
          {err && <div className="aerr" role="alert">{err}</div>}
          <button type="button" className="gbtn" onClick={google} disabled={busy}><GIcon />Continue with Google</button>
          <div className="au-or"><span>or</span></div>
          <label>Email address<input type="email" value={email} onChange={e => setE(e.target.value)} required autoComplete="email" placeholder="name@example.com" /></label>
          <label>Password<input type="password" value={pw} onChange={e => setP(e.target.value)} required minLength={reg ? 8 : undefined} autoComplete={reg ? 'new-password' : 'current-password'} placeholder={reg ? 'At least 8 characters' : 'Enter your password'} /></label>
          <button className="pill blue" disabled={busy}>{busy ? 'Please wait…' : reg ? 'Create account' : 'Sign in'}</button>
          <p className="au-n">We never ask for your bank login or account balance.</p>
          <p className="au-o">{reg ? <>Already have an account? <Link to="/login">Sign in</Link></> : <>New to PayPal Hub? <Link to="/register">Create an account</Link></>}</p>
        </form>
      </section>
      <aside className="au-r"><video src="/videos/hub.mp4" autoPlay={!still} loop muted playsInline /></aside>
    </main>
  )
}
