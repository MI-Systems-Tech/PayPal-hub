import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

// If the card shows its back or looks mirrored, change FRONT to -Math.PI / 2.
const FRONT = Math.PI / 2
// Scroll poses: [x, y, scale, rotationY, rotationX]
const KF = [[0, -1.7, 1.35, 0, .2], [0, -2.6, 1.35, .35, .2], [0, -6, 1, 0, 0], [0, -6, 1, 0, 0], [0, -1.7, 1.35, -.35, .2]]
const pose = p => {
  const f = Math.min(Math.max(p, 0), 1) * (KF.length - 1), i = Math.min(Math.floor(f), KF.length - 2), t = f - i, e = t * t * (3 - 2 * t)
  return KF[i].map((v, k) => v + (KF[i + 1][k] - v) * e)
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
    scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50); cam.position.z = 9
    const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(2, 3, 5); scene.add(key)

    const card = new THREE.Group(); scene.add(card)
    let raf, visible = true, ready = false
    const m = { x: 0, y: 0 }, cur = { x: 0, y: 0 }, cp = [0, -6, 1, 0, 0]

    const draw = t => {
      const w = el.clientWidth, h = el.clientHeight
      const u = 2 * cam.position.z * Math.tan(cam.fov * Math.PI / 360) / h
      let best = null, area = 0
      document.querySelectorAll('[data-card]').forEach(s => {
        const r = s.getBoundingClientRect()
        const vis = Math.max(0, Math.min(r.bottom, h) - Math.max(r.top, 0)) * Math.max(0, Math.min(r.right, w) - Math.max(r.left, 0))
        if (vis > area) { area = vis; best = { s, r } }
      })
      const tg = best ? [
        (best.r.left + best.r.width / 2 - w / 2) * u,
        -(best.r.top + best.r.height / 2 - h / 2) * u,
        best.r.width * u / 4.28,
        +best.s.dataset.ry || 0, +best.s.dataset.rx || 0
      ] : [0, -6, cp[2], 0, 0]
      for (let k = 0; k < 5; k++) cp[k] += (tg[k] - cp[k]) * (still ? 1 : 0.1)
      cur.x += (m.x - cur.x) * 0.06; cur.y += (m.y - cur.y) * 0.06
      const f = still ? 0 : 1
      card.position.set(cp[0], cp[1] + f * Math.sin(t / 1400) * 0.05, 0)
      card.scale.setScalar(cp[2])
      card.rotation.set(cp[4] + f * cur.y * 0.25, cp[3] + f * cur.x * 0.35, 0)
      key.position.set(2 + f * cur.x * 5, 3 - f * cur.y * 4, 5)
      if (ready && visible && !document.hidden) renderer.render(scene, cam)
      if (!still) raf = requestAnimationFrame(draw)
    }

    new GLTFLoader().load('/card.glb', g => {
      const model = g.scene
      model.scale.setScalar(50) // the file is in metres: 0.0856 m wide becomes 4.28 units
      model.rotation.x = FRONT
      const aniso = renderer.capabilities.getMaxAnisotropy()
      model.traverse(o => { if (o.isMesh && o.material.map) o.material.map.anisotropy = aniso })
      card.add(model); ready = true
      if (still) draw(0)
    }, undefined, () => setFailed(true))

    const size = () => {
      const { clientWidth: w, clientHeight: h } = el
      renderer.setSize(w, h); cam.aspect = w / h; cam.updateProjectionMatrix()
    }
    size(); const ro = new ResizeObserver(size); ro.observe(el)
    const onMove = e => { m.x = (e.clientX / innerWidth) * 2 - 1; m.y = (e.clientY / innerHeight) * 2 - 1 }
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting }, { threshold: 0 }); io.observe(el)
    if (!still) { addEventListener('pointermove', onMove, { passive: true }); draw(0) }

    return () => {
      cancelAnimationFrame(raf); removeEventListener('pointermove', onMove); ro.disconnect(); io.disconnect()
      scene.traverse(o => { o.geometry?.dispose(); o.material?.map?.dispose(); o.material?.dispose?.() })
      renderer.dispose(); renderer.domElement.remove()
    }
  }, [still])

  return (
    <div ref={box} className="card3d" role="img" aria-label="A sample payment card that turns as you scroll and tilts as you move your cursor">
      {failed && <div className="card-fallback"><b>PayPal Hub</b><span>SAMPLE CARD</span></div>}
    </div>
  )
}
