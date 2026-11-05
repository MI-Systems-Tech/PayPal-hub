import { useEffect, useRef, useState } from 'react';

export default function PinnedScroll() {
  const containerRef = useRef(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      if (!containerRef.current) return;
      const { top, height } = containerRef.current.getBoundingClientRect();
      let p = (window.innerHeight - top) / height;
      setProgress(Math.max(0, Math.min(1, p)));
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 0.0 - 0.2: Video starts full, zooms out, dims
  const vScale = progress < 0.2 ? 1 + (0.2 - progress) * 2 : 1;
  const vOp = progress < 0.2 ? 1 - (progress * 3) : 0.4;

  // 0.2+: Main text fades in and stays pinned
  const mainOpacity = progress > 0.2 ? 1 : 0;

  // Subtext replaces itself underneath while main text is pinned
  const sub1 = progress > 0.3 && progress < 0.5 ? 1 : 0;
  const sub2 = progress > 0.5 && progress < 0.7 ? 1 : 0;
  const sub3 = progress > 0.7 && progress < 0.95 ? 1 : 0;

  return (
    <section className="pinned-container" ref={containerRef} style={{ height: '400vh' }}>
      <div className="sticky-viewport">
        <div className="video-wrapper" style={{ transform: `scale(${vScale})`, opacity: vOp, transition: 'transform 0.1s, opacity 0.1s' }}>
          <video src="/videos/hub.mp4" autoPlay loop muted playsInline />
        </div>
        <div className="choreography-content">
          <h2 style={{ opacity: mainOpacity, transition: 'opacity 0.5s' }} className="hero-headline">One big, powerful family.</h2>
          <div className="subtext-container">
            <p style={{ opacity: sub1, transform: `translateY(${sub1 ? 0 : 20}px)` }}>Discover products seamlessly.</p>
            <p style={{ opacity: sub2, transform: `translateY(${sub2 ? 0 : 20}px)` }}>Pay with ultimate confidence.</p>
            <p style={{ opacity: sub3, transform: `translateY(${sub3 ? 0 : 20}px)` }}>Guard your active subscriptions.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
