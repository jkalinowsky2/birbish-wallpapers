'use client'

import { Canvas, useLoader, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF, ContactShadows } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

/* ---------- Global window helpers (typed) ---------- */
declare global {
  interface Window {
    deckSnap?: (
      pos: [number, number, number],
      target?: [number, number, number],
      up?: [number, number, number]
    ) => void
    deckCamera?: THREE.PerspectiveCamera
  }
}

/* ---------- Deck Meshes ---------- */
function DeckMeshes({ topUrl, bottomUrl }: { topUrl: string; bottomUrl: string }) {
  const gltf = useGLTF('/models/deck.glb')
  const scene = useMemo(() => gltf.scene.clone(), [gltf.scene])

  // Load textures
  const topTex = useLoader(THREE.TextureLoader, topUrl)
  const bottomTex = useLoader(THREE.TextureLoader, bottomUrl)

  const prep = (t: THREE.Texture) => {
    t.colorSpace = THREE.SRGBColorSpace
    t.flipY = true
    t.anisotropy = 8
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
    t.needsUpdate = true
  }

  useEffect(() => {
    prep(topTex)
    prep(bottomTex)
  }, [topTex, bottomTex])

  const topMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: topTex, roughness: 1, metalness: 0 }),
    [topTex]
  )
  const bottomMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: bottomTex, roughness: 1, metalness: 0 }),
    [bottomTex]
  )

  // Assign materials
  useEffect(() => {
    const top = scene.getObjectByName('DeckTop') as THREE.Mesh | null
    const bottom = scene.getObjectByName('DeckBottom') as THREE.Mesh | null
    if (top) top.material = topMat
    if (bottom) bottom.material = bottomMat
  }, [scene, topMat, bottomMat])

  return (
    <group position={[0, 0.1, 0]}>
      <primitive object={scene} />
    </group>
  )
}
useGLTF.preload('/models/deck.glb')

/* ---------- Camera Controller (inside Canvas) ---------- */
function CameraController({
  controlsRef,
}: {
  controlsRef: React.MutableRefObject<OrbitControlsImpl | null>
}) {
  const { camera } = useThree()

  const snap = (
    pos: [number, number, number],
    target: [number, number, number] = [0, 0, 0],
    up?: [number, number, number]
  ) => {
    if (up) camera.up.set(...up)
    camera.position.set(...pos)
    controlsRef.current?.target.set(...target)
    controlsRef.current?.update()
  }

  // Expose helpers for UI buttons outside Canvas
  window.deckSnap = snap
  window.deckCamera = camera as THREE.PerspectiveCamera

  return null
}

/* ---------- Main Viewer ---------- */
export default function DeckViewerMinimal({
  topUrl = '/deckAssets/grips/mb_red_pattern.png',
  bottomUrl = '/deckAssets/moonbirds/samplebottom.png',
}: {
  topUrl?: string
  bottomUrl?: string
}) {
  const controlsRef = useRef<OrbitControlsImpl | null>(null)

  // Wrapper to call the snap function stored on window
  const snap = (
    pos: [number, number, number],
    target?: [number, number, number],
    up?: [number, number, number]
  ) => window.deckSnap?.(pos, target ?? [0, 0, 0], up)

  // Preset views (note the per-preset `up` vector)
  const toHeroView = () => snap([1.4, 0.8, 1.2], [0, 0.15, 0], [0, 1, 0]) // angled, Y-up
  const toTopView = () => snap([0, 2.0, 0.001], [0, 0, 0], [-1, 0, 0])   // portrait top, X-up
  const toBottomView = () => snap([0, -2.0, 0.001], [0, 0, 0], [-1, 0, 0]) // portrait bottom, X-up

  return (
    <div style={{ position: 'relative', width: '100%', height: 'min(90vh, 1000px)' }}>
      <Canvas camera={{ position: [1.4, 0.8, 1.2], fov: 25 }} style={{ width: '100%', height: '100%' }}>
        <color attach="background" args={['#f7f7f7']} />

        {/* Lighting */}
        <ambientLight intensity={0.35} />
        <directionalLight position={[3, 5, 6]} intensity={2.5} />
        <directionalLight position={[-3, -5, -6]} intensity={3.2} />

        <Suspense fallback={null}>
          <DeckMeshes topUrl={topUrl} bottomUrl={bottomUrl} />
          <ContactShadows position={[0, 0.0, 0]} opacity={0.5} scale={4} blur={1.2} far={2} />
        </Suspense>

        <OrbitControls
          ref={controlsRef}
          enablePan={false}
          enableDamping
          dampingFactor={0.08}
          minDistance={0.5}
          maxDistance={2.0}
          target={[0, 0.15, 0]}
        />

        <CameraController controlsRef={controlsRef} />
      </Canvas>

      {/* Preset view buttons */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          display: 'flex',
          gap: 8,
          zIndex: 10,
        }}
      >
        <button className="btn btn-ghost btn-sm" onClick={toHeroView}>
          Hero
        </button>
        <button className="btn btn-ghost btn-sm" onClick={toTopView}>
          Top
        </button>
        <button className="btn btn-ghost btn-sm" onClick={toBottomView}>
          Bottom
        </button>
      </div>
    </div>
  )
}

// 'use client'

// import { Canvas, useLoader, useThree } from '@react-three/fiber'
// import { OrbitControls, useGLTF, ContactShadows } from '@react-three/drei'
// import { Suspense, useEffect, useMemo, useRef } from 'react'
// import * as THREE from 'three'

// /* ---------- Deck Meshes ---------- */
// function DeckMeshes({ topUrl, bottomUrl }: { topUrl: string; bottomUrl: string }) {
//   const gltf = useGLTF('/models/deck.glb')
//   const scene = useMemo(() => gltf.scene.clone(), [gltf.scene])

//   // Load textures
//   const topTex = useLoader(THREE.TextureLoader, topUrl)
//   const bottomTex = useLoader(THREE.TextureLoader, bottomUrl)

//   const prep = (t: THREE.Texture) => {
//     t.colorSpace = THREE.SRGBColorSpace
//     t.flipY = true
//     t.anisotropy = 8
//     t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
//     t.needsUpdate = true
//   }

//   useEffect(() => {
//     prep(topTex)
//     prep(bottomTex)
//   }, [topTex, bottomTex])

//   const topMat = useMemo(
//     () =>
//       new THREE.MeshStandardMaterial({
//         map: topTex,
//         roughness: 1,
//         metalness: 0,
//       }),
//     [topTex]
//   )

//   const bottomMat = useMemo(
//     () =>
//       new THREE.MeshStandardMaterial({
//         map: bottomTex,
//         roughness: 1,
//         metalness: 0,
//       }),
//     [bottomTex]
//   )

//   // Assign materials
//   useEffect(() => {
//     const top = scene.getObjectByName('DeckTop') as THREE.Mesh | null
//     const bottom = scene.getObjectByName('DeckBottom') as THREE.Mesh | null
//     if (top) top.material = topMat
//     if (bottom) bottom.material = bottomMat
//   }, [scene, topMat, bottomMat])

//   return (
//     <group position={[0, 0.0, 0]}>
//       <primitive object={scene} />
//     </group>
//   )
// }
// useGLTF.preload('/models/deck.glb')

// /* ---------- Camera Controller ---------- */
// function CameraController({ controlsRef }: { controlsRef: React.MutableRefObject<any> }) {
//   const { camera } = useThree()

//   const snap = (
//     pos: [number, number, number],
//     target: [number, number, number] = [0, 0, 0],
//     up?: [number, number, number]
//   ) => {
//     if (up) camera.up.set(...up)
//     camera.position.set(...pos)
//     controlsRef.current?.target?.set(...target)
//     controlsRef.current?.update?.()
//   }

//   ;(window as any).deckSnap = snap
//   return null
// }

// /* ---------- Main Viewer ---------- */
// export default function DeckViewerMinimal({
//   topUrl = '/deckAssets/grips/mb_red_pattern.png',
//   bottomUrl = '/deckAssets/moonbirds/samplebottom.png',
// }: {
//   topUrl?: string
//   bottomUrl?: string
// }) {
//   const controlsRef = useRef<any>(null)

//   // Wrapper to call the snap function stored on window
//   const snap = (
//     pos: [number, number, number],
//     target?: [number, number, number],
//     up?: [number, number, number]
//   ) => (window as any).deckSnap?.(pos, target ?? [0, 0, 0], up)

//   // Preset views
//   const toHeroView = () => snap([1.4, 0.8, 1.2], [0, 0.15, 0], [0, 1, 0]) // angled
//   const toTopView = () => snap([0, 2.0, 0.001], [0, 0, 0], [-1, 0, 0]) // portrait top
//   const toBottomView = () => snap([0, -2.0, 0.001], [0, 0, 0], [-1, 0, 0]) // portrait bottom

//   return (
//     <div style={{ position: 'relative', width: '100%', height: 'min(90vh, 1000px)' }}>
//       <Canvas camera={{ position: [1.4, 0.8, 1.2], fov: 25 }} style={{ width: '100%', height: '100%' }}>
//         <color attach="background" args={['#f7f7f7']} />

//         {/* Lighting */}
//         <ambientLight intensity={0.35} />
//         <directionalLight position={[3, 5, 6]} intensity={2.5} />
//         <directionalLight position={[-3, -5, -6]} intensity={3.2} />

//         <Suspense fallback={null}>
//           <DeckMeshes topUrl={topUrl} bottomUrl={bottomUrl} />
//           <ContactShadows position={[0, -0.05, 0]} opacity={0.5} scale={4} blur={1.2} far={2} />
//         </Suspense>

//         <OrbitControls
//           ref={controlsRef}
//           enablePan={true}
//           enableDamping
//           dampingFactor={0.08}
//           minDistance={0.5}
//           maxDistance={3.0}
//           target={[0, 0.15, 0]}
//         />

//         <CameraController controlsRef={controlsRef} />
//       </Canvas>

//       {/* Preset view buttons */}
//       <div
//         style={{
//           position: 'absolute',
//           top: 12,
//           right: 12,
//           display: 'flex',
//           gap: 8,
//           zIndex: 10,
//         }}
//       >
//         <button className="btn btn-ghost btn-sm" onClick={toHeroView}>
//           Hero
//         </button>
//         <button className="btn btn-ghost btn-sm" onClick={toTopView}>
//           Top
//         </button>
//         <button className="btn btn-ghost btn-sm" onClick={toBottomView}>
//           Bottom
//         </button>
//       </div>
//     </div>
//   )
// }

// /* ---------- Optional Type Declaration ---------- */
// declare global {
//   interface Window {
//     deckSnap?: (
//       pos: [number, number, number],
//       target?: [number, number, number],
//       up?: [number, number, number]
//     ) => void
//   }
// }