'use client'

import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
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

/* ---------- Small texture loader that DOES NOT suspend ---------- */
const loader = new THREE.TextureLoader()
function loadTexture(url: string) {
    return new Promise<THREE.Texture>((resolve, reject) => {
        if (!url) {
            reject(new Error('Empty texture URL'))
            return
        }
        loader.load(
            url,
            async (tex) => {
                try {
                    if (tex.image?.decode) await tex.image.decode()
                } catch {
                    // ignore decode errors
                }
                tex.colorSpace = THREE.SRGBColorSpace
                tex.flipY = true
                tex.anisotropy = 8
                tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
                tex.needsUpdate = true
                resolve(tex)
            },
            undefined,
            (err) => reject(err)
        )
    })
}

/* ---------- Deck Meshes ---------- */
function DeckMeshes({ topUrl, bottomUrl }: { topUrl: string; bottomUrl: string }) {
    // Load the geometry/material slots once (this can suspend only on first mount)
    const gltf = useGLTF('/models/deck.glb')
    const scene = useMemo(() => gltf.scene.clone(), [gltf.scene])

    // We keep materials stable and swap their maps after new textures finish loading.
    const topMatRef = useRef<THREE.MeshStandardMaterial | null>(null)
    const botMatRef = useRef<THREE.MeshStandardMaterial | null>(null)
    const currentTopMap = useRef<THREE.Texture | null>(null)
    const currentBotMap = useRef<THREE.Texture | null>(null)

    // Create stable materials once
    const topMat = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                roughness: 1,
                metalness: 0,
                side: THREE.FrontSide,
            }),
        []
    )
    const bottomMat = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                roughness: 1,
                metalness: 0,
                side: THREE.FrontSide,
            }),
        []
    )

    useEffect(() => {
        topMatRef.current = topMat
        botMatRef.current = bottomMat
        const top = scene.getObjectByName('DeckTop') as THREE.Mesh | null
        const bottom = scene.getObjectByName('DeckBottom') as THREE.Mesh | null
        if (top) top.material = topMat
        if (bottom) bottom.material = bottomMat
    }, [scene, topMat, bottomMat])

    // Swap TOP texture after the new one is fully loaded/decoded
    useEffect(() => {
        let cancelled = false
        let old = currentTopMap.current

        loadTexture(topUrl)
            .then((tex) => {
                if (cancelled || !topMatRef.current) return
                currentTopMap.current = tex
                topMatRef.current.map = tex
                topMatRef.current.needsUpdate = true
                // Dispose previous map AFTER swapping (prevents flashes)
                if (old && old !== tex) old.dispose()
                old = null
            })
            .catch(() => {
                // keep previous map if load fails
            })

        return () => {
            cancelled = true
        }
    }, [topUrl])

    // Swap BOTTOM texture after the new one is fully loaded/decoded
    useEffect(() => {
        let cancelled = false
        let old = currentBotMap.current

        loadTexture(bottomUrl)
            .then((tex) => {
                if (cancelled || !botMatRef.current) return
                currentBotMap.current = tex
                botMatRef.current.map = tex
                botMatRef.current.needsUpdate = true
                if (old && old !== tex) old.dispose()
                old = null
            })
            .catch(() => {
                // keep previous map if load fails
            })

        return () => {
            cancelled = true
        }
    }, [bottomUrl])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            currentTopMap.current?.dispose()
            currentBotMap.current?.dispose()
            topMat.dispose()
            bottomMat.dispose()
        }
    }, [topMat, bottomMat])

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
            {/* No Suspense around DeckMeshes so it never unmounts while swapping textures */}
            <Canvas camera={{ position: [1.4, 0.8, 1.2], fov: 25 }} style={{ width: '100%', height: '100%' }}>
                <color attach="background" args={['#f7f7f7']} />

                {/* Lighting */}
                <ambientLight intensity={0.35} />
                <directionalLight position={[3, 5, 6]} intensity={2.5} />
                <directionalLight position={[-3, -5, -6]} intensity={3.2} />

                <DeckMeshes topUrl={topUrl!} bottomUrl={bottomUrl!} />
                <ContactShadows position={[0, 0.0, 0]} opacity={0.5} scale={2} blur={1.2} far={2} />

                <OrbitControls
                    ref={controlsRef}
                    minPolarAngle={0}
                    maxPolarAngle={Math.PI * 2}
                    enablePan={true}
                    enableDamping
                    dampingFactor={0.08}
                    minDistance={0.5}
                    maxDistance={3.5}
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
