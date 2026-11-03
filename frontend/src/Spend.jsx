import { useEffect, useRef } from 'react'

const D = [26, 26, 27, 27, 29, 29, 29, 18, 18, 18, 18, 18] // sample monthly spend, thousands of naira

export default function Spend({ still }) {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current, g = c.getContext('2d')
    let raf, vis = true
    const io = new IntersectionObserver(([e]) => { vis = e.isIntersecting }); io.observe(c)
    const fit = () => { const r = c.getBoundingClientRect(), d = Math.min(devicePixelRatio, 2); c.width = r.width * d; c.height = r.height * d; g.setTransform(d, 0, 0, d, 0, 0) }
    fit(); addEventListener('resize', fit)
    const draw = t => {
      if (vis) {
        const w = c.clientWidth, h = c.clientHeight
        g.clearRect(0, 0, w, h)
        for (let k = 0; k < 3; k++) {
          g.beginPath()
          for (let i = 0; i <= 120; i++) {
            const x = (i / 120) * w, u = (i / 120) * (D.length - 1), a = Math.floor(u), b = Math.min(a + 1, D.length - 1), s = u - a
            const v = D[a] + (D[b] - D[a]) * (s * s * (3 - 2 * s))
            const y = h * 0.85 - ((v - 14) / 18) * h * 0.7 - k * 10 + (still ? 0 : Math.sin(i / 9 + t / 900 + k * 2) * (k ? 3 + k * 3 : 1.5))
            if (i) g.lineTo(x, y); else g.moveTo(x, y)
          }
          g.strokeStyle = ['#ffffff', 'rgba(90,160,255,.55)', 'rgba(90,160,255,.25)'][k]
          g.lineWidth = k ? 2 : 3; g.stroke()
        }
      }
      if (!still) raf = requestAnimationFrame(draw)
    }
    draw(0)
    return () => { cancelAnimationFrame(raf); io.disconnect(); removeEventListener('resize', fit) }
  }, [still])
  return <canvas ref={ref} className="spend" role="img" aria-label="Sample chart: monthly subscription spend falls from ₦29,000 to ₦18,000 after cancelling two unused subscriptions" />
}
