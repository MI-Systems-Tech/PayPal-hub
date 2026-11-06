const e = import.meta.env
const cfg = { apiKey: e.VITE_FIREBASE_API_KEY, authDomain: e.VITE_FIREBASE_AUTH_DOMAIN, projectId: e.VITE_FIREBASE_PROJECT_ID }
export const googleReady = !!cfg.apiKey

export async function googleIdToken() {
  try {
    const { initializeApp, getApps } = await import('firebase/app')
    const { getAuth, GoogleAuthProvider, signInWithPopup } = await import('firebase/auth')
    const app = getApps()[0] || initializeApp(cfg)
    const r = await signInWithPopup(getAuth(app), new GoogleAuthProvider())
    return await r.user.getIdToken()
  } catch {
    throw new Error('Google sign-in was cancelled or blocked.')
  }
}
