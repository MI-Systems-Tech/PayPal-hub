import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

// Real ID-1 card size in mm: 85.6 x 53.98, 0.76 thick, 3.18 corner radius.
const W = 85.6, H = 53.98, T = 0.76, R = 3.18, PX = 20

function outline() {
  const s = new THREE.Shape(), x = -W / 2, y = -H / 2
  s.moveTo(x + R, y); s.lineTo(x + W - R, y); s.absarc(x + W - R, y + R, R, -Math.PI / 2, 0)
  s.lineTo(x + W, y + H - R); s.absarc(x + W - R, y + H - R, R, 0, Math.PI / 2)
  s.lineTo(x + R, y + H); s.absarc(x + R, y + H - R, R, Math.PI / 2, Math.PI)
  s.lineTo(x, y + R); s.absarc(x + R, y + R, R, Math.PI, Math.PI * 1.5)
  return s
}
function fixUV(g) {
  const p = g.attributes.position, uv = g.attributes.uv
  for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + W / 2) / W, (p.getY(i) + H / 2) / H)
}
function canvas() {
  const c = document.createElement('canvas'); c.width = W * PX; c.height = H * PX
  return [c, c.getContext('2d')]
}
function frontTex() {
  const [c, g] = canvas(), w = c.width, h = c.height
  const bg = g.createLinearGradient(0, 0, w, h)
  bg.addColorStop(0, '#173f93'); bg.addColorStop(1, '#0a1f44')
  g.fillStyle = bg; g.fillRect(0, 0, w, h)
  g.fillStyle = '#fff'; g.font = '700 110px "Funnel Display", Arial, sans-serif'
  g.fillText('PayPal Hub', 110, 200)
  const cx = 130, cy = 480, cw = 190, ch = 150
  const chip = g.createLinearGradient(cx, cy, cx + cw, cy + ch)
  chip.addColorStop(0, '#e9d28a'); chip.addColorStop(0.5, '#b8963e'); chip.addColorStop(1, '#e3c56f')
  g.fillStyle = chip; g.beginPath(); g.roundRect(cx, cy, cw, ch, 24); g.fill()
  g.strokeStyle = 'rgba(60,40,0,.55)'; g.lineWidth = 4
  g.strokeRect(cx + 62, cy + 30, 66, 90)
  ;[50, 100].forEach(d => { g.beginPath(); g.moveTo(cx, cy + d); g.lineTo(cx + cw, cy + d); g.stroke() })
  g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = 9; g.lineCap = 'round'
  ;[34, 62, 90].forEach(r => { g.beginPath(); g.arc(440, 555, r, -0.9, 0.9); g.stroke() })
  g.fillStyle = 'rgba(255,255,255,.92)'; g.font = '500 96px "Host Grotesk", Arial, sans-serif'
  g.fillText('\u2022\u2022\u2022\u2022  \u2022\u2022\u2022\u2022  \u2022\u2022\u2022\u2022  0000', 110, 800)
  g.font = '500 54px "Host Grotesk", Arial, sans-serif'
  g.fillText('YOUR NAME', 110, 960); g.fillText('SAMPLE CARD', w - 560, 960)
  return c
}
function backTex() {
  const [c, g] = canvas(), w = c.width, h = c.height
  g.fillStyle = '#0c2350'; g.fillRect(0, 0, w, h)
  g.fillStyle = '#05070d'; g.fillRect(0, 170, w, 190)
  g.fillStyle = '#e8ecf3'; g.fillRect(110, 480, w - 520, 130)
  g.fillStyle = '#fff'; g.fillRect(w - 360, 480, 250, 130)
  g.fillStyle = 'rgba(255,255,255,.8)'; g.font = '500 48px "Host Grotesk", Arial, sans-serif'
  g.fillText('Sample card for demonstration. Not a real payment card.', 110, 900)
  return c
}
function tex(c, renderer) {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy()
  return t
}

export default function Card3D({ still }) {
  const box = useRef(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const el = box.current
    let renderer
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }) } catch { setFailed(true); return }
    renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 700 ? 1.5 : 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    el.appendChild(renderer.domElement)
    const scene = new THREE.Scene()
    const pm = new THREE.PMREMGenerator(renderer)
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50); cam.position.z = 9
    const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(2, 3, 5); scene.add(key)

    const shape = outline()
    const body = new THREE.Mesh(
      new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 3, curveSegments: 24 }),
      new THREE.MeshPhysicalMaterial({ color: 0x0a1f44, roughness: 0.4, clearcoat: 1, clearcoatRoughness: 0.2 }))
    body.geometry.translate(0, 0, -T / 2)
    const face = (c, back) => {
      const g = new THREE.ShapeGeometry(shape, 24); fixUV(g)
      const t = tex(c, renderer)
      const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ map: t, bumpMap: t, bumpScale: 0.25, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.12 }))
      m.position.z = (T / 2 + 0.09) * (back ? -1 : 1); if (back) m.rotation.y = Math.PI
      return m
    }
    const card = new THREE.Group(); card.add(body, face(frontTex(), false), face(backTex(), true))
    card.scale.setScalar(0.05); scene.add(card)

    const size = () => {
      const { clientWidth: w, clientHeight: h } = el
      renderer.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix()
    }
    size(); const ro = new ResizeObserver(size); ro.observe(el)

    const m = { x: 0, y: 0 }, cur = { x: 0, y: 0 }
    const onMove = e => { m.x = (e.clientX / innerWidth) * 2 - 1; m.y = (e.clientY / innerHeight) * 2 - 1 }
    let visible = true, raf
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting }, { threshold: 0 }); io.observe(el)
    const KF = [[1.3,0,1,-.45,.12],[1.6,0,1.1,-.12,.04],[-1.6,0,1.15,.5,-.25],[-2.3,1.2,.55,Math.PI,0],[1.8,0,.8,-.3,.08],[0,.5,1.1,0,.1]]
    const pose = p => { const f = Math.min(Math.max(p, 0), 1) * (KF.length - 1), i = Math.min(Math.floor(f), KF.length - 2), t = f - i, e = t * t * (3 - 2 * t); return KF[i].map((v, k) => v + (KF[i + 1][k] - v) * e) }
    const cp = pose(0)
    const draw = t => {
      const doc = document.documentElement.scrollHeight - innerHeight
      const tg = still ? pose(0) : pose(doc > 0 ? scrollY / doc : 0)
      for (let k = 0; k < 5; k++) cp[k] += (tg[k] - cp[k]) * (still ? 1 : 0.08)
      cur.x += (m.x - cur.x) * 0.06; cur.y += (m.y - cur.y) * 0.06
      const nar = cam.aspect < 0.9, f = still ? 0 : 1
      card.position.set(nar ? 0 : cp[0], (nar ? 1.1 : cp[1]) + f * Math.sin(t / 1400) * 0.05, 0)
      card.scale.setScalar(0.05 * cp[2] * (nar ? 0.8 : 1))
      card.rotation.set(cp[4] + f * cur.y * 0.25, cp[3] + f * cur.x * 0.35, 0)
      key.position.set(2 + f * cur.x * 5, 3 - f * cur.y * 4, 5)
      if (visible && !document.hidden) renderer.render(scene, cam)
      if (!still) raf = requestAnimationFrame(draw)
    }
    if (!still) addEventListener('pointermove', onMove, { passive: true })
    document.fonts?.ready.then(() => {
      card.children.forEach((c, i) => { if (i) { c.material.map.image = i === 1 ? frontTex() : backTex(); c.material.map.needsUpdate = true } })
      if (still) draw(0)
    })
    draw(0)
    return () => {
      cancelAnimationFrame(raf); removeEventListener('pointermove', onMove); ro.disconnect(); io.disconnect()
      scene.traverse(o => { o.geometry?.dispose(); o.material?.map?.dispose(); o.material?.dispose?.() })
      renderer.dispose(); renderer.domElement.remove()
    }
  }, [still])

  return (
    <div ref={box} className="card3d" role="img" aria-label="A sample PayPal Hub payment card that tilts as you move your cursor">
      {failed && <div className="card-fallback"><b>PayPal Hub</b><span>SAMPLE CARD</span></div>}
    </div>
  )
}
