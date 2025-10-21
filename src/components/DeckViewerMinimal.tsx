// src/components/DeckViewerMinimal.tsx
'use client'

import { Canvas, useLoader } from '@react-three/fiber'
import { Environment, OrbitControls, useGLTF, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { Suspense, useEffect, useMemo } from 'react'


function DeckMeshes({ topUrl, bottomUrl }: { topUrl: string; bottomUrl: string }) {
    const { scene } = useGLTF('/models/deck.glb')

    // --- Load textures
    const topTex = useLoader(THREE.TextureLoader, topUrl)
    const bottomTex = useLoader(THREE.TextureLoader, bottomUrl)

    // Textures applied to a glTF mesh should not flip Y
    for (const t of [topTex, bottomTex]) {
        t.flipY = true
        t.colorSpace = THREE.SRGBColorSpace
        t.anisotropy = 8
        t.generateMipmaps = true
        t.minFilter = THREE.LinearMipmapLinearFilter
        t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping
        t.offset.set(0, 0)
        t.repeat.set(1, 1)
        t.rotation = 0
        t.center.set(0.5, 0.5)
    }

    // --- Materials: truly matte, no env reflections
    const topMat = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                map: topTex,
                roughness: 1,
                metalness: 0,
                envMapIntensity: 0,
            }),
        [topTex]
    )

    const bottomMat = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                map: bottomTex,
                roughness: 0.95,
                metalness: 0,
                envMapIntensity: 0,
            }),
        [bottomTex]
    )

    // Assign to the named meshes if present
    useEffect(() => {
        const top = scene.getObjectByName('DeckTop') as THREE.Mesh | null
        const bottom = scene.getObjectByName('DeckBottom') as THREE.Mesh | null
        if (top) top.material = topMat
        if (bottom) bottom.material = bottomMat
    }, [scene, topMat, bottomMat])

    // Also force-apply matte settings to any child mesh/materials in the GLB
    useEffect(() => {
        scene.traverse((o) => {
            const mesh = o as THREE.Mesh
            if (!mesh.isMesh || !mesh.material) return
            const apply = (m: THREE.Material) => {
                const mat = m as any
                if ('envMapIntensity' in mat) {
                    mat.envMapIntensity = 0
                    mat.roughness = Math.max(mat.roughness ?? 1, 0.95)
                    mat.metalness = 0
                    mat.needsUpdate = true
                }
            }
            if (Array.isArray(mesh.material)) mesh.material.forEach(apply)
            else apply(mesh.material)
        })
    }, [scene])

    // Keep scene transforms clean
    scene.rotation.set(0, 0, 0)
    scene.position.set(0, 0, 0)
    scene.scale.set(1, 1, 1)

    return <primitive object={scene} />
}

export default function DeckViewerMinimal({
    topUrl = '/deckAssets/grips/mb_red_pattern.png',
    bottomUrl = '/deckAssets/moonbirds/samplebottom.png',
}: {
    topUrl?: string
    bottomUrl?: string
}) {
    return (
        <Canvas
            camera={{ position: [1.1, 0.9, 0.75], fov: 20 }}
            gl={{ toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
        >
            <color attach="background" args={['#f7f7f7']} />

            {/* Simple lights; HDRI kept but materials ignore its reflections */}
            <ambientLight intensity={0.35} />
            <hemisphereLight intensity={0.4} />
            {/* key light (top) */}
            <directionalLight
                position={[3, 5, 6]}
                intensity={2.5}
                color="#ffffff"
            />
            {/* fill light (bottom) */}
            <directionalLight
                position={[-3, -5, -6]}   // roughly opposite side
                intensity={3.5}           // half as bright
                color="#ffffff"
            />


            <Suspense fallback={null}>
                <DeckMeshes topUrl={topUrl} bottomUrl={bottomUrl} />
                {/* Remove the Environment for now */}
                {/* <Environment preset="studio" /> */}

                <ContactShadows
                    position={[0, -0.05, 0]}  // slightly below the deck
                    opacity={0.75}             // shadow darkness (0.3–0.6 looks natural)
                    scale={5}                // size of the ground area
                    blur={1.5}                // softness
                    far={2}                   // how far it extends from the object
                />

            </Suspense>

            <OrbitControls
                enablePan={false}
                minDistance={1.0}
                maxDistance={2.5}
                enableDamping
                dampingFactor={.08}
            />
        </Canvas>
    )
}