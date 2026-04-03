import { useEffect, useRef } from 'react'

export function DottedSurface({ className = '', darkMode = false, ...props }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    let animationId
    let THREE

    async function init() {
      try {
        THREE = await import('three')

        const SEPARATION = 130
        const AMOUNTX = 60
        const AMOUNTY = 45

        const scene = new THREE.Scene()

        // Camera positioned high and back — looking down at the wave surface like the reference
        const camera = new THREE.PerspectiveCamera(
          55,
          window.innerWidth / window.innerHeight,
          1,
          10000
        )
        camera.position.set(0, 280, 900)
        camera.lookAt(0, -60, 0)

        const renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
        })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.setSize(window.innerWidth, window.innerHeight)
        renderer.setClearColor(0x000000, 0)

        if (!containerRef.current) return
        containerRef.current.appendChild(renderer.domElement)

        // Build dot grid
        const positions = []
        const sizes = []
        const geometry = new THREE.BufferGeometry()

        for (let ix = 0; ix < AMOUNTX; ix++) {
          for (let iy = 0; iy < AMOUNTY; iy++) {
            positions.push(
              ix * SEPARATION - (AMOUNTX * SEPARATION) / 2,
              0,
              iy * SEPARATION - (AMOUNTY * SEPARATION) / 2
            )
            sizes.push(1)
          }
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
        geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1))

        // White dots (pure white like the reference)
        const material = new THREE.PointsMaterial({
          color: 0xffffff,
          size: 4.5,
          transparent: true,
          opacity: 0.85,
          sizeAttenuation: true,
        })

        const points = new THREE.Points(geometry, material)
        scene.add(points)

        let count = 0

        const animate = () => {
          animationId = requestAnimationFrame(animate)

          const posArr = geometry.attributes.position.array

          let i = 0
          for (let ix = 0; ix < AMOUNTX; ix++) {
            for (let iy = 0; iy < AMOUNTY; iy++) {
              // Wave amplitude scales with distance from camera (smaller far away)
              const waveFactor = Math.max(0.3, 1 - iy / AMOUNTY)
              posArr[i * 3 + 1] =
                (Math.sin((ix + count) * 0.3) * 80 +
                  Math.sin((iy + count) * 0.5) * 80) * waveFactor
              i++
            }
          }

          geometry.attributes.position.needsUpdate = true
          renderer.render(scene, camera)
          count += 0.055
        }

        const handleResize = () => {
          camera.aspect = window.innerWidth / window.innerHeight
          camera.updateProjectionMatrix()
          renderer.setSize(window.innerWidth, window.innerHeight)
        }

        window.addEventListener('resize', handleResize)
        animate()

        containerRef._cleanup = () => {
          window.removeEventListener('resize', handleResize)
          cancelAnimationFrame(animationId)
          geometry.dispose()
          material.dispose()
          renderer.dispose()
          if (containerRef.current && renderer.domElement.parentNode === containerRef.current) {
            containerRef.current.removeChild(renderer.domElement)
          }
        }
      } catch (err) {
        console.warn('DottedSurface: WebGL not available', err)
      }
    }

    init()

    return () => {
      if (containerRef._cleanup) containerRef._cleanup()
    }
  }, [darkMode])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 0,
        pointerEvents: 'none',
      }}
      {...props}
    />
  )
}
