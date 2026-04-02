import { useEffect, useRef } from 'react'

export function DottedSurface({ className = '', darkMode = false, ...props }) {
  const containerRef = useRef(null)

  useEffect(() => {
    if (!containerRef.current) return

    let animationId
    let renderer
    let THREE

    async function init() {
      try {
        // Dynamic import so a THREE.js failure won't crash the whole app
        THREE = await import('three')

        const SEPARATION = 150
        const AMOUNTX = 40
        const AMOUNTY = 60

        const scene = new THREE.Scene()

        const camera = new THREE.PerspectiveCamera(
          60,
          window.innerWidth / window.innerHeight,
          1,
          10000
        )
        camera.position.set(0, 355, 1220)

        renderer = new THREE.WebGLRenderer({
          alpha: true,
          antialias: true,
        })
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
        renderer.setSize(window.innerWidth, window.innerHeight)
        renderer.setClearColor(0x000000, 0)

        if (!containerRef.current) return
        containerRef.current.appendChild(renderer.domElement)

        const positions = []
        const colors = []
        const geometry = new THREE.BufferGeometry()

        for (let ix = 0; ix < AMOUNTX; ix++) {
          for (let iy = 0; iy < AMOUNTY; iy++) {
            positions.push(
              ix * SEPARATION - (AMOUNTX * SEPARATION) / 2,
              0,
              iy * SEPARATION - (AMOUNTY * SEPARATION) / 2
            )
            if (darkMode) {
              colors.push(0.8, 0.7, 1.0)
            } else {
              colors.push(0.53, 0.22, 0.94)
            }
          }
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

        const material = new THREE.PointsMaterial({
          size: 6,
          vertexColors: true,
          transparent: true,
          opacity: darkMode ? 0.55 : 0.35,
          sizeAttenuation: true,
        })

        const points = new THREE.Points(geometry, material)
        scene.add(points)

        let count = 0

        const animate = () => {
          animationId = requestAnimationFrame(animate)
          const positionAttribute = geometry.attributes.position
          const posArr = positionAttribute.array

          let i = 0
          for (let ix = 0; ix < AMOUNTX; ix++) {
            for (let iy = 0; iy < AMOUNTY; iy++) {
              posArr[i * 3 + 1] =
                Math.sin((ix + count) * 0.3) * 50 +
                Math.sin((iy + count) * 0.5) * 50
              i++
            }
          }

          positionAttribute.needsUpdate = true
          renderer.render(scene, camera)
          count += 0.07
        }

        const handleResize = () => {
          camera.aspect = window.innerWidth / window.innerHeight
          camera.updateProjectionMatrix()
          renderer.setSize(window.innerWidth, window.innerHeight)
        }

        window.addEventListener('resize', handleResize)
        animate()

        // Store cleanup in ref so it runs on unmount
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
        // WebGL not available or THREE failed — silently degrade, no crash
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
