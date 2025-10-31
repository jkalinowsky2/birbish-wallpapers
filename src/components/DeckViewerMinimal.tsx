'use client'

import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, useGLTF, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { useEffect, useMemo, useRef } from 'react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

/* ---------- Window helpers ---------- */
declare global {
    interface Window {
        deckSnap?: (
            pos: [number, number, number],
            target?: [number, number, number],
            up?: [number, number, number]
        ) => void
        deckCamera?: THREE.PerspectiveCamera
        deckCapture?: (opts: {
            view: 'top' | 'bottom'
            width: number
            height: number
            /** side margin multiplier (>1 adds space on left/right) */
            marginX?: number
            /** top/bottom tighten factor (<1 reduces vertical padding) */
            marginYFactor?: number
            /** legacy: if provided, treated as marginX */
            margin?: number
        }) => Promise<string>
    }
}

/* ---------- Small texture loader that does NOT suspend ---------- */
const loader = new THREE.TextureLoader();

function loadTexture(url: string) {
    return new Promise<THREE.Texture>((resolve, reject) => {
        if (!url) return reject(new Error('Empty texture URL'));

        loader.load(
            url,
            async (tex) => {
                try {
                    // HTMLImageElement has decode(); ImageBitmap does not.
                    const img = tex.image as HTMLImageElement | ImageBitmap | ({} & { decode?: () => Promise<void> });
                    if ('decode' in img && typeof img.decode === 'function') {
                        await img.decode();
                    }
                } catch {
                    /* ignore decode errors */
                }

                tex.colorSpace = THREE.SRGBColorSpace;
                tex.flipY = true;
                tex.anisotropy = 8;
                tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
                tex.needsUpdate = true;
                resolve(tex);
            },
            undefined,
            reject
        );
    });
}

/* ---------- Deck meshes ---------- */
const DeckMeshes = ({ topUrl, bottomUrl, rootRef }: { topUrl: string; bottomUrl: string; rootRef: React.MutableRefObject<THREE.Group | null> }) => {
    const gltf = useGLTF('/models/deck.glb')
    const sceneClone = useMemo(() => gltf.scene.clone(), [gltf.scene])

    const topMatRef = useRef<THREE.MeshStandardMaterial | null>(null)
    const botMatRef = useRef<THREE.MeshStandardMaterial | null>(null)
    const currentTopMap = useRef<THREE.Texture | null>(null)
    const currentBotMap = useRef<THREE.Texture | null>(null)

    const topMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, side: THREE.FrontSide }), [])
    const bottomMat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, side: THREE.FrontSide }), [])

    useEffect(() => {
        topMatRef.current = topMat
        botMatRef.current = bottomMat
        const top = sceneClone.getObjectByName('DeckTop') as THREE.Mesh | null
        const bottom = sceneClone.getObjectByName('DeckBottom') as THREE.Mesh | null
        if (top) top.material = topMat
        if (bottom) bottom.material = bottomMat
    }, [sceneClone, topMat, bottomMat])

    useEffect(() => {
        let cancelled = false
        let old = currentTopMap.current
        loadTexture(topUrl).then(tex => {
            if (cancelled || !topMatRef.current) return
            currentTopMap.current = tex
            topMatRef.current.map = tex
            topMatRef.current.needsUpdate = true
            if (old && old !== tex) old.dispose()
            old = null
        }).catch(() => { })
        return () => { cancelled = true }
    }, [topUrl])

    useEffect(() => {
        let cancelled = false
        let old = currentBotMap.current
        loadTexture(bottomUrl).then(tex => {
            if (cancelled || !botMatRef.current) return
            currentBotMap.current = tex
            botMatRef.current.map = tex
            botMatRef.current.needsUpdate = true
            if (old && old !== tex) old.dispose()
            old = null
        }).catch(() => { })
        return () => { cancelled = true }
    }, [bottomUrl])

    useEffect(() => {
        return () => {
            currentTopMap.current?.dispose()
            currentBotMap.current?.dispose()
            topMat.dispose()
            bottomMat.dispose()
        }
    }, [topMat, bottomMat])

    return (
        <group ref={rootRef} position={[0, 0.1, 0]}>
            <primitive object={sceneClone} />
        </group>
    )
}
useGLTF.preload('/models/deck.glb')




/** Fit the deck’s XZ bounds to an output aspect.
 *  Keeps side margin (marginX) fixed and only grows height as needed.
 *  marginX > 1 → more space left/right
 *  marginYFactor < 1 → tighter top/bottom
 */
function fitXZToAspectSeparate(
    box: THREE.Box3,
    aspect: number,
    marginX = 1.12,
    marginYFactor = 0.90
) {
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    // lock side spacing
    const halfW = (size.x * marginX) / 2;

    // keep output aspect using that width
    const desiredHalfH = halfW / aspect;

    // ensure deck fits vertically with chosen tighten factor
    const minHalfH = (size.z * (marginX * marginYFactor)) / 2;
    const halfH = Math.max(minHalfH, desiredHalfH);

    return { center, halfW, halfH };
}

/* ---------- Camera Controller inside Canvas ---------- */
function CameraController({ controlsRef }: { controlsRef: React.MutableRefObject<OrbitControlsImpl | null> }) {
    const { camera, scene } = useThree()

    const snap = (pos: [number, number, number], target: [number, number, number] = [0, 0, 0], up?: [number, number, number]) => {
        if (up) camera.up.set(...up)
        camera.position.set(...pos)
        controlsRef.current?.target.set(...target)
        controlsRef.current?.update()
    }

    // Expose helpers
    window.deckSnap = snap
    window.deckCamera = camera as THREE.PerspectiveCamera

    // Expose an offscreen orthographic capture that renders the SAME scene
    // Expose an offscreen orthographic capture that renders the SAME scene
    window.deckCapture = async ({
        view,
        width,
        height,
        margin,                 // legacy
        marginX,
        marginYFactor,
    }: {
        view: 'top' | 'bottom'
        width: number
        height: number
        marginX?: number
        marginYFactor?: number
        margin?: number
    }) => {
        const top = scene.getObjectByName('DeckTop');
        const bottom = scene.getObjectByName('DeckBottom');
        const target: THREE.Object3D = (top || bottom) ? new THREE.Group() : scene;
        if (target instanceof THREE.Group && (top || bottom)) {
            if (top) target.add(top.clone());
            if (bottom) target.add(bottom.clone());
        }

        const box = new THREE.Box3().setFromObject(target);
        const { center, halfW, halfH } = fitXZToAspectSeparate(
            box,
            width / height,
            marginX ?? margin ?? 1.12,       // ← side margin (keep width padding)
            marginYFactor ?? 0.90            // ← tighten top/bottom
        );

        const cam = new THREE.OrthographicCamera(-halfW, halfW, halfH, -halfH, 0.01, 100);
        cam.up.set(0, 0, -1);  // horizontal deck
        const size = box.getSize(new THREE.Vector3());
        const yOffset = size.y * 2 + 1;
        cam.position.set(center.x, view === 'top' ? center.y + yOffset : center.y - yOffset, center.z);
        cam.lookAt(center);
        cam.updateProjectionMatrix();

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(1);
        renderer.setSize(width, height);
        renderer.setClearColor(0xf7f7f7, 1);

        renderer.render(scene, cam);
        const dataUrl = renderer.domElement.toDataURL('image/png');
        renderer.dispose();
        // @ts-expect-error allow GC in some envs
        renderer.domElement = null;
        return dataUrl;
    };

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
    const rootRef = useRef<THREE.Group | null>(null)

    const snap = (pos: [number, number, number], target?: [number, number, number], up?: [number, number, number]) =>
        window.deckSnap?.(pos, target ?? [0, 0, 0], up)

    const toHeroView = () => snap([1.4, 0.8, 1.2], [0, 0.15, 0], [0, 1, 0])        // angled
    const toTopView = () => snap([0, 2.0, 0.001], [0, 0, 0], [-1, 0, 0])         // top
    const toBottomView = () => snap([0, -2.0, 0.001], [0, 0, 0], [-1, 0, 0])         // bottom

    return (
        <div style={{ position: 'relative', width: '100%', height: 'min(90vh, 1000px)' }}>
            <Canvas camera={{ position: [1.4, 0.8, 1.2], fov: 25 }} style={{ width: '100%', height: '100%' }}>
                <color attach="background" args={['#f7f7f7']} />

                {/* Lighting */}
                <ambientLight intensity={0.35} />
                <directionalLight position={[3, 5, 6]} intensity={2.5} />
                <directionalLight position={[-3, -5, -6]} intensity={3.2} />

                <DeckMeshes topUrl={topUrl!} bottomUrl={bottomUrl!} rootRef={rootRef} />
                <ContactShadows position={[0, 0.0, 0]} opacity={0.5} scale={2} blur={1.2} far={2} />

                <OrbitControls
                    ref={controlsRef}
                    minPolarAngle={0}
                    maxPolarAngle={Math.PI * 2}
                    enablePan
                    enableDamping
                    dampingFactor={0.08}
                    minDistance={0.5}
                    maxDistance={3.5}
                    target={[0, 0.15, 0]}
                />

                <CameraController controlsRef={controlsRef} />
            </Canvas>

            {/* Preset view buttons */}
            <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8, zIndex: 10 }}>
                <button className="btn btn-ghost btn-sm" onClick={toHeroView}>Hero</button>
                <button className="btn btn-ghost btn-sm" onClick={toTopView}>Top</button>
                <button className="btn btn-ghost btn-sm" onClick={toBottomView}>Bottom</button>
            </div>
        </div>
    )
}

// 'use client'

// import { Canvas, useThree } from '@react-three/fiber'
// import { OrbitControls, useGLTF, ContactShadows } from '@react-three/drei'
// import * as THREE from 'three'
// import { useEffect, useMemo, useRef } from 'react'
// import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

// /* ---------- Globals exposed to the app ---------- */
// declare global {
//   interface Window {
//     deckSnap?: (
//       pos: [number, number, number],
//       target?: [number, number, number],
//       up?: [number, number, number]
//     ) => void
//     deckCamera?: THREE.PerspectiveCamera
//     deckCapture?: (opts: {
//       view: 'top' | 'bottom'
//       fov?: number
//       width?: number
//       height?: number
//     }) => Promise<string>
//   }
// }

// /* ---------- Utilities ---------- */
// const loader = new THREE.TextureLoader()
// function loadTexture(url: string) {
//   return new Promise<THREE.Texture>((resolve, reject) => {
//     if (!url) return reject(new Error('Empty texture URL'))
//     loader.load(
//       url,
//       async (tex) => {
//         try {
//           // @ts-ignore decode may exist
//           if (tex.image?.decode) await tex.image.decode()
//         } catch {}
//         tex.colorSpace = THREE.SRGBColorSpace
//         tex.flipY = true
//         tex.anisotropy = 8
//         tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
//         tex.needsUpdate = true
//         resolve(tex)
//       },
//       undefined,
//       reject
//     )
//   })
// }

// /** Frame an object so it fully fits in the camera frustum */
// function frameObject(
//   camera: THREE.PerspectiveCamera,
//   controls: OrbitControlsImpl | null,
//   object: THREE.Object3D,
//   margin = 1.18 // 18% breathing room (tweak to taste)
// ) {
//   const box = new THREE.Box3().setFromObject(object)
//   const size = box.getSize(new THREE.Vector3())
//   const center = box.getCenter(new THREE.Vector3())
//   const maxSize = Math.max(size.x, size.y, size.z)

//   const halfFov = THREE.MathUtils.degToRad(camera.fov * 0.5)
//   const distance = (maxSize * 0.5) / Math.tan(halfFov) * margin

//   const dir = new THREE.Vector3()
//     .subVectors(camera.position, controls?.target ?? new THREE.Vector3())
//     .normalize()

//   camera.position.copy(center).addScaledVector(dir, distance)
//   camera.near = Math.max(0.01, distance * 0.01)
//   camera.far = distance * 100
//   camera.updateProjectionMatrix()

//   controls?.target.copy(center)
//   controls?.update()
// }

// /* ---------- Deck meshes (stable materials, texture hot-swap) ---------- */
// function DeckMeshes({
//   topUrl,
//   bottomUrl,
//   onReady,
// }: {
//   topUrl: string
//   bottomUrl: string
//   onReady?: (root: THREE.Object3D) => void
// }) {
//   const gltf = useGLTF('/models/deck.glb')
//   const scene = useMemo(() => gltf.scene.clone(), [gltf.scene])

//   const topMatRef = useRef<THREE.MeshStandardMaterial | null>(null)
//   const botMatRef = useRef<THREE.MeshStandardMaterial | null>(null)
//   const currentTopMap = useRef<THREE.Texture | null>(null)
//   const currentBotMap = useRef<THREE.Texture | null>(null)

//   const topMat = useMemo(
//     () =>
//       new THREE.MeshStandardMaterial({
//         roughness: 1,
//         metalness: 0,
//         side: THREE.FrontSide,
//       }),
//     []
//   )
//   const bottomMat = useMemo(
//     () =>
//       new THREE.MeshStandardMaterial({
//         roughness: 1,
//         metalness: 0,
//         side: THREE.FrontSide,
//       }),
//     []
//   )

//   useEffect(() => {
//     topMatRef.current = topMat
//     botMatRef.current = bottomMat
//     const top = scene.getObjectByName('DeckTop') as THREE.Mesh | null
//     const bottom = scene.getObjectByName('DeckBottom') as THREE.Mesh | null
//     if (top) top.material = topMat
//     if (bottom) bottom.material = bottomMat
//     onReady?.(scene)
//   }, [scene, topMat, bottomMat, onReady])

//   useEffect(() => {
//     let cancelled = false
//     let old = currentTopMap.current
//     loadTexture(topUrl)
//       .then((tex) => {
//         if (cancelled || !topMatRef.current) return
//         currentTopMap.current = tex
//         topMatRef.current.map = tex
//         topMatRef.current.needsUpdate = true
//         if (old && old !== tex) old.dispose()
//         old = null
//       })
//       .catch(() => {})
//     return () => {
//       cancelled = true
//     }
//   }, [topUrl])

//   useEffect(() => {
//     let cancelled = false
//     let old = currentBotMap.current
//     loadTexture(bottomUrl)
//       .then((tex) => {
//         if (cancelled || !botMatRef.current) return
//         currentBotMap.current = tex
//         botMatRef.current.map = tex
//         botMatRef.current.needsUpdate = true
//         if (old && old !== tex) old.dispose()
//         old = null
//       })
//       .catch(() => {})
//     return () => {
//       cancelled = true
//     }
//   }, [bottomUrl])

//   useEffect(() => {
//     return () => {
//       currentTopMap.current?.dispose()
//       currentBotMap.current?.dispose()
//       topMat.dispose()
//       bottomMat.dispose()
//     }
//   }, [topMat, bottomMat])

//   return (
//     <group position={[0, 0.1, 0]}>
//       <primitive object={scene} />
//     </group>
//   )
// }
// useGLTF.preload('/models/deck.glb')

// /* ---------- Camera controller (presets) ---------- */
// function CameraController({
//   controlsRef,
// }: {
//   controlsRef: React.MutableRefObject<OrbitControlsImpl | null>
// }) {
//   const { camera } = useThree()

//   const snap = (
//     pos: [number, number, number],
//     target: [number, number, number] = [0, 0, 0],
//     up?: [number, number, number]
//   ) => {
//     if (up) camera.up.set(...up)
//     camera.position.set(...pos)
//     controlsRef.current?.target.set(...target)
//     controlsRef.current?.update()
//   }

//   window.deckSnap = snap
//   window.deckCamera = camera as THREE.PerspectiveCamera
//   return null
// }

// /* ---------- Capture API (used by your exporter) ---------- */
// function CaptureAPI({
//   controlsRef,
//   rootRef,
// }: {
//   controlsRef: React.MutableRefObject<OrbitControlsImpl | null>
//   rootRef: React.MutableRefObject<THREE.Object3D | null>
// }) {
//   const { gl, scene, camera } = useThree()

//   window.deckCapture = async (opts) => {
//     const persp = camera as THREE.PerspectiveCamera
//     const fov = opts.fov ?? 45
//     const W = opts.width ?? gl.domElement.width
//     const H = opts.height ?? gl.domElement.height

//     // Save current state
//     const prev = {
//       fov: persp.fov,
//       pos: persp.position.clone(),
//       up: persp.up.clone(),
//       target: controlsRef.current?.target.clone(),
//       size: gl.getSize(new THREE.Vector2()).clone(),
//       dpr: gl.getPixelRatio(),
//     }

//     // Orient camera for view
//     if (opts.view === 'top') {
//       persp.up.set(-1, 0, 0) // X-up
//       persp.position.set(0, 6, 0.001)
//     } else {
//       persp.up.set(-1, 0, 0)
//       persp.position.set(0, -6, 0.001)
//     }
//     controlsRef.current?.target.set(0, 0, 0)
//     persp.fov = fov
//     persp.updateProjectionMatrix()

//     // Frame the model tightly
//     if (rootRef.current) frameObject(persp, controlsRef.current, rootRef.current, 1.18)

//     // Render at export resolution
//     gl.setPixelRatio(1)
//     gl.setSize(W, H, false)
//     gl.render(scene, camera)
//     const url = gl.domElement.toDataURL('image/png')

//     // Restore viewer state
//     gl.setPixelRatio(prev.dpr)
//     gl.setSize(prev.size.x, prev.size.y, false)
//     persp.fov = prev.fov
//     persp.up.copy(prev.up)
//     persp.position.copy(prev.pos)
//     persp.updateProjectionMatrix()
//     if (prev.target) {
//       controlsRef.current?.target.copy(prev.target)
//       controlsRef.current?.update()
//     }

//     return url
//   }

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
//   const controlsRef = useRef<OrbitControlsImpl | null>(null)
//   const rootRef = useRef<THREE.Object3D | null>(null)

//   const snap = (
//     pos: [number, number, number],
//     target?: [number, number, number],
//     up?: [number, number, number]
//   ) => window.deckSnap?.(pos, target ?? [0, 0, 0], up)

//   // Presets use framing so the full deck is visible
//   const toHeroView = () => {
//     snap([1.6, 0.9, 1.4], [0, 0.15, 0], [0, 1, 0])
//     if (window.deckCamera && rootRef.current)
//       frameObject(window.deckCamera, controlsRef.current, rootRef.current, 1.12)
//   }
//   const toTopView = () => {
//     snap([0, 2.0, 0.001], [0, 0, 0], [-1, 0, 0])
//     if (window.deckCamera && rootRef.current)
//       frameObject(window.deckCamera, controlsRef.current, rootRef.current, 1.12)
//   }
//   const toBottomView = () => {
//     snap([0, -2.0, 0.001], [0, 0, 0], [-1, 0, 0])
//     if (window.deckCamera && rootRef.current)
//       frameObject(window.deckCamera, controlsRef.current, rootRef.current, 1.12)
//   }

//   return (
//     <div style={{ position: 'relative', width: '100%', height: 'min(90vh, 1000px)' }}>
//       <Canvas camera={{ position: [1.4, 0.8, 1.2], fov: 30 }} style={{ width: '100%', height: '100%' }}>
//         <color attach="background" args={['#f7f7f7']} />

//         {/* Lighting */}
//         <ambientLight intensity={0.35} />
//         <directionalLight position={[3, 5, 6]} intensity={2.5} />
//         <directionalLight position={[-3, -5, -6]} intensity={3.2} />

//         {/* Model */}
//         <DeckMeshes
//           topUrl={topUrl!}
//           bottomUrl={bottomUrl!}
//           onReady={(root) => {
//             rootRef.current = root
//           }}
//         />
//         <ContactShadows position={[0, 0.0, 0]} opacity={0.5} scale={2} blur={1.2} far={2} />

//         <OrbitControls
//           ref={controlsRef}
//           minPolarAngle={0}
//           maxPolarAngle={Math.PI * 2}
//           enablePan
//           enableDamping
//           dampingFactor={0.08}
//           minDistance={0.5}
//           maxDistance={12}
//           target={[0, 0.15, 0]}
//         />

//         <CameraController controlsRef={controlsRef} />
//         <CaptureAPI controlsRef={controlsRef} rootRef={rootRef} />
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




