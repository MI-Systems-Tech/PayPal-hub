const API = import.meta.env.VITE_API_URL || 'http://localhost:4000'
const K = 'hub_token'
export const getToken = () => { try { return localStorage.getItem(K) } catch { return null } }
export const setToken = t => { try { localStorage.setItem(K, t) } catch {} }
export const clearToken = () => { try { localStorage.removeItem(K) } catch {} }

export async function api(path, { method = 'GET', body } = {}) {
  const h = {}, t = getToken()
  if (body) h['Content-Type'] = 'application/json'
  if (t) h.Authorization = 'Bearer ' + t
  let r
  try { r = await fetch(API + path, { method, headers: h, body: body && JSON.stringify(body) }) }
  catch { throw new Error('Cannot reach the server. Try again.') }
  if (r.status === 204) return null
  const d = await r.json().catch(() => ({}))
  if (r.status === 401 && t && !path.startsWith('/auth/login') && !path.startsWith('/auth/signup') && !path.startsWith('/auth/google')) { clearToken(); location.assign('/login') }
  if (!r.ok) throw new Error(d.error?.message || 'Something went wrong')
  return d
}
const auth = p => (email, password) =>
  api(p, { method: 'POST', body: { email, password } }).then(d => { setToken(d.token); return d })
export const signup = auth('/auth/signup')
export const login = auth('/auth/login')
export const googleLogin = idToken =>
  api('/auth/google', { method: 'POST', body: { idToken } }).then(d => { setToken(d.token); return d })
