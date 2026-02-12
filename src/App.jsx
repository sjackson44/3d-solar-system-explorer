import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { bodies, orbitalBands } from './data'

const ORBIT_SPEED = 0.2
const SPIN_SPEED = 1.2
const MIN_SPEED = 0.2
const MOON_ORBIT_BASE = 0.012

function OrbitRing({ radius, color = '#2b3c5a' }) {
  const geometry = useMemo(() => {
    const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2, false, 0)
    const points = curve.getPoints(220)
    return new THREE.BufferGeometry().setFromPoints(points.map((p) => new THREE.Vector3(p.x, 0, p.y)))
  }, [radius])

  return (
    <line geometry={geometry}>
      <lineBasicMaterial color={color} transparent opacity={0.35} />
    </line>
  )
}

function RingLine({ radius, color, opacity = 0.5, segments = 320 }) {
  const points = useMemo(() => {
    const arr = new Float32Array((segments + 1) * 3)
    for (let i = 0; i <= segments; i += 1) {
      const t = (i / segments) * Math.PI * 2
      arr[i * 3] = Math.cos(t) * radius
      arr[i * 3 + 1] = Math.sin(t) * radius
      arr[i * 3 + 2] = 0
    }
    return arr
  }, [radius, segments])

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={points.length / 3} array={points} itemSize={3} />
      </bufferGeometry>
      <lineBasicMaterial color={color} transparent opacity={opacity} />
    </line>
  )
}

function Belt({ count, innerRadius, outerRadius, thickness, color, opacity, size = 0.35 }) {
  const points = useMemo(() => {
    const positions = new Float32Array(count * 3)

    for (let i = 0; i < count; i += 1) {
      const t = Math.random() * Math.PI * 2
      const r = THREE.MathUtils.lerp(innerRadius, outerRadius, Math.pow(Math.random(), 0.7))
      const y = (Math.random() - 0.5) * thickness
      positions[i * 3] = Math.cos(t) * r
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = Math.sin(t) * r
    }

    return positions
  }, [count, innerRadius, outerRadius, thickness])

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={points.length / 3} array={points} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color={color} size={size} sizeAttenuation transparent opacity={opacity} />
    </points>
  )
}

function OortCloud({ radius = 3400, spread = 500, count = 10000 }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = radius + (Math.random() - 0.5) * spread
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      arr[i * 3 + 1] = r * Math.cos(phi)
      arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    return arr
  }, [count, radius, spread])

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#86aef0" size={1.2} transparent opacity={0.18} sizeAttenuation />
    </points>
  )
}

function DeepSpaceField({ radius = 12000, spread = 4200, count = 15000 }) {
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)

    for (let i = 0; i < count; i += 1) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = radius + (Math.random() - 0.5) * spread
      arr[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      arr[i * 3 + 1] = r * Math.cos(phi)
      arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }

    return arr
  }, [count, radius, spread])

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#f4fbff" size={2.2} sizeAttenuation transparent opacity={0.58} />
    </points>
  )
}

function CameraLockedStarShell({ radius = 42000, count = 18000 }) {
  const { camera } = useThree()
  const shellRef = useRef()

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)

    for (let i = 0; i < count; i += 1) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      arr[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      arr[i * 3 + 1] = radius * Math.cos(phi)
      arr[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta)
    }

    return arr
  }, [count, radius])

  useFrame(() => {
    if (!shellRef.current) return
    shellRef.current.position.copy(camera.position)
  })

  return (
    <points ref={shellRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#e7f1ff" size={2.1} sizeAttenuation={false} transparent opacity={0.34} />
    </points>
  )
}

function Moon({ moon, parentName, speedScale, registerBodyRef, onSelectTarget, freezeAllMotion }) {
  const pivot = useRef()
  const meshRef = useRef()
  const moonTexture = useTexture(moon.texture)

  useEffect(() => {
    moonTexture.anisotropy = 8
    moonTexture.wrapS = THREE.RepeatWrapping
    moonTexture.wrapT = THREE.ClampToEdgeWrapping
    moonTexture.minFilter = THREE.LinearMipmapLinearFilter
    moonTexture.magFilter = THREE.LinearFilter
    moonTexture.colorSpace = THREE.SRGBColorSpace
    moonTexture.needsUpdate = true
  }, [moonTexture])

  useFrame((_, delta) => {
    if (!pivot.current || !meshRef.current) return
    const orbit = freezeAllMotion ? 0 : (1 / Math.max(Math.abs(moon.orbitPeriod), 0.02)) * MOON_ORBIT_BASE * speedScale
    const direction = moon.orbitPeriod < 0 ? -1 : 1
    pivot.current.rotation.y += delta * orbit * direction
    meshRef.current.rotation.y += delta * SPIN_SPEED * speedScale
  })

  return (
    <group ref={pivot}>
      <mesh
        ref={(ref) => {
          meshRef.current = ref
          registerBodyRef(`${parentName}/${moon.name}`, ref, moon.radius)
        }}
        position={[moon.distance, 0, 0]}
        castShadow
        onClick={(event) => {
          event.stopPropagation()
          onSelectTarget(parentName, moon.name)
        }}
      >
        <sphereGeometry args={[moon.radius, 24, 24]} />
        <meshStandardMaterial
          map={moonTexture}
          roughness={0.95}
          metalness={0.05}
          emissive={new THREE.Color('#111827')}
          emissiveMap={moonTexture}
          emissiveIntensity={0.14}
        />
      </mesh>
    </group>
  )
}

function EarthMaterial({ dayMap, nightMap }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          dayMap: { value: dayMap },
          nightMap: { value: nightMap },
          sunPosition: { value: new THREE.Vector3(0, 0, 0) },
          ambient: { value: 0.3 }
        },
        vertexShader: `
          varying vec2 vUv;
          varying vec3 vWorldPos;
          varying vec3 vWorldNormal;

          void main() {
            vUv = uv;
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPos = worldPos.xyz;
            vWorldNormal = normalize(mat3(modelMatrix) * normal);
            gl_Position = projectionMatrix * viewMatrix * worldPos;
          }
        `,
        fragmentShader: `
          uniform sampler2D dayMap;
          uniform sampler2D nightMap;
          uniform vec3 sunPosition;
          uniform float ambient;

          varying vec2 vUv;
          varying vec3 vWorldPos;
          varying vec3 vWorldNormal;

          void main() {
            vec3 toSun = normalize(sunPosition - vWorldPos);
            float ndl = dot(normalize(vWorldNormal), toSun);
            float dayMask = smoothstep(-0.12, 0.2, ndl);

            vec3 dayColor = texture2D(dayMap, vUv).rgb;
            vec3 nightColor = texture2D(nightMap, vUv).rgb;

            float lit = ambient + max(ndl, 0.0) * (1.0 - ambient);
            vec3 base = mix(nightColor * 0.42, dayColor, dayMask);
            vec3 cityGlow = nightColor * (1.0 - dayMask) * 0.28;

            gl_FragColor = vec4(base * lit + cityGlow, 1.0);
          }
        `
      }),
    [dayMap, nightMap]
  )

  useEffect(() => () => material.dispose(), [material])

  return <primitive attach="material" object={material} />
}

function Planet({
  data,
  speedScale,
  selectedName,
  setSelectedName,
  setSelectedMoonKey,
  registerBodyRef,
  showOrbitLines,
  freezeSolarOrbits,
  freezeAllMotion,
  onSelectMoonTarget
}) {
  const orbitRef = useRef()
  const planetRef = useRef()
  const isEarth = data.name === 'Earth'
  const baseEmissiveIntensity = data.name === 'Mars' ? 0.36 : 0.24
  const textures = useTexture(
    isEarth
      ? [data.texture, '/solar-system-skins/earth-night.jpg', data.ringTexture || data.texture]
      : [data.texture, data.ringTexture || data.texture]
  )
  const tex = textures[0]
  const earthNightTex = isEarth ? textures[1] : null
  const ringTexCandidate = isEarth ? textures[2] : textures[1]
  const ringTex = data.ringTexture ? ringTexCandidate : null
  const isUranus = data.name === 'Uranus'
  const axialTiltRad = THREE.MathUtils.degToRad(data.axialTiltDeg ?? 0)
  const moonPlaneTiltRad = data.name === 'Uranus' || data.name === 'Pluto' ? 0 : axialTiltRad

  useEffect(() => {
    textures.forEach((texture) => {
      if (!texture) return
      texture.anisotropy = 8
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.ClampToEdgeWrapping
      texture.minFilter = THREE.LinearMipmapLinearFilter
      texture.magFilter = THREE.LinearFilter
      texture.colorSpace = THREE.SRGBColorSpace
      texture.needsUpdate = true
    })
  }, [textures])

  useFrame((_, delta) => {
    if (!orbitRef.current || !planetRef.current) return

    const orbitSpeed = freezeSolarOrbits ? 0 : (1 / Math.max(data.orbitPeriod, 0.02)) * ORBIT_SPEED * speedScale
    const spinDirection = data.rotationPeriod < 0 ? -1 : 1
    const spinSpeed = (1 / Math.max(Math.abs(data.rotationPeriod), 0.2)) * SPIN_SPEED * speedScale

    orbitRef.current.rotation.y += delta * orbitSpeed
    planetRef.current.rotation.y += delta * spinSpeed * spinDirection
  })

  return (
    <group ref={orbitRef}>
      <group position={[data.distance, 0, 0]}>
        <group rotation={[0, 0, axialTiltRad]}>
          <mesh
            ref={(ref) => {
              planetRef.current = ref
              registerBodyRef(data.name, ref, data.radius)
            }}
            castShadow
            receiveShadow
            onClick={(event) => {
              event.stopPropagation()
              setSelectedMoonKey(null)
              setSelectedName(data.name)
            }}
          >
            <sphereGeometry args={[data.radius, 48, 48]} />
            {isEarth ? (
              <EarthMaterial dayMap={tex} nightMap={earthNightTex} />
            ) : (
              <meshStandardMaterial map={tex} roughness={0.82} metalness={0.06} emissive={new THREE.Color('#1d1d1d')} emissiveIntensity={baseEmissiveIntensity} />
            )}
          </mesh>

          {ringTex && !isUranus ? (
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[data.radius * 1.3, data.radius * 2.25, 128]} />
              <meshStandardMaterial map={ringTex} transparent side={THREE.DoubleSide} emissive={new THREE.Color('#2d2d2d')} emissiveIntensity={0.28} />
            </mesh>
          ) : null}

          {isUranus ? (
            <group rotation={[-Math.PI / 2, 0, 0]}>
              <RingLine radius={data.radius * 1.74} color="#d4dde8" opacity={0.88} />
              <RingLine radius={data.radius * 1.805} color="#bfcbd9" opacity={0.68} />
              <RingLine radius={data.radius * 1.955} color="#cdd8e3" opacity={0.52} />
              <RingLine radius={data.radius * 2.095} color="#dde6ef" opacity={0.4} />
            </group>
          ) : null}
        </group>

        <group rotation={[0, 0, moonPlaneTiltRad]}>
          {data.moons.map((moon) => (
            <Moon
              key={`${data.name}-${moon.name}`}
              moon={moon}
              parentName={data.name}
              speedScale={speedScale}
              registerBodyRef={registerBodyRef}
              onSelectTarget={onSelectMoonTarget}
              freezeAllMotion={freezeAllMotion}
            />
          ))}
        </group>
      </group>

      {showOrbitLines ? <OrbitRing radius={data.distance} color={selectedName === data.name ? '#7babff' : '#2e4e7a'} /> : null}
    </group>
  )
}

function CameraPilot({ mode, selectedTargetKey, followSelected, freezeAllMotion, bodyRefs, controlsRef, onSettled, onReleaseFollow }) {
  const target = useMemo(() => new THREE.Vector3(), [])
  const nextPos = useMemo(() => new THREE.Vector3(), [])
  const parentPos = useMemo(() => new THREE.Vector3(), [])
  const moonOutward = useMemo(() => new THREE.Vector3(), [])
  const moonSide = useMemo(() => new THREE.Vector3(), [])
  const settledRef = useRef(false)
  const releasedRef = useRef(false)

  useEffect(() => {
    settledRef.current = false
    releasedRef.current = false
  }, [mode, selectedTargetKey, followSelected])

  useFrame((state) => {
    const controls = controlsRef.current
    if (!controls) return

    if (!mode) {
      if (!followSelected || !selectedTargetKey) return
      const hit = bodyRefs.current[selectedTargetKey]
      if (!hit) return

      hit.mesh.getWorldPosition(target)
      controls.target.lerp(target, 0.18)
      controls.update()

      const releaseDistance = freezeAllMotion ? Math.max(hit.radius * 60, 120) : Math.max(hit.radius * 68, 320)
      const currentDistance = state.camera.position.distanceTo(target)
      if (!releasedRef.current && currentDistance > releaseDistance) {
        releasedRef.current = true
        onReleaseFollow()
      }
      return
    }

    if (mode === 'home') {
      target.set(0, 0, 0)
      nextPos.set(0, 60, 260)
    } else {
      const hit = selectedTargetKey ? bodyRefs.current[selectedTargetKey] : null
      if (!hit) return

      hit.mesh.getWorldPosition(target)
      const isMoonTarget = Boolean(selectedTargetKey?.includes('/'))

      if (isMoonTarget) {
        const [parentName] = selectedTargetKey.split('/')
        const parentHit = bodyRefs.current[parentName]
        if (parentHit) {
          parentHit.mesh.getWorldPosition(parentPos)
          moonOutward.copy(target).sub(parentPos)
          if (moonOutward.lengthSq() < 1e-6) moonOutward.set(1, 0.2, 1)
          moonOutward.normalize()

          const desiredDistance = freezeAllMotion ? Math.max(hit.radius * 4.2, 1.1) : Math.max(hit.radius * 5.2, 1.4)
          moonSide.crossVectors(moonOutward, new THREE.Vector3(0, 1, 0))
          if (moonSide.lengthSq() < 1e-6) moonSide.set(1, 0, 0)
          moonSide.normalize()
          nextPos.copy(target).addScaledVector(moonOutward, desiredDistance)
          nextPos.addScaledVector(moonSide, desiredDistance * 1.25)
          nextPos.y += desiredDistance * 0.18

          const minParentClearance = parentHit.radius * 1.08
          const currentParentDistance = nextPos.distanceTo(parentPos)
          if (currentParentDistance < minParentClearance) {
            nextPos.copy(parentPos).addScaledVector(moonOutward, minParentClearance)
            nextPos.addScaledVector(moonSide, desiredDistance * 1.25)
          }
        } else {
          const desiredDistance = freezeAllMotion ? Math.max(hit.radius * 4.2, 1.1) : Math.max(hit.radius * 5.2, 1.4)
          nextPos.copy(target).add(new THREE.Vector3(desiredDistance, desiredDistance * 0.3, desiredDistance))
        }
      } else {
        const desiredDistance = freezeAllMotion ? Math.max(hit.radius * 1.6, 0.8) : Math.max(hit.radius * 2.0, 1.5)
        nextPos.copy(target).add(new THREE.Vector3(desiredDistance, desiredDistance * 0.38, desiredDistance))
      }
    }

    const glide = mode === 'focus' ? 0.16 : 0.11
    controls.target.lerp(target, glide)
    state.camera.position.lerp(nextPos, glide)
    controls.update()

    if (settledRef.current) return
    const cameraClose = state.camera.position.distanceTo(nextPos) < 0.8
    const targetClose = controls.target.distanceTo(target) < 0.45

    if (cameraClose && targetClose) {
      settledRef.current = true
      onSettled()
    }
  })

  return null
}

function Sun({ onSelect, registerBodyRef }) {
  const sunGroupRef = useRef()
  const coreRef = useRef()
  const glowNearRef = useRef()
  const glowFarRef = useRef()
  const sunTexture = useTexture(bodies.sun.texture)

  useEffect(() => {
    sunTexture.anisotropy = 8
    sunTexture.wrapS = THREE.RepeatWrapping
    sunTexture.wrapT = THREE.ClampToEdgeWrapping
    sunTexture.minFilter = THREE.LinearMipmapLinearFilter
    sunTexture.magFilter = THREE.LinearFilter
    sunTexture.colorSpace = THREE.SRGBColorSpace
    sunTexture.needsUpdate = true
  }, [sunTexture])

  useFrame((state, delta) => {
    if (coreRef.current) coreRef.current.rotation.y += delta * 0.14
    if (sunGroupRef.current) sunGroupRef.current.rotation.y += delta * 0.05

    const pulse = Math.sin(state.clock.elapsedTime * 1.8) * 0.03 + 1
    if (glowNearRef.current) glowNearRef.current.scale.setScalar(pulse)
    if (glowFarRef.current) glowFarRef.current.scale.setScalar(1 + (pulse - 1) * 1.45)
  })

  return (
    <group ref={sunGroupRef}>
      <pointLight intensity={11.2} distance={26000} color="#ffd68c" decay={0.98} castShadow />
      <mesh
        ref={(ref) => {
          coreRef.current = ref
          registerBodyRef('Sun', ref, bodies.sun.radius)
        }}
        onClick={(e) => {
          e.stopPropagation()
          onSelect('Sun')
        }}
      >
        <sphereGeometry args={[bodies.sun.radius, 64, 64]} />
        <meshStandardMaterial map={sunTexture} emissive={new THREE.Color('#ff6b1f')} emissiveMap={sunTexture} emissiveIntensity={2.9} />
      </mesh>

      <mesh ref={glowNearRef}>
        <sphereGeometry args={[bodies.sun.radius * 1.1, 48, 48]} />
        <meshBasicMaterial color="#ff8c37" transparent opacity={0.25} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      <mesh ref={glowFarRef}>
        <sphereGeometry args={[bodies.sun.radius * 1.28, 48, 48]} />
        <meshBasicMaterial color="#ff4a1b" transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  )
}

function Scene({
  selectedName,
  setSelectedName,
  setSelectedMoonKey,
  speedScale,
  cameraMode,
  selectedTargetKey,
  followSelected,
  freezeSolarOrbits,
  freezeAllMotion,
  onReleaseFollow,
  onSelectMoonTarget,
  setCameraMode,
  showOrbitLines
}) {
  const bodyRefs = useRef({})
  const controlsRef = useRef()
  const asteroidRef = useRef()
  const kuiperRef = useRef()
  const oortRef = useRef()

  const registerBodyRef = (name, mesh, radius) => {
    if (!mesh) return
    bodyRefs.current[name] = { mesh, radius }
  }

  useFrame((_, delta) => {
    if (freezeSolarOrbits) return
    if (asteroidRef.current) asteroidRef.current.rotation.y += delta * 0.012 * speedScale
    if (kuiperRef.current) kuiperRef.current.rotation.y += delta * 0.004 * speedScale
    if (oortRef.current) oortRef.current.rotation.y += delta * 0.0012 * speedScale
  })

  return (
    <>
      <ambientLight intensity={0.5} />
      <hemisphereLight args={['#8fb5ff', '#1b1f2b', 0.22]} />
      <CameraLockedStarShell />
      <DeepSpaceField />
      <Stars radius={28000} depth={16000} count={18000} factor={6.5} saturation={0} fade speed={0.15} />

      <Sun onSelect={setSelectedName} registerBodyRef={registerBodyRef} />

      {bodies.planets.map((planet) => (
        <Planet
          key={planet.name}
          data={planet}
          speedScale={speedScale}
          selectedName={selectedName}
          setSelectedName={setSelectedName}
          setSelectedMoonKey={setSelectedMoonKey}
          registerBodyRef={registerBodyRef}
          showOrbitLines={showOrbitLines}
          freezeSolarOrbits={freezeSolarOrbits}
          freezeAllMotion={freezeAllMotion}
          onSelectMoonTarget={onSelectMoonTarget}
        />
      ))}

      <group ref={asteroidRef} rotation={[0.05, 0, 0]}>
        <Belt
          count={3000}
          innerRadius={orbitalBands.asteroidBelt.inner}
          outerRadius={orbitalBands.asteroidBelt.outer}
          thickness={3.6}
          color="#b1b1b1"
          opacity={0.72}
          size={0.36}
        />
      </group>

      <group ref={kuiperRef} rotation={[0.08, 0.18, 0]}>
        <Belt
          count={4100}
          innerRadius={orbitalBands.kuiperBelt.inner}
          outerRadius={orbitalBands.kuiperBelt.outer}
          thickness={24}
          color="#95afcf"
          opacity={0.34}
          size={0.46}
        />
      </group>

      <group ref={oortRef} rotation={[0.2, 0.4, 0.1]}>
        <OortCloud />
      </group>

      <CameraPilot
        mode={cameraMode}
        selectedTargetKey={selectedTargetKey}
        followSelected={followSelected}
        freezeAllMotion={freezeAllMotion}
        bodyRefs={bodyRefs}
        controlsRef={controlsRef}
        onSettled={() => setCameraMode(null)}
        onReleaseFollow={onReleaseFollow}
      />

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.06}
        minDistance={freezeAllMotion ? 0.25 : 0.7}
        maxDistance={34000}
        rotateSpeed={0.65}
        zoomSpeed={0.92}
        panSpeed={0.6}
      />
    </>
  )
}

export default function App() {
  const [selectedName, setSelectedName] = useState(null)
  const [selectedMoonKey, setSelectedMoonKey] = useState(null)
  const [speedScale, setSpeedScale] = useState(MIN_SPEED)
  const [cameraMode, setCameraMode] = useState('home')
  const [followSelected, setFollowSelected] = useState(false)
  const [panelOpen, setPanelOpen] = useState(true)
  const [showOrbitLines, setShowOrbitLines] = useState(false)

  const selectedTargetKey = selectedMoonKey || selectedName
  const freezeSolarOrbits = followSelected
  const freezeAllMotion = followSelected && Boolean(selectedMoonKey)

  const selected = useMemo(() => {
    if (selectedMoonKey) {
      const [planetName, moonName] = selectedMoonKey.split('/')
      const planet = bodies.planets.find((p) => p.name === planetName)
      const moon = planet?.moons.find((m) => m.name === moonName)
      if (moon) {
        return {
          name: moonName,
          facts: [
            `Moon of ${planetName}.`,
            `Orbital period in this sim follows ${moon.orbitPeriod} Earth years.`,
            'Rendered with currently available texture coverage.'
          ],
          moons: []
        }
      }
    }
    if (selectedName === 'Sun') return bodies.sun
    return bodies.planets.find((planet) => planet.name === selectedName) ?? null
  }, [selectedMoonKey, selectedName])

  const jumpTo = (name) => {
    setSelectedMoonKey(null)
    setSelectedName(name)
    setCameraMode('focus')
    setFollowSelected(true)
  }

  const jumpToMoon = (moonKey) => {
    const [planetName] = moonKey.split('/')
    setSelectedName(planetName)
    setSelectedMoonKey(moonKey)
    setCameraMode('focus')
    setFollowSelected(true)
  }

  const goHome = () => {
    setSelectedMoonKey(null)
    setSelectedName(null)
    setCameraMode('home')
    setFollowSelected(false)
  }

  return (
    <div className="app-shell">
      <Canvas
        camera={{ position: [0, 60, 260], fov: 52, near: 0.1, far: 70000 }}
        shadows
        onPointerMissed={() => {
          if (cameraMode === null) {
            setSelectedMoonKey(null)
            setSelectedName(null)
            setFollowSelected(false)
          }
        }}
      >
        <color attach="background" args={['#02040a']} />
        <Scene
          selectedName={selectedName}
          setSelectedName={jumpTo}
          setSelectedMoonKey={setSelectedMoonKey}
          speedScale={speedScale}
          cameraMode={cameraMode}
          selectedTargetKey={selectedTargetKey}
          followSelected={followSelected}
          freezeSolarOrbits={freezeSolarOrbits}
          freezeAllMotion={freezeAllMotion}
          onReleaseFollow={() => setFollowSelected(false)}
          onSelectMoonTarget={(planetName, moonName) => jumpToMoon(`${planetName}/${moonName}`)}
          setCameraMode={setCameraMode}
          showOrbitLines={showOrbitLines}
        />
      </Canvas>

      <button
        type="button"
        className="hamburger-btn"
        onClick={() => setPanelOpen((prev) => !prev)}
        aria-expanded={panelOpen}
        aria-label="Toggle panel"
      >
        <span />
        <span />
        <span />
      </button>

      <aside className={`side-drawer ${panelOpen ? 'open' : ''}`}>
        <div className="hud">
              <h1>Solar System Explorer</h1>
              <p>Click planets to focus. Drag to orbit camera, scroll to zoom from close-up views all the way past the Oort Cloud.</p>

              <label htmlFor="speed">Simulation Speed: {speedScale.toFixed(1)}x</label>
              <input
                id="speed"
                type="range"
                min={MIN_SPEED}
                max="4"
                step="0.1"
                value={speedScale}
                onChange={(e) => setSpeedScale(Number(e.target.value))}
              />

              <label htmlFor="bodySelect">Focus Body</label>
              <select
                id="bodySelect"
                className="selector-input"
                value={selectedName ?? ''}
                onChange={(e) => {
                  const value = e.target.value
                  if (!value) {
                    goHome()
                    return
                  }
                  jumpTo(value)
                }}
              >
                <option value="">None (Free View)</option>
                <option value="Sun">Sun</option>
                {bodies.planets.map((planet) => (
                  <option key={planet.name} value={planet.name}>
                    {planet.name}
                  </option>
                ))}
              </select>

              {selectedName && selectedName !== 'Sun' ? (
                <>
                  <label htmlFor="moonSelect">Moon Focus</label>
                  <select
                    id="moonSelect"
                    className="selector-input"
                    value={selectedMoonKey ?? ''}
                    onChange={(e) => {
                      const value = e.target.value
                      if (!value) {
                        setSelectedMoonKey(null)
                        jumpTo(selectedName)
                        return
                      }
                      jumpToMoon(value)
                    }}
                  >
                    <option value="">Planet Center</option>
                    {bodies.planets
                      .find((planet) => planet.name === selectedName)
                      ?.moons.map((moon) => {
                        const moonKey = `${selectedName}/${moon.name}`
                        return (
                          <option key={moonKey} value={moonKey}>
                            {moon.name}
                          </option>
                        )
                      })}
                  </select>
                </>
              ) : null}

          <div className="hud-buttons">
            <button type="button" onClick={goHome}>
              Full System View
            </button>
            <button type="button" onClick={() => jumpTo('Earth')}>
              Jump to Earth
            </button>
            <button type="button" onClick={() => setShowOrbitLines((prev) => !prev)}>
              {showOrbitLines ? 'Hide Orbital Lines' : 'Show Orbital Lines'}
            </button>
          </div>
        </div>

        {selected ? (
          <div className="fact-panel">
            <h2>{selected.name}</h2>
            <ul>
              {selected.facts?.map((fact) => (
                <li key={fact}>{fact}</li>
              ))}
            </ul>
            {selected.moons?.length ? <p>Major moons shown: {selected.moons.map((moon) => moon.name).join(', ')}</p> : null}
          </div>
        ) : null}
      </aside>
    </div>
  )
}
