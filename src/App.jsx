import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { AstroTime, Body, GeoMoon, HelioVector, JupiterMoons } from 'astronomy-engine'
import { bodies, orbitalBands, scientificBodies, scientificOrbitalBands } from './data'

const ORBIT_SPEED = 0.2
const SPIN_SPEED = 1.2
const MIN_SPEED = 0.2
const MOON_ORBIT_BASE = 0.012
const MAP_ENTER_SURFACE_BUFFER = 0.22
const MAP_ENTER_RELEASE_SURFACE_BUFFER = 0.9
const MAP_DEFAULT_RANGE = 7_200_000
const MAP_EXIT_MIN_RANGE = 35_000_000
const MAP_EXIT_COOLDOWN_MS = 750
const MAP_EXIT_ARM_DELAY_MS = 1200
const MAP_EXIT_WHEEL_RECENCY_MS = 450
const FOLLOW_RELEASE_DISTANCE_MULTIPLIER = 10
const FOLLOW_RELEASE_MIN_DISTANCE = 18
const EARTH_FALLBACK_DISTANCE = 50
const EARTH_FALLBACK_RADIUS = 1
const FUN_SCENE_CONFIG = {
  backgroundColor: '#030617',
  homeCamera: [0, 60, 260],
  canvasFar: 70_000,
  controlsMaxDistance: 34_000,
  starsRadius: 28_000,
  starsDepth: 16_000,
  starsCount: 15_500,
  starsFactor: 6.2,
  starsSpeed: 0.18,
  starShellRadius: 42_000,
  starShellCount: 18_000,
  starShellColor: '#d9e8ff',
  starShellOpacity: 0.28,
  starShellSize: 1.95,
  deepSpaceRadius: 12_000,
  deepSpaceSpread: 4_200,
  deepSpaceCount: 12_500,
  deepSpaceColor: '#ecf6ff',
  deepSpaceOpacity: 0.44,
  deepSpaceSize: 2.0,
  galacticBandColor: '#8fb4ff',
  galacticBandOpacity: 0.15,
  galacticBandThickness: 780,
  nebulaOpacity: 0.16,
  asteroidCount: 5_800,
  asteroidThickness: 3.6,
  asteroidSize: 0.36,
  kuiperCount: 8_000,
  kuiperThickness: 24,
  kuiperSize: 0.46,
  oortRadius: 3_400,
  oortSpread: 500,
  oortCount: 10_000
}
const SCIENTIFIC_SCENE_CONFIG = {
  backgroundColor: '#02040a',
  homeCamera: [0, 600, 2_600],
  canvasFar: 12_000_000,
  controlsMaxDistancePlanet: 300_000,
  controlsMaxDistanceSun: 9_000_000,
  starsRadius: 2_200_000,
  starsDepth: 1_100_000,
  starsCount: 22_000,
  starsFactor: 6.1,
  starsSpeed: 0.05,
  starShellRadius: 4_000_000,
  starShellCount: 22_000,
  starShellColor: '#edf3ff',
  starShellOpacity: 0.32,
  starShellSize: 1.9,
  deepSpaceRadius: 1_000_000,
  deepSpaceSpread: 500_000,
  deepSpaceCount: 20_000,
  deepSpaceColor: '#f4f8ff',
  deepSpaceOpacity: 0.38,
  deepSpaceSize: 1.85,
  galacticBandColor: '#c3d7f8',
  galacticBandOpacity: 0.18,
  galacticBandThickness: 200_000,
  nebulaOpacity: 0,
  asteroidCount: 45_000,
  asteroidThickness: 36,
  asteroidSize: 0.4,
  kuiperCount: 65_000,
  kuiperThickness: 240,
  kuiperSize: 0.52,
  oortRadius: 3_500_000,
  oortSpread: 550_000,
  oortCount: 70_000
}
const PLANET_TO_BODY = {
  Mercury: Body.Mercury,
  Venus: Body.Venus,
  Earth: Body.Earth,
  Mars: Body.Mars,
  Jupiter: Body.Jupiter,
  Saturn: Body.Saturn,
  Uranus: Body.Uranus,
  Neptune: Body.Neptune,
  Pluto: Body.Pluto
}
const SCI_KM_PER_UNIT = 1_000
const AU_KM = 149_597_870.7
const AU_UNITS = AU_KM / SCI_KM_PER_UNIT
const HORIZONS_SCIENTIFIC_ORBITAL_BANDS = {
  asteroidBelt: {
    inner: AU_UNITS * 2.2,
    outer: AU_UNITS * 3.2
  },
  kuiperBelt: {
    inner: AU_UNITS * 30,
    outer: AU_UNITS * 50
  }
}

const SCIENTIFIC_RADIUS_KM_FALLBACK = {
  Sun: 695700,
  Mercury: 2439.7,
  Venus: 6051.8,
  Earth: 6371.0,
  Mars: 3389.5,
  Jupiter: 69911,
  Saturn: 58232,
  Uranus: 25362,
  Neptune: 24622,
  Pluto: 1188.3,
  Moon: 1737.4,
  Phobos: 11.267,
  Deimos: 6.2,
  Io: 1821.6,
  Europa: 1560.8,
  Ganymede: 2634.1,
  Callisto: 2410.3,
  Titan: 2574.7,
  Enceladus: 252.1,
  Rhea: 763.8,
  Iapetus: 734.5,
  Titania: 788.9,
  Oberon: 761.4,
  Umbriel: 584.7,
  Ariel: 578.9,
  Miranda: 235.8,
  Triton: 1353.4,
  Nereid: 170,
  Proteus: 210,
  Larissa: 97,
  Charon: 606
}

function vectorMagnitude(vector) {
  if (!vector) return null
  return Math.sqrt((vector.x * vector.x) + (vector.y * vector.y) + (vector.z * vector.z))
}

function configureTexture(texture) {
  if (!texture) return
  texture.anisotropy = 8
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.ClampToEdgeWrapping
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
}

function buildScientificBodiesFromSnapshot(baseBodies, snapshot) {
  if (!snapshot?.bodies) return baseBodies

  const sunSnapshot = snapshot.bodies.Sun
  const nextSunRadiusKm = sunSnapshot?.radiusKm ?? SCIENTIFIC_RADIUS_KM_FALLBACK.Sun

  return {
    ...baseBodies,
    sun: {
      ...baseBodies.sun,
      radius: nextSunRadiusKm / SCI_KM_PER_UNIT
    },
    planets: baseBodies.planets.map((planet) => {
      const planetSnapshot = snapshot.bodies[planet.name]
      const planetRadiusKm = planetSnapshot?.radiusKm ?? SCIENTIFIC_RADIUS_KM_FALLBACK[planet.name] ?? (planet.radius * SCI_KM_PER_UNIT)
      const planetDistanceKm = vectorMagnitude(planetSnapshot?.vector)

      return {
        ...planet,
        radius: planetRadiusKm / SCI_KM_PER_UNIT,
        distance: Number.isFinite(planetDistanceKm) ? planetDistanceKm / SCI_KM_PER_UNIT : planet.distance,
        moons: planet.moons.map((moon) => {
          const moonSnapshot = snapshot.bodies[moon.name]
          const moonRadiusKm = moonSnapshot?.radiusKm ?? SCIENTIFIC_RADIUS_KM_FALLBACK[moon.name] ?? (moon.radius * SCI_KM_PER_UNIT)
          const moonDistanceKm = vectorMagnitude(moonSnapshot?.vector)
          return {
            ...moon,
            radius: moonRadiusKm / SCI_KM_PER_UNIT,
            distance: Number.isFinite(moonDistanceKm) ? moonDistanceKm / SCI_KM_PER_UNIT : moon.distance
          }
        })
      }
    })
  }
}

function getStartupMoonOrbitAngles(planets) {
  const days = Date.now() / 86_400_000
  const state = {}

  planets.forEach((planet) => {
    planet.moons.forEach((moon) => {
      const key = `${planet.name}/${moon.name}`
      const orbitDays = Math.max(Math.abs(moon.orbitPeriod), 0.001) * 365.25
      const phase = ((days / orbitDays) + hashPhase(`${key}:phase`)) % 1
      state[key] = {
        angle: phase * Math.PI * 2,
        inclinationRad: THREE.MathUtils.degToRad(moon.orbitalInclinationDeg ?? 0),
        ascendingNodeRad: THREE.MathUtils.degToRad(moon.ascendingNodeDeg ?? hashPhase(`${key}:node`) * 360)
      }
    })
  })

  return state
}

function hashPhase(seed) {
  let hash = 2166136261
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return ((hash >>> 0) % 360) / 360
}

function getScientificMoonOrbitState(planets, horizonsSnapshot = null) {
  const time = new AstroTime(new Date())
  const days = Date.now() / 86_400_000
  const state = {}
  const horizonBodies = horizonsSnapshot?.bodies ?? null
  const hasHorizonsData = Boolean(horizonBodies && Object.keys(horizonBodies).length > 0)

  const setFallback = (planetName, moon) => {
    const key = `${planetName}/${moon.name}`
    const orbitDays = Math.max(Math.abs(moon.orbitPeriod), 0.001) * 365.25
    const phaseOffset = hashPhase(key)
    const phase = ((days / orbitDays) + phaseOffset) % 1
    const isEarthMoon = key === 'Earth/Moon'
    state[key] = {
      angle: phase * Math.PI * 2,
      inclinationRad: isEarthMoon ? 0 : THREE.MathUtils.degToRad(moon.orbitalInclinationDeg ?? 0),
      ascendingNodeRad: isEarthMoon ? 0 : THREE.MathUtils.degToRad(moon.ascendingNodeDeg ?? hashPhase(`${key}:node`) * 360)
    }
  }

  planets.forEach((planet) => {
    planet.moons.forEach((moon) => setFallback(planet.name, moon))
  })

  planets.forEach((planet) => {
    planet.moons.forEach((moon) => {
      const vector = horizonBodies?.[moon.name]?.vector
      if (!vector) return
      const key = `${planet.name}/${moon.name}`
      const isEarthMoon = key === 'Earth/Moon'
      // Use Horizons vector for phase angle only. Plane orientation comes from moon orbital elements.
      state[key] = {
        angle: Math.atan2(vector.z, vector.x),
        inclinationRad: isEarthMoon ? 0 : THREE.MathUtils.degToRad(moon.orbitalInclinationDeg ?? 0),
        ascendingNodeRad: isEarthMoon ? 0 : THREE.MathUtils.degToRad(moon.ascendingNodeDeg ?? hashPhase(`${key}:node`) * 360)
      }
    })
  })

  // Keep astronomy-engine only as a local fallback when Horizons data is unavailable.
  if (!hasHorizonsData) {
    const earthMoonVec = GeoMoon(time)
    if (earthMoonVec) {
      const key = 'Earth/Moon'
      if (state[key]) {
        state[key] = {
          ...state[key],
          angle: Math.atan2(earthMoonVec.z, earthMoonVec.x)
        }
      }
    }

    const jupiter = JupiterMoons(time)
    const jupiterMoonMap = {
      Io: jupiter?.io,
      Europa: jupiter?.europa,
      Ganymede: jupiter?.ganymede,
      Callisto: jupiter?.callisto
    }
    Object.entries(jupiterMoonMap).forEach(([moonName, vec]) => {
      if (!vec) return
      const key = `Jupiter/${moonName}`
      if (state[key]) {
        state[key] = {
          ...state[key],
          angle: Math.atan2(vec.z, vec.x)
        }
      }
    })
  }

  return state
}

function getStartupSpinAngles(planets) {
  const days = Date.now() / 86_400_000
  const angles = {}

  planets.forEach((planet) => {
    const period = Number(planet.rotationPeriod)
    if (!Number.isFinite(period) || period === 0) {
      angles[planet.name] = 0
      return
    }
    const phase = (days / Math.abs(period)) % 1
    angles[planet.name] = phase * Math.PI * 2
  })

  return angles
}

function getStartupOrbitAngles(planets, horizonsSnapshot = null) {
  try {
    const nextAngles = {}
    const horizonBodies = horizonsSnapshot?.bodies ?? null

    planets.forEach((planet) => {
      const vector = horizonBodies?.[planet.name]?.vector
      if (!vector) return
      nextAngles[planet.name] = Math.atan2(vector.z, vector.x)
    })

    const time = new AstroTime(new Date())

    planets.forEach((planet) => {
      if (nextAngles[planet.name] !== undefined) return
      const astroBody = PLANET_TO_BODY[planet.name]
      if (!astroBody) {
        nextAngles[planet.name] = Math.random() * Math.PI * 2
        return
      }
      const helio = HelioVector(astroBody, time)
      if (!Number.isFinite(helio.x) || !Number.isFinite(helio.y)) {
        nextAngles[planet.name] = Math.random() * Math.PI * 2
        return
      }
      nextAngles[planet.name] = Math.atan2(helio.y, helio.x)
    })

    return nextAngles
  } catch {
    const fallbackAngles = {}
    planets.forEach((planet) => {
      fallbackAngles[planet.name] = Math.random() * Math.PI * 2
    })
    return fallbackAngles
  }
}

let googleMapsScriptPromise = null

function loadGoogleMapsScript(apiKey) {
  if (typeof window === 'undefined') return Promise.reject(new Error('Google Maps requires a browser environment.'))
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google.maps)
  if (!apiKey) return Promise.reject(new Error('Missing Google Maps API key. Set VITE_GOOGLE_MAPS_API_KEY.'))

  if (!googleMapsScriptPromise) {
    googleMapsScriptPromise = new Promise((resolve, reject) => {
      const callbackName = `__initGoogleMaps${Date.now()}`
      const timeoutId = window.setTimeout(() => {
        reject(new Error('Google Maps timed out while loading.'))
      }, 15000)

      const cleanup = () => {
        window.clearTimeout(timeoutId)
        if (window.gm_authFailure === authFailureHandler) {
          if (typeof priorAuthFailure === 'function') {
            window.gm_authFailure = priorAuthFailure
          } else {
            window.gm_authFailure = undefined
          }
        }
        try {
          delete window[callbackName]
        } catch {
          window[callbackName] = undefined
        }
      }

      window[callbackName] = () => {
        cleanup()
        if (window.google?.maps?.importLibrary) {
          resolve(window.google.maps)
          return
        }
        reject(new Error('Google Maps loaded but importLibrary is unavailable.'))
      }

      const priorAuthFailure = window.gm_authFailure
      const authFailureHandler = () => {
        if (typeof priorAuthFailure === 'function') priorAuthFailure()
        cleanup()
        reject(new Error('Google Maps authentication failed. Check key restrictions and enabled APIs.'))
      }
      window.gm_authFailure = authFailureHandler

      const script = document.createElement('script')
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=beta&loading=async&libraries=maps3d&callback=${callbackName}`
      script.async = true
      script.defer = true
      script.onerror = () => {
        cleanup()
        reject(new Error('Failed to load Google Maps script.'))
      }
      document.head.appendChild(script)
    }).catch((error) => {
      googleMapsScriptPromise = null
      throw error
    })
  }

  return googleMapsScriptPromise
}

function worldDirectionToLatLng(direction) {
  const dir = direction.clone().normalize()
  const lat = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1)))
  const lng = THREE.MathUtils.radToDeg(Math.atan2(dir.z, dir.x))
  return { lat, lng }
}

function GoogleMapsPanel({ center, range, onRangeChange, onBackToSpace }) {
  const map3dRef = useRef(null)
  const mapNodeRef = useRef(null)
  const rangeHandlerRef = useRef(null)
  const fallbackRangeRef = useRef(null)
  const [status, setStatus] = useState('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

  useEffect(() => {
    let cancelled = false

    loadGoogleMapsScript(apiKey)
      .then(async () => {
        if (cancelled || !mapNodeRef.current || map3dRef.current) return
        const { Map3DElement } = await window.google.maps.importLibrary('maps3d')
        if (cancelled || !mapNodeRef.current || map3dRef.current) return

        map3dRef.current = new Map3DElement({
          center,
          range,
          tilt: 0,
          heading: 0,
          mode: 'HYBRID'
        })

        rangeHandlerRef.current = () => {
          const currentRange = map3dRef.current?.range
          if (typeof currentRange === 'number') {
            onRangeChange(currentRange)
          }
        }

        mapNodeRef.current.innerHTML = ''
        mapNodeRef.current.appendChild(map3dRef.current)
        map3dRef.current.addEventListener('gmp-rangechange', rangeHandlerRef.current)
        setStatus('ready')
        setErrorMessage('')
      })
      .catch((error) => {
        if (cancelled) return
        setStatus(apiKey ? 'error' : 'missing-key')
        setErrorMessage(error instanceof Error ? error.message : 'Unknown error loading Google Maps.')
      })

    return () => {
      cancelled = true
      if (map3dRef.current && rangeHandlerRef.current) {
        map3dRef.current.removeEventListener('gmp-rangechange', rangeHandlerRef.current)
      }
    }
  }, [apiKey, onRangeChange])

  useEffect(() => {
    if (!map3dRef.current) return
    map3dRef.current.center = { lat: center.lat, lng: center.lng, altitude: 0 }
  }, [center])

  useEffect(() => {
    if (!map3dRef.current || typeof range !== 'number') return
    map3dRef.current.range = range
  }, [range])

  useEffect(() => {
    if (status !== 'ready' || !map3dRef.current) return undefined
    const map3d = map3dRef.current

    fallbackRangeRef.current = Number(map3d.range ?? fallbackRangeRef.current ?? range ?? 0)

    // Fallback path for sessions where gmp-rangechange is intermittent.
    const intervalId = window.setInterval(() => {
      const nextRange = Number(map3d.range ?? 0)
      const prevRange = Number(fallbackRangeRef.current ?? nextRange)
      fallbackRangeRef.current = nextRange
      if (Math.abs(nextRange - prevRange) > 500 && Number.isFinite(nextRange) && nextRange > 1000) {
        onRangeChange(nextRange)
      }
    }, 350)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [onRangeChange, range, status])

  return (
    <div className="map-overlay">
      <div className="map-toolbar">
        <button type="button" onClick={() => onBackToSpace('button')}>
          Return to Solar System
        </button>
        <p>Zoom far out in globe mode to jump back to space view.</p>
      </div>
      <div ref={mapNodeRef} className="map-canvas" />
      {status !== 'ready' ? (
        <div className="map-status">
          {status === 'missing-key' ? (
            <p>Google Maps key missing. Add <code>VITE_GOOGLE_MAPS_API_KEY</code> to your environment.</p>
          ) : (
            <p>Unable to load Google Maps: {errorMessage || 'Unknown error'}.</p>
          )}
        </div>
      ) : null}
    </div>
  )
}

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

function DeepSpaceField({ radius = 12000, spread = 4200, count = 15000, color = '#f4fbff', opacity = 0.58, size = 2.2 }) {
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
      <pointsMaterial color={color} size={size} sizeAttenuation transparent opacity={opacity} />
    </points>
  )
}

function CameraLockedStarShell({ radius = 42000, count = 18000, color = '#e7f1ff', opacity = 0.34, size = 2.1 }) {
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
      <pointsMaterial color={color} size={size} sizeAttenuation={false} transparent opacity={opacity} />
    </points>
  )
}

function CameraLockedGalacticBand({ radius = 42000, count = 18000, thickness = 900, color = '#9db8e8', opacity = 0.2 }) {
  const { camera } = useThree()
  const bandRef = useRef()

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      const theta = Math.random() * Math.PI * 2
      const bandR = radius * (0.72 + Math.random() * 0.24)
      const y = (Math.random() - 0.5) * thickness
      arr[i * 3] = Math.cos(theta) * bandR
      arr[i * 3 + 1] = y
      arr[i * 3 + 2] = Math.sin(theta) * bandR
    }
    return arr
  }, [count, radius, thickness])

  useFrame(() => {
    if (!bandRef.current) return
    bandRef.current.position.copy(camera.position)
  })

  return (
    <points ref={bandRef} rotation={[0.42, 0.76, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color={color} size={1.7} sizeAttenuation={false} transparent opacity={opacity} />
    </points>
  )
}

function CameraLockedNebula({ radius = 42000, count = 12000, opacity = 0.3 }) {
  const { camera } = useThree()
  const nebulaRef = useRef()

  const { positions, colors } = useMemo(() => {
    const p = new Float32Array(count * 3)
    const c = new Float32Array(count * 3)
    const cloudCenters = [
      new THREE.Vector3(0.88, 0.18, 0.22),
      new THREE.Vector3(-0.54, 0.22, 0.8),
      new THREE.Vector3(-0.22, -0.35, -0.91)
    ]
    const cloudColors = [
      new THREE.Color('#6ecbff'),
      new THREE.Color('#76a6ff'),
      new THREE.Color('#f49bd7')
    ]

    for (let i = 0; i < count; i += 1) {
      const cluster = i % cloudCenters.length
      const center = cloudCenters[cluster]
      const jitter = new THREE.Vector3((Math.random() - 0.5) * 0.85, (Math.random() - 0.5) * 0.65, (Math.random() - 0.5) * 0.85)
      const dir = center.clone().add(jitter).normalize()
      const r = radius * (0.78 + Math.random() * 0.17)
      p[i * 3] = dir.x * r
      p[i * 3 + 1] = dir.y * r
      p[i * 3 + 2] = dir.z * r

      const color = cloudColors[cluster].clone().lerp(new THREE.Color('#ffffff'), Math.random() * 0.28)
      c[i * 3] = color.r
      c[i * 3 + 1] = color.g
      c[i * 3 + 2] = color.b
    }

    return { positions: p, colors: c }
  }, [count, radius])

  useFrame(() => {
    if (!nebulaRef.current) return
    nebulaRef.current.position.copy(camera.position)
  })

  return (
    <points ref={nebulaRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        size={3.2}
        sizeAttenuation={false}
        transparent
        opacity={opacity}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

function Moon({
  moon,
  parentName,
  speedScale,
  registerBodyRef,
  onSelectTarget,
  freezeAllMotion,
  initialOrbitAngle,
  orbitInclinationRad = 0,
  orbitAscendingNodeRad = 0
}) {
  const pivot = useRef()
  const meshRef = useRef()
  const moonTexture = useTexture(moon.texture)

  useEffect(() => {
    configureTexture(moonTexture)
  }, [moonTexture])

  useEffect(() => {
    if (!pivot.current || !Number.isFinite(initialOrbitAngle)) return
    pivot.current.rotation.y = initialOrbitAngle
  }, [initialOrbitAngle])

  useFrame((_, delta) => {
    if (!pivot.current || !meshRef.current) return
    const orbit = freezeAllMotion ? 0 : (1 / Math.max(Math.abs(moon.orbitPeriod), 0.02)) * MOON_ORBIT_BASE * speedScale
    const direction = moon.orbitPeriod < 0 ? -1 : 1
    pivot.current.rotation.y += delta * orbit * direction
    // Most major moons are tidally locked, which reads more naturally here.
    const moonSpin = moon.tidallyLocked === false ? SPIN_SPEED * speedScale : 0
    meshRef.current.rotation.y += delta * moonSpin
  })

  return (
    <group ref={pivot} rotation={[0, orbitAscendingNodeRad, 0]}>
      <group rotation={[0, 0, orbitInclinationRad]}>
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
  initialOrbitAngle,
  initialSpinAngle,
  selectedName,
  setSelectedName,
  setSelectedMoonKey,
  registerBodyRef,
  showOrbitLines,
  freezeSolarOrbits,
  freezeAllMotion,
  onSelectMoonTarget,
  moonStartupAngles
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

  useEffect(() => {
    textures.forEach((texture) => configureTexture(texture))
  }, [textures])

  useEffect(() => {
    if (!orbitRef.current || !Number.isFinite(initialOrbitAngle)) return
    orbitRef.current.rotation.y = initialOrbitAngle
  }, [initialOrbitAngle])

  useEffect(() => {
    if (!planetRef.current || !Number.isFinite(initialSpinAngle)) return
    planetRef.current.rotation.y = initialSpinAngle
  }, [initialSpinAngle])

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

        {data.moons.map((moon) => (
          <Moon
            key={`${data.name}-${moon.name}`}
            moon={moon}
            parentName={data.name}
            speedScale={speedScale}
            registerBodyRef={registerBodyRef}
            onSelectTarget={onSelectMoonTarget}
            freezeAllMotion={freezeAllMotion}
            initialOrbitAngle={moonStartupAngles?.[`${data.name}/${moon.name}`]?.angle ?? moonStartupAngles?.[`${data.name}/${moon.name}`]}
            orbitInclinationRad={moonStartupAngles?.[`${data.name}/${moon.name}`]?.inclinationRad ?? 0}
            orbitAscendingNodeRad={moonStartupAngles?.[`${data.name}/${moon.name}`]?.ascendingNodeRad ?? 0}
          />
        ))}
      </group>

      {showOrbitLines ? <OrbitRing radius={data.distance} color={selectedName === data.name ? '#7babff' : '#2e4e7a'} /> : null}
    </group>
  )
}

function CameraPilot({ mode, selectedTargetKey, followSelected, freezeAllMotion, bodyRefs, controlsRef, onSettled, onReleaseFollow, homeCamera, lockPlanetFocus }) {
  const target = useMemo(() => new THREE.Vector3(), [])
  const nextPos = useMemo(() => new THREE.Vector3(), [])
  const parentPos = useMemo(() => new THREE.Vector3(), [])
  const moonOutward = useMemo(() => new THREE.Vector3(), [])
  const moonSide = useMemo(() => new THREE.Vector3(), [])
  const worldUp = useMemo(() => new THREE.Vector3(0, 1, 0), [])
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

      const releaseDistance = Math.max(hit.radius * FOLLOW_RELEASE_DISTANCE_MULTIPLIER, FOLLOW_RELEASE_MIN_DISTANCE)
      const currentDistance = state.camera.position.distanceTo(target)
      const isMoonTarget = Boolean(selectedTargetKey?.includes('/'))
      const shouldLockCurrentPlanet = lockPlanetFocus && !isMoonTarget && selectedTargetKey !== 'Sun'
      if (shouldLockCurrentPlanet) return
      if (!releasedRef.current && currentDistance > releaseDistance) {
        releasedRef.current = true
        onReleaseFollow()
      }
      return
    }

    if (mode === 'home') {
      target.set(0, 0, 0)
      nextPos.set(homeCamera[0], homeCamera[1], homeCamera[2])
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
          moonSide.crossVectors(moonOutward, worldUp)
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

function Sun({ sunData, onSelect, registerBodyRef }) {
  const sunGroupRef = useRef()
  const coreRef = useRef()
  const glowNearRef = useRef()
  const glowFarRef = useRef()
  const sunTexture = useTexture(sunData.texture)

  useEffect(() => {
    configureTexture(sunTexture)
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
          registerBodyRef('Sun', ref, sunData.radius)
        }}
        onClick={(e) => {
          e.stopPropagation()
          onSelect('Sun')
        }}
      >
        <sphereGeometry args={[sunData.radius, 64, 64]} />
        <meshStandardMaterial map={sunTexture} emissive={new THREE.Color('#ff6b1f')} emissiveMap={sunTexture} emissiveIntensity={2.9} />
      </mesh>

      <mesh ref={glowNearRef}>
        <sphereGeometry args={[sunData.radius * 1.1, 48, 48]} />
        <meshBasicMaterial color="#ff8c37" transparent opacity={0.25} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>

      <mesh ref={glowFarRef}>
        <sphereGeometry args={[sunData.radius * 1.28, 48, 48]} />
        <meshBasicMaterial color="#ff4a1b" transparent opacity={0.15} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  )
}

function Scene({
  systemBodies,
  systemOrbitalBands,
  sceneConfig,
  startupOrbitAngles,
  startupSpinAngles,
  moonStartupAngles,
  scientificMode,
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
  showOrbitLines,
  onEarthTelemetry,
  lockPlanetFocus
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

  const earthPos = useMemo(() => new THREE.Vector3(), [])
  const controlsMaxDistance = scientificMode
    ? (selectedTargetKey === 'Sun' ? sceneConfig.controlsMaxDistanceSun : sceneConfig.controlsMaxDistancePlanet)
    : sceneConfig.controlsMaxDistance

  useFrame((state, delta) => {
    const earth = bodyRefs.current.Earth
    if (earth && onEarthTelemetry) {
      earth.mesh.getWorldPosition(earthPos)
      onEarthTelemetry({
        distance: state.camera.position.distanceTo(earthPos),
        earthRadius: earth.radius,
        earthPosition: { x: earthPos.x, y: earthPos.y, z: earthPos.z },
        cameraPosition: { x: state.camera.position.x, y: state.camera.position.y, z: state.camera.position.z }
      })
    }

    if (freezeSolarOrbits) return
    if (asteroidRef.current) asteroidRef.current.rotation.y += delta * 0.012 * speedScale
    if (kuiperRef.current) kuiperRef.current.rotation.y += delta * 0.004 * speedScale
    if (oortRef.current) oortRef.current.rotation.y += delta * 0.0012 * speedScale
  })

  return (
    <>
      <ambientLight intensity={0.5} />
      <hemisphereLight args={['#8fb5ff', '#1b1f2b', 0.22]} />
      <CameraLockedStarShell
        radius={sceneConfig.starShellRadius}
        count={sceneConfig.starShellCount}
        color={sceneConfig.starShellColor}
        opacity={sceneConfig.starShellOpacity}
        size={sceneConfig.starShellSize}
      />
      <CameraLockedGalacticBand
        radius={sceneConfig.starShellRadius}
        count={Math.floor(sceneConfig.starShellCount * 0.75)}
        thickness={sceneConfig.galacticBandThickness}
        color={sceneConfig.galacticBandColor}
        opacity={sceneConfig.galacticBandOpacity}
      />
      {sceneConfig.nebulaOpacity > 0 ? (
        <CameraLockedNebula
          radius={sceneConfig.starShellRadius}
          count={Math.floor(sceneConfig.starShellCount * 0.7)}
          opacity={sceneConfig.nebulaOpacity}
        />
      ) : null}
      <DeepSpaceField
        radius={sceneConfig.deepSpaceRadius}
        spread={sceneConfig.deepSpaceSpread}
        count={sceneConfig.deepSpaceCount}
        color={sceneConfig.deepSpaceColor}
        opacity={sceneConfig.deepSpaceOpacity}
        size={sceneConfig.deepSpaceSize}
      />
      <Stars
        radius={sceneConfig.starsRadius}
        depth={sceneConfig.starsDepth}
        count={sceneConfig.starsCount}
        factor={sceneConfig.starsFactor}
        saturation={0}
        fade
        speed={sceneConfig.starsSpeed}
      />

      <Sun sunData={systemBodies.sun} onSelect={setSelectedName} registerBodyRef={registerBodyRef} />

      {systemBodies.planets.map((planet) => (
        <Planet
          key={planet.name}
          data={planet}
          speedScale={speedScale}
          initialOrbitAngle={startupOrbitAngles?.[planet.name]}
          initialSpinAngle={startupSpinAngles?.[planet.name]}
          selectedName={selectedName}
          setSelectedName={setSelectedName}
          setSelectedMoonKey={setSelectedMoonKey}
          registerBodyRef={registerBodyRef}
          showOrbitLines={showOrbitLines}
          freezeSolarOrbits={freezeSolarOrbits}
          freezeAllMotion={freezeAllMotion}
          onSelectMoonTarget={onSelectMoonTarget}
          moonStartupAngles={moonStartupAngles}
        />
      ))}

      <group ref={asteroidRef} rotation={[0.05, 0, 0]}>
        <Belt
          count={sceneConfig.asteroidCount}
          innerRadius={systemOrbitalBands.asteroidBelt.inner}
          outerRadius={systemOrbitalBands.asteroidBelt.outer}
          thickness={sceneConfig.asteroidThickness}
          color="#b1b1b1"
          opacity={0.72}
          size={sceneConfig.asteroidSize}
        />
      </group>

      <group ref={kuiperRef} rotation={[0.08, 0.18, 0]}>
        <Belt
          count={sceneConfig.kuiperCount}
          innerRadius={systemOrbitalBands.kuiperBelt.inner}
          outerRadius={systemOrbitalBands.kuiperBelt.outer}
          thickness={sceneConfig.kuiperThickness}
          color="#95afcf"
          opacity={0.34}
          size={sceneConfig.kuiperSize}
        />
      </group>

      <group ref={oortRef} rotation={[0.2, 0.4, 0.1]}>
        <OortCloud radius={sceneConfig.oortRadius} spread={sceneConfig.oortSpread} count={sceneConfig.oortCount} />
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
        homeCamera={sceneConfig.homeCamera}
        lockPlanetFocus={lockPlanetFocus}
      />

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.06}
        minDistance={freezeAllMotion ? 0.25 : 0.7}
        maxDistance={controlsMaxDistance}
        rotateSpeed={0.65}
        zoomSpeed={0.92}
        panSpeed={0.6}
      />
    </>
  )
}

export default function App() {
  const [experienceMode, setExperienceMode] = useState('fun')
  const scientificMode = experienceMode === 'scientific'
  const [scientificSnapshot, setScientificSnapshot] = useState(null)
  const activeBaseBodies = scientificMode ? scientificBodies : bodies
  const activeOrbitalBands = scientificMode
    ? (scientificSnapshot ? HORIZONS_SCIENTIFIC_ORBITAL_BANDS : scientificOrbitalBands)
    : orbitalBands
  const activeSceneConfig = scientificMode ? SCIENTIFIC_SCENE_CONFIG : FUN_SCENE_CONFIG
  const activeBodies = useMemo(
    () => (scientificMode ? buildScientificBodiesFromSnapshot(activeBaseBodies, scientificSnapshot) : activeBaseBodies),
    [activeBaseBodies, scientificMode, scientificSnapshot]
  )

  const startupOrbitAngles = useMemo(
    () => getStartupOrbitAngles(activeBodies.planets, scientificMode ? scientificSnapshot : null),
    [activeBodies, scientificMode, scientificSnapshot]
  )
  const startupSpinAngles = useMemo(() => getStartupSpinAngles(activeBodies.planets), [activeBodies])
  const moonStartupAngles = useMemo(
    () => (scientificMode
      ? getScientificMoonOrbitState(activeBodies.planets, scientificSnapshot)
      : getStartupMoonOrbitAngles(activeBodies.planets)),
    [activeBodies, scientificMode, scientificSnapshot]
  )
  const earthPlanet = activeBodies.planets.find((planet) => planet.name === 'Earth')
  const earthStartDistance = earthPlanet?.distance ?? EARTH_FALLBACK_DISTANCE
  const earthStartRadius = earthPlanet?.radius ?? EARTH_FALLBACK_RADIUS
  const earthStartupAngle = startupOrbitAngles.Earth ?? 0
  const earthStartX = Math.cos(earthStartupAngle) * earthStartDistance
  const earthStartZ = Math.sin(earthStartupAngle) * earthStartDistance
  const [selectedName, setSelectedName] = useState('Earth')
  const [selectedMoonKey, setSelectedMoonKey] = useState(null)
  const [speedScale, setSpeedScale] = useState(MIN_SPEED)
  const [cameraMode, setCameraMode] = useState('focus')
  const [followSelected, setFollowSelected] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showOrbitLines, setShowOrbitLines] = useState(false)
  const [viewMode, setViewMode] = useState('space')
  const [mapCenter, setMapCenter] = useState({ lat: 0, lng: 0 })
  const [mapRange, setMapRange] = useState(MAP_DEFAULT_RANGE)
  const mapTransitionLockRef = useRef(false)
  const focusReleaseBlockUntilMsRef = useRef(0)
  const mapScrollIntentRef = useRef('none')
  const mapLastExitMsRef = useRef(0)
  const mapEnteredAtMsRef = useRef(0)
  const mapLastWheelMsRef = useRef(0)
  const mapEarthVecRef = useRef(new THREE.Vector3())
  const mapCameraVecRef = useRef(new THREE.Vector3())

  const selectedTargetKey = selectedMoonKey || selectedName
  const freezeSolarOrbits = scientificMode || followSelected
  const freezeAllMotion = followSelected && Boolean(selectedMoonKey)

  const selected = useMemo(() => {
    if (selectedMoonKey) {
      const [planetName, moonName] = selectedMoonKey.split('/')
      const planet = activeBodies.planets.find((p) => p.name === planetName)
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
    if (selectedName === 'Sun') return activeBodies.sun
    return activeBodies.planets.find((planet) => planet.name === selectedName) ?? null
  }, [activeBodies, selectedMoonKey, selectedName])

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
    if (scientificMode) {
      jumpTo('Earth')
      return
    }
    setSelectedMoonKey(null)
    setSelectedName(null)
    setCameraMode('home')
    setFollowSelected(false)
  }

  const returnToSpaceFromMap = useCallback(() => {
    mapTransitionLockRef.current = true
    setViewMode('space')
    setSelectedMoonKey(null)
    setSelectedName('Earth')
    setFollowSelected(true)
    setCameraMode('focus')
  }, [])

  useEffect(() => {
    if (viewMode !== 'map') return undefined

    const handleWheelIntent = (event) => {
      mapLastWheelMsRef.current = Date.now()
      mapScrollIntentRef.current = event.deltaY > 0 ? 'out' : event.deltaY < 0 ? 'in' : mapScrollIntentRef.current
    }

    window.addEventListener('wheel', handleWheelIntent, { passive: true, capture: true })
    return () => {
      window.removeEventListener('wheel', handleWheelIntent, { capture: true })
      mapScrollIntentRef.current = 'none'
    }
  }, [viewMode])

  const onEarthTelemetry = useCallback(
    ({ distance, earthRadius, earthPosition, cameraPosition }) => {
      if (viewMode !== 'space') return
      if (cameraMode !== null) return
      if (selectedTargetKey !== 'Earth' || selectedMoonKey) return

      const surfaceDistance = distance - earthRadius

      if (surfaceDistance > MAP_ENTER_RELEASE_SURFACE_BUFFER) {
        mapTransitionLockRef.current = false
      }

      if (surfaceDistance > MAP_ENTER_SURFACE_BUFFER || mapTransitionLockRef.current) return

      mapTransitionLockRef.current = true
      const earthVec = mapEarthVecRef.current.set(earthPosition.x, earthPosition.y, earthPosition.z)
      const cameraVec = mapCameraVecRef.current.set(cameraPosition.x, cameraPosition.y, cameraPosition.z)
      const lookDirection = cameraVec.sub(earthVec)
      const nextCenter = worldDirectionToLatLng(lookDirection)

      setMapCenter(nextCenter)
      setMapRange(MAP_DEFAULT_RANGE)
      mapLastExitMsRef.current = 0
      mapEnteredAtMsRef.current = Date.now()
      mapLastWheelMsRef.current = 0
      mapScrollIntentRef.current = 'none'
      setViewMode('map')
      setFollowSelected(false)
      setCameraMode(null)
    },
    [cameraMode, selectedMoonKey, selectedTargetKey, viewMode]
  )

  useEffect(() => {
    if (!scientificMode) return undefined
    let cancelled = false
    fetch('/api/horizons-bootstrap')
      .then((response) => {
        if (!response.ok) throw new Error(`Horizons bootstrap failed (${response.status})`)
        return response.json()
      })
      .then((payload) => {
        if (cancelled) return
        setScientificSnapshot(payload)
      })
      .catch(() => {
        if (cancelled) return
        setScientificSnapshot(null)
      })
    return () => {
      cancelled = true
    }
  }, [scientificMode])

  useEffect(() => {
    setViewMode('space')
    mapTransitionLockRef.current = true
    focusReleaseBlockUntilMsRef.current = Date.now() + 2400
    mapScrollIntentRef.current = 'none'
    mapLastExitMsRef.current = 0
    mapEnteredAtMsRef.current = 0
    mapLastWheelMsRef.current = 0
    setMapRange(MAP_DEFAULT_RANGE)
    setSelectedMoonKey(null)
    setSelectedName('Earth')
    setFollowSelected(true)
    setCameraMode('focus')
  }, [experienceMode])

  useEffect(() => {
    if (viewMode !== 'space') return undefined

    const readyForAutoMap =
      cameraMode === null &&
      selectedTargetKey === 'Earth' &&
      !selectedMoonKey

    if (!readyForAutoMap) {
      mapTransitionLockRef.current = true
      return undefined
    }

    const releaseId = window.setTimeout(() => {
      mapTransitionLockRef.current = false
    }, 850)

    return () => window.clearTimeout(releaseId)
  }, [cameraMode, selectedMoonKey, selectedTargetKey, viewMode])

  return (
    <div className={`app-shell ${sidebarOpen ? 'sidebar-open' : 'sidebar-collapsed'}`}>
      <aside className="side-drawer">
        {sidebarOpen ? (
          <div className="sidebar-header">
            <button
              type="button"
              className="sidebar-toggle is-open"
              onClick={() => setSidebarOpen(false)}
              aria-expanded
              aria-label="Close sidebar"
            >
              <span className="sidebar-toggle-visual" aria-hidden="true">
                <span className="sidebar-glyph" />
              </span>
              <span className="sidebar-tooltip">← Close sidebar</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="sidebar-toggle is-closed"
            onClick={() => setSidebarOpen(true)}
            aria-expanded={false}
            aria-label="Open sidebar"
          >
            <span className="sidebar-toggle-visual" aria-hidden="true">
              <span className="sidebar-glyph" />
            </span>
            <span className="sidebar-tooltip">→ Open sidebar</span>
          </button>
        )}

        {sidebarOpen ? (
          <div className="sidebar-content">
            <div className="hud">
              <div className="hud-title">
                <h1>Solar System Explorer</h1>
                <p>Navigate planets and moons, then transition between deep-space and Earth map mode.</p>
              </div>

              <div className="mode-switch" role="group" aria-label="Experience mode">
                <p className="mode-switch-label">Experience Mode</p>
                <div className="mode-switch-buttons">
                  <button
                    type="button"
                    className={`mode-switch-button ${experienceMode === 'fun' ? 'active' : ''}`}
                    aria-pressed={experienceMode === 'fun'}
                    onClick={() => setExperienceMode('fun')}
                  >
                    Fun Mode
                  </button>
                  <button
                    type="button"
                    className={`mode-switch-button ${experienceMode === 'scientific' ? 'active' : ''}`}
                    aria-pressed={experienceMode === 'scientific'}
                    onClick={() => setExperienceMode('scientific')}
                  >
                    Scientific Mode
                  </button>
                </div>
              </div>

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
                {activeBodies.planets.map((planet) => (
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
                    {activeBodies.planets
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
          </div>
        ) : null}
      </aside>

      <div className={`space-stage ${viewMode === 'map' ? 'inactive' : ''}`}>
        <Canvas
          camera={{
            position: [earthStartX + earthStartRadius * 2, earthStartRadius * 0.76, earthStartZ + earthStartRadius * 2],
            fov: 52,
            near: 0.1,
            far: activeSceneConfig.canvasFar
          }}
          shadows
          frameloop={viewMode === 'map' ? 'demand' : 'always'}
          onPointerMissed={() => {
            if (cameraMode === null && !scientificMode) {
              setSelectedMoonKey(null)
              setSelectedName(null)
              setFollowSelected(false)
            }
          }}
        >
          <color attach="background" args={[activeSceneConfig.backgroundColor]} />
          <Scene
            systemBodies={activeBodies}
            systemOrbitalBands={activeOrbitalBands}
            sceneConfig={activeSceneConfig}
            startupOrbitAngles={startupOrbitAngles}
            startupSpinAngles={startupSpinAngles}
            moonStartupAngles={moonStartupAngles}
            scientificMode={scientificMode}
            selectedName={selectedName}
            setSelectedName={jumpTo}
            setSelectedMoonKey={setSelectedMoonKey}
            speedScale={speedScale}
            cameraMode={cameraMode}
            selectedTargetKey={selectedTargetKey}
            followSelected={followSelected}
            freezeSolarOrbits={freezeSolarOrbits}
            freezeAllMotion={freezeAllMotion}
            onReleaseFollow={() => {
              if (Date.now() < focusReleaseBlockUntilMsRef.current) return
              setFollowSelected(false)
            }}
            onSelectMoonTarget={(planetName, moonName) => jumpToMoon(`${planetName}/${moonName}`)}
            setCameraMode={setCameraMode}
            showOrbitLines={showOrbitLines}
            onEarthTelemetry={onEarthTelemetry}
            lockPlanetFocus={scientificMode}
          />
        </Canvas>
      </div>

      {viewMode === 'map' ? (
        <GoogleMapsPanel
          center={mapCenter}
          range={mapRange}
          onRangeChange={(range) => {
            if (!Number.isFinite(range) || range <= 1000) {
              return
            }

            setMapRange(range)

            const intendedZoomOut = mapScrollIntentRef.current === 'out'
            const nowMs = Date.now()
            const cooldownElapsed = nowMs - mapLastExitMsRef.current > MAP_EXIT_COOLDOWN_MS
            const armDelayElapsed = nowMs - mapEnteredAtMsRef.current > MAP_EXIT_ARM_DELAY_MS
            const recentWheel = nowMs - mapLastWheelMsRef.current <= MAP_EXIT_WHEEL_RECENCY_MS
            const reachedExitRange = range >= MAP_EXIT_MIN_RANGE

            if (intendedZoomOut && reachedExitRange && cooldownElapsed && armDelayElapsed && recentWheel) {
              mapLastExitMsRef.current = nowMs
              returnToSpaceFromMap()
            }
          }}
          onBackToSpace={returnToSpaceFromMap}
        />
      ) : null}

    </div>
  )
}
