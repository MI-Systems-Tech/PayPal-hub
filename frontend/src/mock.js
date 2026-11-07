const g = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d } catch { return d } }
const s = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch {} }
export const RANGES = [
  { id: 'r1', label: 'Under ₦100,000', mid: 60000 },
  { id: 'r2', label: '₦100,000 – ₦300,000', mid: 200000 },
  { id: 'r3', label: '₦300,000 – ₦700,000', mid: 500000 },
  { id: 'r4', label: '₦700,000 – ₦1,500,000', mid: 1100000 },
  { id: 'r5', label: 'Over ₦1,500,000', mid: 2000000 }
]
export const getRange = () => g('hub_range', null)
export const setRange = id => s('hub_range', id)
const SEED = [
  { id: 's1', name: 'Video streaming', price: 4500, days: 3 },
  { id: 's2', name: 'Music streaming', price: 2500, days: 1 },
  { id: 's3', name: 'Cloud storage', price: 1500, days: 60 },
  { id: 's4', name: 'Design tool', price: 8000, days: 40 },
  { id: 's5', name: 'News site', price: 3000, days: 12 }
]
export const getSubs = () => g('hub_subs', SEED)
export const markUsed = id => { const n = getSubs().map(x => x.id === id ? { ...x, days: 0 } : x); s('hub_subs', n); return n }
export function verdict(sub, budget) {
  if (sub.days >= 30) return { v: 'Cancel', why: `Not used in ${sub.days} days.` }
  if (sub.price > budget * 0.4) return { v: 'Review', why: 'Takes a large share of your budget.' }
  return { v: 'Keep', why: 'Used recently and within budget.' }
}
export const CATALOG = [
  { id: 'c1', name: 'Frame Studio', tags: ['video', 'editing', 'editor', 'film'], price: 6500, pp: true, why: 'Timeline video editor with ready templates.' },
  { id: 'c2', name: 'CutRoom', tags: ['video', 'editing', 'editor', 'mobile'], price: 3200, pp: false, why: 'Phone-first video editing for short clips.' },
  { id: 'c3', name: 'Pixel Forge', tags: ['design', 'graphics', 'logo', 'poster'], price: 7800, pp: true, why: 'Drag-and-drop design for posters and logos.' },
  { id: 'c4', name: 'Vaultly', tags: ['cloud', 'storage', 'backup', 'files'], price: 1800, pp: true, why: 'Encrypted cloud storage with simple sharing.' },
  { id: 'c5', name: 'Tunebox', tags: ['music', 'streaming', 'songs', 'audio'], price: 2200, pp: true, why: 'Ad-free music streaming with offline mode.' },
  { id: 'c6', name: 'LearnLoop', tags: ['learning', 'course', 'courses', 'study'], price: 5000, pp: false, why: 'Short courses with progress tracking.' },
  { id: 'c7', name: 'NoteNest', tags: ['notes', 'writing', 'docs', 'productivity'], price: 2500, pp: true, why: 'Notes and docs that sync across devices.' },
  { id: 'c8', name: 'ShieldNet', tags: ['vpn', 'privacy', 'security'], price: 3500, pp: true, why: 'VPN with servers close to Lagos.' }
]
export function discover(q) {
  const t = q.toLowerCase(), m = t.match(/(\d[\d,]*)\s*(k)?/)
  const cap = m ? parseInt(m[1].replace(/,/g, ''), 10) * (m[2] ? 1000 : 1) : null
  const words = t.split(/[^a-z]+/).filter(w => w.length > 2)
  return CATALOG.map(c => {
    const hit = words.filter(w => c.tags.some(x => x.startsWith(w) || w.startsWith(x))).length
    const ok = cap === null || c.price <= cap
    return { ...c, score: hit * 3 + (ok ? 2 : 0), why: ok ? c.why : `Over your budget by ₦${(c.price - cap).toLocaleString('en-NG')}. ${c.why}` }
  }).filter(c => c.score >= 3).sort((a, b) => b.score - a.score || a.price - b.price)
}
export const FX = 1329
export const usd = n => (n / FX).toFixed(2)
export const getCat = id => CATALOG.find(c => c.id === id)
export function demoPay(c) {
  const subs = getSubs()
  if (!subs.some(x => x.id === c.id)) s('hub_subs', [...subs, { id: c.id, name: c.name, price: c.price, days: 0 }])
  return { ref: 'DEMO-' + Math.random().toString(36).slice(2, 8).toUpperCase(), name: c.name, ngn: c.price, usd: usd(c.price) }
}
