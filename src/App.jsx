import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars, useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
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
const FREE_ROAM_KEY_GROUPS = {
  forward: ['KeyW', 'ArrowUp'],
  backward: ['KeyS', 'ArrowDown'],
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  up: ['KeyE', 'PageUp', 'Space'],
  down: ['KeyQ', 'PageDown', 'ControlLeft', 'ControlRight'],
  turbo: ['ShiftLeft', 'ShiftRight']
}
const FUN_SCENE_CONFIG = {
  backgroundColor: '#030617',
  homeCamera: [0, 60, 260],
  canvasFar: 70_000,
  bloomStrength: 0.18,
  bloomRadius: 0.48,
  bloomThreshold: 0.95,
  controlsMaxDistance: 34_000,
  starsRadius: 28_000,
  starsDepth: 16_000,
  starsCount: 9_800,
  starsFactor: 6.0,
  starsSpeed: 0.12,
  starShellRadius: 42_000,
  starShellCount: 10_000,
  starShellColor: '#d9e8ff',
  starShellOpacity: 0.17,
  starShellSize: 1.72,
  deepSpaceRadius: 12_000,
  deepSpaceSpread: 4_200,
  deepSpaceCount: 7_600,
  deepSpaceColor: '#ecf6ff',
  deepSpaceOpacity: 0.28,
  deepSpaceSize: 1.76,
  galacticBandColor: '#8fb4ff',
  galacticBandOpacity: 0.06,
  galacticBandSize: 1.16,
  galacticBandThickness: 860,
  nebulaOpacity: 0.08,
  nebulaSize: 2.55,
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
  canvasFar: 6_000_000,
  bloomStrength: 0.4,
  bloomRadius: 0.72,
  bloomThreshold: 0.88,
  controlsMaxDistancePlanet: 90_000,
  controlsMaxDistanceSun: 4_800_000,
  scientificStarFieldRadius: 4_400_000,
  scientificStarFieldCount: 70_000,
  scientificStarFieldOpacity: 0.32,
  scientificStarFieldSizeMultiplier: 0.75,
  scientificStarFieldBrightnessMultiplier: 0.55,
  scientificStarFieldTwinkleSpeed: 0.34,
  scientificStarFieldTwinkleAmount: 0.15,
  starsRadius: 2_200_000,
  starsDepth: 1_100_000,
  starsCount: 9_000,
  starsFactor: 2.3,
  starsSpeed: 0.05,
  starShellRadius: 4_000_000,
  starShellCount: 14_000,
  starShellColor: '#edf3ff',
  starShellOpacity: 0.18,
  starShellSize: 1.0,
  deepSpaceRadius: 1_000_000,
  deepSpaceSpread: 500_000,
  deepSpaceCount: 7_500,
  deepSpaceColor: '#f4f8ff',
  deepSpaceOpacity: 0.15,
  deepSpaceSize: 1.05,
  galacticBandColor: '#c3d7f8',
  galacticBandOpacity: 0.08,
  galacticBandSize: 1.55,
  galacticBandThickness: 200_000,
  nebulaOpacity: 0,
  nebulaSize: 2.6,
  asteroidCount: 10_000,
  asteroidOpacity: 0.08,
  asteroidThickness: 36,
  asteroidSize: 0.25,
  kuiperCount: 14_000,
  kuiperOpacity: 0.06,
  kuiperThickness: 240,
  kuiperSize: 0.34,
  oortRadius: 3_300_000,
  oortSpread: 550_000,
  oortCount: 26_000,
  oortOpacity: 0.062,
  oortSize: 1.24
}
const SCIENTIFIC_STAR_DENSITY_PRESETS = {
  low: {
    label: 'Low',
    starFieldMultiplier: 0.2,
    shellMultiplier: 0.25,
    threeStarsMultiplier: 0.35,
    threeStarsSizeMultiplier: 0.55,
    sizeMultiplier: 0.55,
    brightnessMultiplier: 0.5,
    opacityMultiplier: 0.6
  },
  medium: {
    label: 'Medium',
    starFieldMultiplier: 0.45,
    shellMultiplier: 0.55,
    threeStarsMultiplier: 0.65,
    threeStarsSizeMultiplier: 0.75,
    sizeMultiplier: 0.75,
    brightnessMultiplier: 0.75,
    opacityMultiplier: 0.8
  },
  high: {
    label: 'High',
    starFieldMultiplier: 0.8,
    shellMultiplier: 0.8,
    threeStarsMultiplier: 0.85,
    threeStarsSizeMultiplier: 0.88,
    sizeMultiplier: 0.9,
    brightnessMultiplier: 0.9,
    opacityMultiplier: 0.9
  },
  extreme: {
    label: 'Extreme',
    starFieldMultiplier: 1.45,
    shellMultiplier: 1.25,
    threeStarsMultiplier: 1.2,
    threeStarsSizeMultiplier: 1.02,
    sizeMultiplier: 1.08,
    brightnessMultiplier: 1.05,
    opacityMultiplier: 1.0
  },
  insane: {
    label: 'Insane',
    starFieldMultiplier: 2.8,
    shellMultiplier: 2,
    threeStarsMultiplier: 1.6,
    threeStarsSizeMultiplier: 1.15,
    sizeMultiplier: 1.2,
    brightnessMultiplier: 1.12,
    opacityMultiplier: 1.05
  }
}
const SCIENTIFIC_STAR_DENSITY_ORDER = ['low', 'medium', 'high', 'extreme', 'insane']

function buildScientificSceneConfig(densityKey = 'high') {
  const preset = SCIENTIFIC_STAR_DENSITY_PRESETS[densityKey] ?? SCIENTIFIC_STAR_DENSITY_PRESETS.high
  const scaleCount = (baseCount, multiplier, min, max) =>
    THREE.MathUtils.clamp(Math.floor(baseCount * multiplier), min, max)

  return {
    ...SCIENTIFIC_SCENE_CONFIG,
    scientificStarFieldCount: scaleCount(
      SCIENTIFIC_SCENE_CONFIG.scientificStarFieldCount,
      preset.starFieldMultiplier,
      4_000,
      700_000
    ),
    scientificStarFieldOpacity: THREE.MathUtils.clamp(
      SCIENTIFIC_SCENE_CONFIG.scientificStarFieldOpacity * preset.opacityMultiplier,
      0.2,
      0.98
    ),
    scientificStarFieldSizeMultiplier: preset.sizeMultiplier,
    scientificStarFieldBrightnessMultiplier: preset.brightnessMultiplier,
    starShellCount: scaleCount(SCIENTIFIC_SCENE_CONFIG.starShellCount, preset.shellMultiplier, 3_000, 120_000),
    starsCount: scaleCount(SCIENTIFIC_SCENE_CONFIG.starsCount, preset.threeStarsMultiplier, 3_000, 110_000),
    starsFactor: SCIENTIFIC_SCENE_CONFIG.starsFactor * preset.threeStarsSizeMultiplier
  }
}

function describeRoamTarget(type, focusKey) {
  if (type === 'asteroid') return 'Asteroid Belt'
  if (type === 'kuiper') return 'Kuiper Belt'
  if (type === 'oort') return 'Oort Cloud'
  if (focusKey?.includes('/')) {
    const [planet, moon] = focusKey.split('/')
    return `${moon} (${planet})`
  }
  if (focusKey) return focusKey
  if (type) return `${type.charAt(0).toUpperCase()}${type.slice(1)}`
  return 'Unknown Target'
}

function formatRoamDistance(distance) {
  if (!Number.isFinite(distance)) return '--'
  const absDistance = Math.abs(distance)
  if (absDistance >= 1_000_000) return `${(distance / 1_000_000).toFixed(2)}M sim units`
  if (absDistance >= 1_000) return `${(distance / 1_000).toFixed(1)}k sim units`
  return `${distance.toFixed(0)} sim units`
}

function formatRoamEta(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '--'
  if (seconds < 10) return `${seconds.toFixed(1)}s`
  if (seconds < 60) return `${Math.round(seconds)}s`
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  if (mins < 60) return `${mins}m ${secs}s`
  const hours = Math.floor(mins / 60)
  const remMins = mins % 60
  return `${hours}h ${remMins}m`
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
const INNER_SYSTEM_PLANETS = ['Mercury', 'Venus', 'Earth', 'Mars']
const PLANET_ATMOSPHERE_CONFIG = {
  Earth: {
    color: '#74bcff',
    intensity: 0.32,
    fresnelPower: 3.45,
    nightMin: 0.16,
    scale: 1.032
  },
  Mars: {
    color: '#ffac84',
    intensity: 0.2,
    fresnelPower: 3.8,
    nightMin: 0.09,
    scale: 1.024
  }
}
const ATMOSPHERE_VERTEX_SHADER = `
  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xyz;
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`
const ATMOSPHERE_FRAGMENT_SHADER = `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uFresnelPower;
  uniform float uNightMin;

  varying vec3 vWorldPos;
  varying vec3 vWorldNormal;

  void main() {
    vec3 N = normalize(vWorldNormal);
    vec3 V = normalize(cameraPosition - vWorldPos);
    vec3 toSun = normalize(-vWorldPos); // Sun is fixed at world origin in this scene.

    float fresnel = pow(1.0 - max(dot(N, V), 0.0), uFresnelPower);
    float day = max(dot(N, toSun), 0.0);
    float lit = mix(uNightMin, 1.0, day);

    float alpha = fresnel * lit * uIntensity;
    vec3 color = uColor * mix(0.55, 1.0, day);
    gl_FragColor = vec4(color, alpha);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`

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

function createSoftSpriteTexture({
  size = 64,
  centerAlpha = 1,
  innerStop = 0.42,
  innerAlpha = 0.6,
  outerAlpha = 0
} = {}) {
  if (typeof document === 'undefined') return null
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const c = size * 0.5
  const gradient = ctx.createRadialGradient(c, c, 0, c, c, c)
  gradient.addColorStop(0, `rgba(255,255,255,${centerAlpha})`)
  gradient.addColorStop(innerStop, `rgba(255,255,255,${innerAlpha})`)
  gradient.addColorStop(1, `rgba(255,255,255,${outerAlpha})`)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.needsUpdate = true
  return texture
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

function Belt({ count, innerRadius, outerRadius, thickness, color, opacity, size = 0.35, materialRef = null }) {
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
      <pointsMaterial
        ref={materialRef}
        color={color}
        size={size}
        sizeAttenuation
        transparent
        opacity={opacity}
        depthTest
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  )
}

function OortCloud({
  radius = 3400,
  spread = 500,
  count = 10000,
  color = '#86aef0',
  opacity = 0.18,
  size = 1.2,
  sizeAttenuation = true,
  materialRef = null
}) {
  const starSprite = useMemo(
    () => createSoftSpriteTexture({ centerAlpha: 1, innerStop: 0.48, innerAlpha: 0.45, outerAlpha: 0 }),
    []
  )

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

  useEffect(() => () => {
    if (starSprite) starSprite.dispose()
  }, [starSprite])

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        ref={materialRef}
        color={color}
        size={size}
        transparent
        opacity={opacity}
        sizeAttenuation={sizeAttenuation}
        depthWrite={false}
        toneMapped={false}
        map={starSprite ?? undefined}
        alphaMap={starSprite ?? undefined}
        alphaTest={0.03}
      />
    </points>
  )
}

function DeepSpaceField({ radius = 12000, spread = 4200, count = 15000, color = '#f4fbff', opacity = 0.58, size = 2.2 }) {
  const starSprite = useMemo(
    () => createSoftSpriteTexture({ centerAlpha: 1, innerStop: 0.42, innerAlpha: 0.6, outerAlpha: 0 }),
    []
  )

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
  const colors = useMemo(() => {
    const arr = new Float32Array(count * 3)
    const cool = new THREE.Color('#dce7ff')
    const neutral = new THREE.Color('#f6f8ff')
    const warm = new THREE.Color('#ffe5bf')
    for (let i = 0; i < count; i += 1) {
      const r = Math.random()
      const source = r < 0.18 ? cool : r < 0.84 ? neutral : warm
      const mixed = source.clone().lerp(new THREE.Color('#ffffff'), Math.random() * 0.26)
      arr[i * 3] = mixed.r
      arr[i * 3 + 1] = mixed.g
      arr[i * 3 + 2] = mixed.b
    }
    return arr
  }, [count])

  useEffect(() => () => {
    if (starSprite) starSprite.dispose()
  }, [starSprite])

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        color={color}
        size={size}
        sizeAttenuation
        transparent
        opacity={opacity}
        depthWrite={false}
        toneMapped={false}
        map={starSprite ?? undefined}
        alphaMap={starSprite ?? undefined}
        alphaTest={0.03}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

function CameraLockedStarShell({ radius = 42000, count = 18000, color = '#e7f1ff', opacity = 0.34, size = 2.1 }) {
  const { camera } = useThree()
  const shellRef = useRef()
  const starSprite = useMemo(
    () => createSoftSpriteTexture({ centerAlpha: 1, innerStop: 0.4, innerAlpha: 0.58, outerAlpha: 0 }),
    []
  )

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
  useEffect(() => () => {
    if (starSprite) starSprite.dispose()
  }, [starSprite])

  return (
    <points ref={shellRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        color={color}
        size={size}
        sizeAttenuation={false}
        transparent
        opacity={opacity}
        depthWrite={false}
        toneMapped={false}
        map={starSprite ?? undefined}
        alphaMap={starSprite ?? undefined}
        alphaTest={0.03}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

function CameraLockedGalacticBand({
  radius = 42000,
  count = 18000,
  thickness = 900,
  color = '#9db8e8',
  opacity = 0.2,
  size = 1.15
}) {
  const { camera } = useThree()
  const bandRef = useRef()
  const starSprite = useMemo(
    () => createSoftSpriteTexture({ centerAlpha: 1, innerStop: 0.52, innerAlpha: 0.34, outerAlpha: 0 }),
    []
  )

  const { positions, colors } = useMemo(() => {
    const arr = new Float32Array(count * 3)
    const colorArr = new Float32Array(count * 3)
    const base = new THREE.Color(color)
    const cool = new THREE.Color('#94b5e8')
    const warm = new THREE.Color('#c8daf7')
    for (let i = 0; i < count; i += 1) {
      const theta = Math.random() * Math.PI * 2
      const bandR = radius * (0.7 + Math.random() * 0.28)
      const y = (Math.random() - 0.5) * thickness
      arr[i * 3] = Math.cos(theta) * bandR
      arr[i * 3 + 1] = y
      arr[i * 3 + 2] = Math.sin(theta) * bandR

      const source = Math.random() < 0.72 ? base : (Math.random() < 0.5 ? cool : warm)
      const mixed = source.clone().lerp(new THREE.Color('#ffffff'), Math.random() * 0.2)
      colorArr[i * 3] = mixed.r
      colorArr[i * 3 + 1] = mixed.g
      colorArr[i * 3 + 2] = mixed.b
    }
    return { positions: arr, colors: colorArr }
  }, [color, count, radius, thickness])

  useFrame(() => {
    if (!bandRef.current) return
    bandRef.current.position.copy(camera.position)
  })
  useEffect(() => () => {
    if (starSprite) starSprite.dispose()
  }, [starSprite])

  return (
    <points ref={bandRef} rotation={[0.42, 0.76, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        color={color}
        size={size}
        sizeAttenuation={false}
        transparent
        opacity={opacity}
        depthWrite={false}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
        map={starSprite ?? undefined}
        alphaMap={starSprite ?? undefined}
        alphaTest={0.02}
      />
    </points>
  )
}

function CameraLockedNebula({ radius = 42000, count = 12000, opacity = 0.3, size = 3.2 }) {
  const { camera } = useThree()
  const nebulaRef = useRef()
  const nebulaSprite = useMemo(
    () => createSoftSpriteTexture({ centerAlpha: 0.95, innerStop: 0.65, innerAlpha: 0.18, outerAlpha: 0 }),
    []
  )

  const { positions, colors } = useMemo(() => {
    const p = new Float32Array(count * 3)
    const c = new Float32Array(count * 3)
    const cloudCenters = [
      new THREE.Vector3(0.88, 0.18, 0.22),
      new THREE.Vector3(-0.54, 0.22, 0.8),
      new THREE.Vector3(-0.22, -0.35, -0.91)
    ]
    const cloudColors = [
      new THREE.Color('#6f9fd8'),
      new THREE.Color('#7294d5'),
      new THREE.Color('#9c7eb3')
    ]

    for (let i = 0; i < count; i += 1) {
      const cluster = i % cloudCenters.length
      const center = cloudCenters[cluster]
      const jitter = new THREE.Vector3((Math.random() - 0.5) * 1.25, (Math.random() - 0.5) * 0.9, (Math.random() - 0.5) * 1.25)
      const dir = center.clone().add(jitter).normalize()
      const r = radius * (0.76 + Math.random() * 0.2)
      p[i * 3] = dir.x * r
      p[i * 3 + 1] = dir.y * r
      p[i * 3 + 2] = dir.z * r

      const color = cloudColors[cluster].clone().lerp(new THREE.Color('#bcd0ef'), Math.random() * 0.45)
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
  useEffect(() => () => {
    if (nebulaSprite) nebulaSprite.dispose()
  }, [nebulaSprite])

  return (
    <points ref={nebulaRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        size={size}
        sizeAttenuation={false}
        transparent
        opacity={opacity}
        depthWrite={false}
        toneMapped={false}
        blending={THREE.AdditiveBlending}
        map={nebulaSprite ?? undefined}
        alphaMap={nebulaSprite ?? undefined}
        alphaTest={0.01}
      />
    </points>
  )
}

function ScientificStarField({
  radius = 4_400_000,
  count = 70_000,
  opacity = 0.32,
  twinkleSpeed = 0.34,
  twinkleAmount = 0.15,
  sizeMultiplier = 0.75,
  brightnessMultiplier = 0.55
}) {
  const { camera } = useThree()
  const baseRef = useRef()
  const brightRef = useRef()
  const baseMaterialRef = useRef()
  const brightMaterialRef = useRef()
  const starSprite = useMemo(() => {
    if (typeof document === 'undefined') return null
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    gradient.addColorStop(0, 'rgba(255,255,255,1)')
    gradient.addColorStop(0.45, 'rgba(255,255,255,0.65)')
    gradient.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 64, 64)

    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.needsUpdate = true
    return texture
  }, [])

  const { positions, colors, brightPositions, brightColors } = useMemo(() => {
    const brightCount = Math.max(300, Math.floor(count * 0.03))
    const baseCount = Math.max(2400, count - brightCount)
    const p = new Float32Array(baseCount * 3)
    const c = new Float32Array(baseCount * 3)
    const bp = new Float32Array(brightCount * 3)
    const bc = new Float32Array(brightCount * 3)

    const spectralPalette = [
      new THREE.Color('#9bbcff'),
      new THREE.Color('#ccd9ff'),
      new THREE.Color('#f5f7ff'),
      new THREE.Color('#fff1c7'),
      new THREE.Color('#ffd7a4'),
      new THREE.Color('#ffbe93')
    ]
    const white = new THREE.Color('#ffffff')
    const chooseSpectralIndex = () => {
      const roll = Math.random()
      if (roll < 0.06) return 0
      if (roll < 0.17) return 1
      if (roll < 0.49) return 2
      if (roll < 0.76) return 3
      if (roll < 0.92) return 4
      return 5
    }

    for (let i = 0; i < baseCount; i += 1) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = radius * (0.84 + Math.random() * 0.2)

      p[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      p[i * 3 + 1] = r * Math.cos(phi)
      p[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)

      const color = spectralPalette[chooseSpectralIndex()].clone().lerp(white, Math.random() * 0.25)
      c[i * 3] = color.r
      c[i * 3 + 1] = color.g
      c[i * 3 + 2] = color.b
    }

    for (let i = 0; i < brightCount; i += 1) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = radius * (0.86 + Math.random() * 0.18)

      bp[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      bp[i * 3 + 1] = r * Math.cos(phi)
      bp[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)

      const warmMix = Math.random()
      const brightColor = new THREE.Color('#ffffff').lerp(new THREE.Color('#ffd8ab'), warmMix * 0.34)
      bc[i * 3] = brightColor.r
      bc[i * 3 + 1] = brightColor.g
      bc[i * 3 + 2] = brightColor.b
    }

    return { positions: p, colors: c, brightPositions: bp, brightColors: bc }
  }, [count, radius])

  useFrame((state) => {
    if (baseRef.current) baseRef.current.position.copy(camera.position)
    if (brightRef.current) brightRef.current.position.copy(camera.position)

    const basePulse = 1 + Math.sin(state.clock.elapsedTime * twinkleSpeed) * twinkleAmount * 0.08
    const brightPulse = 1 + Math.sin(state.clock.elapsedTime * (twinkleSpeed * 1.5)) * twinkleAmount * 0.18

    if (baseMaterialRef.current) {
      baseMaterialRef.current.opacity = THREE.MathUtils.clamp(opacity * 0.34 * brightnessMultiplier * basePulse, 0.02, 0.9)
    }
    if (brightMaterialRef.current) {
      brightMaterialRef.current.opacity = THREE.MathUtils.clamp(opacity * 0.52 * brightnessMultiplier * brightPulse, 0.02, 0.92)
    }
  })

  useEffect(() => () => {
    if (starSprite) starSprite.dispose()
  }, [starSprite])

  return (
    <>
      <points ref={baseRef} frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={colors.length / 3} array={colors} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial
          ref={baseMaterialRef}
          vertexColors
          size={1.15 * sizeMultiplier}
          sizeAttenuation={false}
          transparent
          opacity={opacity * 0.34 * brightnessMultiplier}
          depthWrite={false}
          toneMapped={false}
          map={starSprite ?? undefined}
          alphaMap={starSprite ?? undefined}
          alphaTest={0.05}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <points ref={brightRef} frustumCulled={false} renderOrder={4}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={brightPositions.length / 3} array={brightPositions} itemSize={3} />
          <bufferAttribute attach="attributes-color" count={brightColors.length / 3} array={brightColors} itemSize={3} />
        </bufferGeometry>
        <pointsMaterial
          ref={brightMaterialRef}
          vertexColors
          size={2.8 * sizeMultiplier}
          sizeAttenuation={false}
          transparent
          opacity={opacity * 0.52 * brightnessMultiplier}
          depthWrite={false}
          toneMapped={false}
          map={starSprite ?? undefined}
          alphaMap={starSprite ?? undefined}
          alphaTest={0.05}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </>
  )
}

function BloomPostProcessing({
  enabled = true,
  bloomStrength = 0.4,
  bloomRadius = 0.72,
  bloomThreshold = 0.88
}) {
  const { gl, scene, camera, size } = useThree()
  const composerRef = useRef()
  const bloomPassRef = useRef()

  useEffect(() => {
    const composer = new EffectComposer(gl)
    const renderPass = new RenderPass(scene, camera)
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.width, size.height),
      bloomStrength,
      bloomRadius,
      bloomThreshold
    )

    composer.addPass(renderPass)
    composer.addPass(bloomPass)
    composerRef.current = composer
    bloomPassRef.current = bloomPass

    return () => {
      composer.passes.forEach((pass) => pass.dispose?.())
      composer.dispose()
      composerRef.current = null
      bloomPassRef.current = null
    }
  }, [bloomRadius, bloomStrength, bloomThreshold, camera, gl, scene, size.height, size.width])

  useEffect(() => {
    if (!composerRef.current || !bloomPassRef.current) return
    composerRef.current.setSize(size.width, size.height)
    bloomPassRef.current.strength = bloomStrength
    bloomPassRef.current.radius = bloomRadius
    bloomPassRef.current.threshold = bloomThreshold
  }, [bloomRadius, bloomStrength, bloomThreshold, size.height, size.width])

  useFrame((state) => {
    if (enabled && composerRef.current) {
      composerRef.current.render()
      return
    }
    state.gl.render(state.scene, state.camera)
  }, 1)

  return null
}

function PlanetAtmosphere({ radius, config }) {
  const material = useMemo(() => {
    const nextMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Color(config.color) },
        uIntensity: { value: config.intensity },
        uFresnelPower: { value: config.fresnelPower },
        uNightMin: { value: config.nightMin }
      },
      vertexShader: ATMOSPHERE_VERTEX_SHADER,
      fragmentShader: ATMOSPHERE_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    })
    nextMaterial.toneMapped = true
    return nextMaterial
  }, [config.color, config.fresnelPower, config.intensity, config.nightMin])

  useEffect(() => () => material.dispose(), [material])

  return (
    <mesh>
      <sphereGeometry args={[radius * config.scale, 48, 48]} />
      <primitive attach="material" object={material} />
    </mesh>
  )
}

function Moon({
  moon,
  parentName,
  speedScale,
  registerBodyRef,
  onSelectTarget,
  freezeAllMotion,
  freezeOrbit = false,
  parentAxialTiltRad = 0,
  orbitReference = 'equatorial',
  initialOrbitAngle,
  orbitInclinationRad = 0,
  orbitAscendingNodeRad = 0
}) {
  const pivot = useRef()
  const meshRef = useRef()
  const moonTexture = useTexture(moon.texture)
  const rawInclinationDeg = useMemo(() => {
    if (!Number.isFinite(orbitInclinationRad)) return 0
    let deg = THREE.MathUtils.radToDeg(orbitInclinationRad)
    deg = THREE.MathUtils.euclideanModulo(deg, 360)
    if (deg > 180) deg = 360 - deg
    return deg
  }, [orbitInclinationRad])
  const effectiveInclinationRad = useMemo(() => {
    const planarDeg = rawInclinationDeg > 90 ? 180 - rawInclinationDeg : rawInclinationDeg
    return THREE.MathUtils.degToRad(planarDeg)
  }, [rawInclinationDeg])
  const retrograde = useMemo(
    () => (moon.orbitPeriod < 0) || rawInclinationDeg > 90,
    [moon.orbitPeriod, rawInclinationDeg]
  )
  const referenceTiltRad = useMemo(
    () => (orbitReference === 'equatorial' ? parentAxialTiltRad : 0),
    [orbitReference, parentAxialTiltRad]
  )

  useEffect(() => {
    configureTexture(moonTexture)
  }, [moonTexture])

  useEffect(() => {
    if (!pivot.current || !Number.isFinite(initialOrbitAngle)) return
    pivot.current.rotation.y = initialOrbitAngle
  }, [initialOrbitAngle])

  useFrame((_, delta) => {
    if (!pivot.current || !meshRef.current) return
    const orbit = (freezeAllMotion || freezeOrbit)
      ? 0
      : (1 / Math.max(Math.abs(moon.orbitPeriod), 0.02)) * MOON_ORBIT_BASE * speedScale
    const direction = retrograde ? -1 : 1
    pivot.current.rotation.y += delta * orbit * direction
    // Most major moons are tidally locked, which reads more naturally here.
    const moonSpin = moon.tidallyLocked === false ? SPIN_SPEED * speedScale : 0
    meshRef.current.rotation.y += delta * moonSpin
  })

  return (
    <group ref={pivot}>
      <group rotation={[0, orbitAscendingNodeRad, 0]}>
        <group rotation={[0, 0, referenceTiltRad]}>
          <group rotation={[effectiveInclinationRad, 0, 0]}>
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
      </group>
    </group>
  )
}

function EarthMaterial({ dayMap, nightMap, ambient = 0.3 }) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        uniforms: {
          dayMap: { value: dayMap },
          nightMap: { value: nightMap },
          sunPosition: { value: new THREE.Vector3(0, 0, 0) },
          ambient: { value: ambient }
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
    [ambient, dayMap, nightMap]
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
  freezeMoonOrbitKey,
  scientificMode,
  onSelectMoonTarget,
  moonStartupAngles
}) {
  const orbitRef = useRef()
  const planetRef = useRef()
  const isEarth = data.name === 'Earth'
  const baseEmissiveIntensity = data.name === 'Mars' ? 0.36 : 0.24
  const emissiveIntensity = scientificMode ? baseEmissiveIntensity * 1.95 : baseEmissiveIntensity
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
  const baseAtmosphereConfig = PLANET_ATMOSPHERE_CONFIG[data.name] ?? null
  const atmosphereConfig = baseAtmosphereConfig
    ? {
      ...baseAtmosphereConfig,
      intensity: baseAtmosphereConfig.intensity * (scientificMode ? 1 : 0.66),
      nightMin: scientificMode ? baseAtmosphereConfig.nightMin : Math.min(baseAtmosphereConfig.nightMin + 0.04, 0.3),
      fresnelPower: scientificMode ? baseAtmosphereConfig.fresnelPower : baseAtmosphereConfig.fresnelPower + 0.16
    }
    : null

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
              <EarthMaterial dayMap={tex} nightMap={earthNightTex} ambient={scientificMode ? 0.44 : 0.3} />
            ) : (
              <meshStandardMaterial
                map={tex}
                roughness={0.82}
                metalness={0.06}
                emissive={new THREE.Color(scientificMode ? '#292929' : '#1d1d1d')}
                emissiveIntensity={emissiveIntensity}
              />
            )}
          </mesh>
          {atmosphereConfig ? <PlanetAtmosphere radius={data.radius} config={atmosphereConfig} /> : null}

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

        {data.moons.map((moon) => {
          const moonKey = `${data.name}/${moon.name}`
          return (
            <Moon
              key={`${data.name}-${moon.name}`}
              moon={moon}
              parentName={data.name}
              speedScale={speedScale}
              registerBodyRef={registerBodyRef}
              onSelectTarget={onSelectMoonTarget}
              freezeAllMotion={freezeAllMotion}
              freezeOrbit={Boolean(freezeMoonOrbitKey && freezeMoonOrbitKey === moonKey)}
              parentAxialTiltRad={axialTiltRad}
              orbitReference={moon.orbitReference ?? (data.name === 'Earth' ? 'ecliptic' : 'equatorial')}
              initialOrbitAngle={moonStartupAngles?.[`${data.name}/${moon.name}`]?.angle ?? moonStartupAngles?.[`${data.name}/${moon.name}`]}
              orbitInclinationRad={moonStartupAngles?.[`${data.name}/${moon.name}`]?.inclinationRad ?? 0}
              orbitAscendingNodeRad={moonStartupAngles?.[`${data.name}/${moon.name}`]?.ascendingNodeRad ?? 0}
            />
          )
        })}
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

function FreeRoamController({
  enabled = false,
  keyboardEnabled = true,
  autoRoamEnabled = false,
  autoRoamSpeed = 0.2,
  scientificMode = false,
  controlsRef,
  bodyRefs,
  orbitalBands,
  sceneConfig,
  onAutoRoamStatus
}) {
  const pressedRef = useRef(new Set())
  const scriptedRef = useRef({
    forward: 0,
    right: 0,
    up: 0,
    boost: 1,
    yaw: 0,
    pitch: 0,
    untilMs: 0
  })
  const autoStateRef = useRef({
    hasTarget: false,
    mode: 'travel',
    holdUntilMs: 0,
    travelStartedMs: 0,
    targetType: 'sun',
    focusKey: 'Sun',
    arrivalDistance: 20,
    orbitSpin: 1,
    orbitStrafe: 0.7,
    orbitTurnsTarget: 1,
    orbitTurnsProgress: 0,
    orbitPrevAzimuth: null,
    forceInnerNext: false
  })
  const autoSpeedRef = useRef(0)
  const autoStatusEmitRef = useRef({ time: 0, signature: 'none' })
  const forward = useMemo(() => new THREE.Vector3(), [])
  const right = useMemo(() => new THREE.Vector3(), [])
  const up = useMemo(() => new THREE.Vector3(), [])
  const move = useMemo(() => new THREE.Vector3(), [])
  const step = useMemo(() => new THREE.Vector3(), [])
  const earthPos = useMemo(() => new THREE.Vector3(), [])
  const focusPos = useMemo(() => new THREE.Vector3(), [])
  const waypointPos = useMemo(() => new THREE.Vector3(), [])
  const targetPos = useMemo(() => new THREE.Vector3(), [])
  const targetDir = useMemo(() => new THREE.Vector3(), [])
  const randomDir = useMemo(() => new THREE.Vector3(), [])
  const desiredDir = useMemo(() => new THREE.Vector3(), [])
  const radialDir = useMemo(() => new THREE.Vector3(), [])
  const tangentDir = useMemo(() => new THREE.Vector3(), [])
  const shipRight = useMemo(() => new THREE.Vector3(), [])
  const shipUp = useMemo(() => new THREE.Vector3(), [])
  const worldUp = useMemo(() => new THREE.Vector3(0, 1, 0), [])
  const axisX = useMemo(() => new THREE.Vector3(1, 0, 0), [])
  const shipMatrix = useMemo(() => new THREE.Matrix4(), [])
  const shipQuat = useMemo(() => new THREE.Quaternion(), [])
  const lookQuat = useMemo(() => new THREE.Quaternion(), [])
  const lookEuler = useMemo(() => new THREE.Euler(0, 0, 0, 'YXZ'), [])
  const shipForwardRef = useRef(new THREE.Vector3(0, 0, -1))
  const lookOffsetRef = useRef({ yaw: 0, pitch: 0 })
  const manualLookDeltaRef = useRef({ yaw: 0, pitch: 0 })
  const lookDragActiveRef = useRef(false)
  const lookDir = useMemo(() => new THREE.Vector3(), [])
  const lookBaseDir = useMemo(() => new THREE.Vector3(), [])
  const viewEuler = useMemo(() => new THREE.Euler(0, 0, 0, 'YXZ'), [])
  const keySets = useMemo(
    () => ({
      forward: new Set(FREE_ROAM_KEY_GROUPS.forward),
      backward: new Set(FREE_ROAM_KEY_GROUPS.backward),
      left: new Set(FREE_ROAM_KEY_GROUPS.left),
      right: new Set(FREE_ROAM_KEY_GROUPS.right),
      up: new Set(FREE_ROAM_KEY_GROUPS.up),
      down: new Set(FREE_ROAM_KEY_GROUPS.down),
      turbo: new Set(FREE_ROAM_KEY_GROUPS.turbo),
      all: new Set(Object.values(FREE_ROAM_KEY_GROUPS).flat())
    }),
    []
  )

  const applyScriptedInput = useCallback((input = {}) => {
    const durationMs = Number.isFinite(input.durationMs) ? Math.max(16, input.durationMs) : 16
    const normalizeAxis = (value) => {
      if (!Number.isFinite(value)) return 0
      return THREE.MathUtils.clamp(value, -1, 1)
    }

    scriptedRef.current = {
      forward: normalizeAxis(input.forward),
      right: normalizeAxis(input.right),
      up: normalizeAxis(input.up),
      boost: Number.isFinite(input.boost) ? THREE.MathUtils.clamp(input.boost, 0.25, 8) : 1,
      yaw: Number.isFinite(input.yaw) ? input.yaw : 0,
      pitch: Number.isFinite(input.pitch) ? input.pitch : 0,
      untilMs: performance.now() + durationMs
    }
  }, [])

  const clearScriptedInput = useCallback(() => {
    scriptedRef.current.untilMs = 0
    scriptedRef.current.forward = 0
    scriptedRef.current.right = 0
    scriptedRef.current.up = 0
    scriptedRef.current.boost = 1
    scriptedRef.current.yaw = 0
    scriptedRef.current.pitch = 0
  }, [])

  const emitAutoRoamStatus = useCallback((status, nowMs = performance.now()) => {
    if (!onAutoRoamStatus) return
    const signature = status
      ? [
          status.mode,
          status.targetLabel,
          status.focusKey ?? 'none',
          Math.round((status.distance ?? 0) / 10),
          Math.round((status.etaSeconds ?? -1) * 5),
          Math.round((status.holdRemainingSeconds ?? 0) * 5),
          Math.round((status.orbitTurnsProgress ?? 0) * 10)
        ].join('|')
      : 'none'
    const shouldEmit = (
      signature !== autoStatusEmitRef.current.signature
      || nowMs - autoStatusEmitRef.current.time > 220
    )
    if (!shouldEmit) return
    autoStatusEmitRef.current.signature = signature
    autoStatusEmitRef.current.time = nowMs
    onAutoRoamStatus(status)
  }, [onAutoRoamStatus])

  const randomUnitVector = useCallback(() => {
    const theta = Math.random() * Math.PI * 2
    const z = Math.random() * 2 - 1
    const xy = Math.sqrt(Math.max(0, 1 - z * z))
    randomDir.set(Math.cos(theta) * xy, z, Math.sin(theta) * xy)
    return randomDir
  }, [randomDir])

  const chooseAutoRoamTarget = useCallback((camera, options = {}) => {
    if (!bodyRefs?.current) return null

    const byKey = bodyRefs.current
    const keys = Object.keys(byKey)
    const sunHit = byKey.Sun
    const planetKeys = keys.filter((key) => key !== 'Sun' && !key.includes('/'))
    const moonKeys = keys.filter((key) => key.includes('/'))
    const hasBelts = Boolean(orbitalBands?.asteroidBelt && orbitalBands?.kuiperBelt)
    const preferInner = Boolean(options.preferInner)
    const previousType = options.previousType ?? null
    const preferredMoonParent = options.preferredMoonParent ?? null
    let focusKey = null

    const preferredMoonKeys = preferredMoonParent
      ? moonKeys.filter((key) => key.startsWith(`${preferredMoonParent}/`))
      : []
    if (preferredMoonKeys.length && Math.random() < 0.78) {
      const moonKey = preferredMoonKeys[Math.floor(Math.random() * preferredMoonKeys.length)]
      const hit = byKey[moonKey]
      if (hit) {
        hit.mesh.getWorldPosition(focusPos)
        focusKey = moonKey
      }
    }

    const weightedTypes = [
      { type: 'sun', weight: preferInner ? 0.15 : 0.12 },
      { type: 'planet', weight: preferInner ? 0.52 : 0.44 },
      { type: 'moon', weight: moonKeys.length ? (preferInner ? 0.33 : 0.32) : 0 }
    ]
    if (hasBelts) {
      weightedTypes.push({ type: 'asteroid', weight: preferInner ? 0.02 : 0.07 })
      weightedTypes.push({ type: 'kuiper', weight: preferInner ? 0 : 0.04 })
    }
    if (sceneConfig?.oortRadius) {
      weightedTypes.push({ type: 'oort', weight: preferInner ? 0 : 0.01 })
    }

    const filteredTypes = weightedTypes.filter((entry) => entry.weight > 0 && (entry.type !== previousType || Math.random() < 0.35))
    const totalWeight = filteredTypes.reduce((sum, entry) => sum + entry.weight, 0)
    let pick = Math.random() * (totalWeight || 1)
    let type = 'sun'
    for (const entry of filteredTypes) {
      pick -= entry.weight
      if (pick <= 0) {
        type = entry.type
        break
      }
    }

    let focusRadius = 1
    if (focusKey && focusKey.includes('/')) {
      const hit = byKey[focusKey]
      if (hit) {
        hit.mesh.getWorldPosition(focusPos)
        focusRadius = hit.radius
        type = 'moon'
      }
    } else if (type === 'moon') {
      const key = moonKeys[Math.floor(Math.random() * moonKeys.length)]
      const hit = byKey[key]
      if (!hit) return null
      hit.mesh.getWorldPosition(focusPos)
      focusRadius = hit.radius
      focusKey = key
    } else if (type === 'planet') {
      const key = planetKeys[Math.floor(Math.random() * planetKeys.length)]
      const hit = byKey[key]
      if (!hit) return null
      hit.mesh.getWorldPosition(focusPos)
      focusRadius = hit.radius
      focusKey = key
    } else if (type === 'sun') {
      if (!sunHit) return null
      sunHit.mesh.getWorldPosition(focusPos)
      focusRadius = sunHit.radius
      focusKey = 'Sun'
    } else if (type === 'asteroid' || type === 'kuiper') {
      const band = type === 'asteroid' ? orbitalBands?.asteroidBelt : orbitalBands?.kuiperBelt
      if (!band) return null
      const bandRadius = THREE.MathUtils.lerp(band.inner, band.outer, Math.random())
      const theta = Math.random() * Math.PI * 2
      focusPos.set(Math.cos(theta) * bandRadius, (Math.random() - 0.5) * (type === 'asteroid' ? 25 : 80), Math.sin(theta) * bandRadius)
      focusRadius = type === 'asteroid' ? 35 : 130
    } else {
      const radius = sceneConfig?.oortRadius ?? 3_300_000
      const spread = sceneConfig?.oortSpread ?? 550_000
      const dir = randomUnitVector()
      const r = radius + (Math.random() - 0.5) * spread
      focusPos.copy(dir).multiplyScalar(r)
      focusRadius = radius * 0.04
    }

    const dir = randomUnitVector()
    let surfaceBuffer
    if (type === 'moon') {
      surfaceBuffer = Math.max(focusRadius * (scientificMode ? 1.35 : 1.8), scientificMode ? 16 : 2.2)
    } else if (type === 'planet') {
      surfaceBuffer = Math.max(focusRadius * (scientificMode ? 1.6 : 2.1), scientificMode ? 60 : 4.2)
    } else if (type === 'sun') {
      surfaceBuffer = Math.max(focusRadius * (scientificMode ? 1.45 : 1.8), scientificMode ? 120 : 8)
    } else if (type === 'asteroid') {
      surfaceBuffer = scientificMode ? 250 : 20
    } else if (type === 'kuiper') {
      surfaceBuffer = scientificMode ? 950 : 60
    } else {
      surfaceBuffer = scientificMode ? 9_500 : 80
    }
    if (focusRadius <= 0) surfaceBuffer = scientificMode ? 180 : 8

    const earthNearSurfaceBuffer = MAP_ENTER_SURFACE_BUFFER + 0.36
    if (focusKey === 'Earth') {
      const earthStandOff = focusRadius + earthNearSurfaceBuffer + Math.random() * 0.12
      waypointPos.copy(focusPos).addScaledVector(dir, earthStandOff)
    } else {
      waypointPos.copy(focusPos).addScaledVector(dir, focusRadius + surfaceBuffer + Math.random() * surfaceBuffer * 0.85)
    }

    const earthHit = byKey.Earth
    if (earthHit) {
      earthHit.mesh.getWorldPosition(earthPos)
      const minEarthDistance = earthHit.radius + MAP_ENTER_SURFACE_BUFFER + 0.4
      const earthDistance = waypointPos.distanceTo(earthPos)
      if (earthDistance < minEarthDistance) {
        const away = waypointPos.sub(earthPos)
        if (away.lengthSq() < 1e-6) away.copy(camera.position).sub(earthPos)
        if (away.lengthSq() < 1e-6) away.set(1, 0.2, 0.4)
        away.normalize()
        waypointPos.copy(earthPos).addScaledVector(away, minEarthDistance + 0.06)
      }
    }

    return {
      focus: focusPos.clone(),
      waypoint: waypointPos.clone(),
      type,
      focusKey,
      arrivalDistance: focusKey === 'Earth'
        ? 0.42
        : type === 'moon'
          ? Math.max(focusRadius * (scientificMode ? 1.02 : 1.2), scientificMode ? 4 : 1.5)
          : Math.max(focusRadius * 1.24, scientificMode ? 45 : 6),
      orbitStrafe: THREE.MathUtils.randFloat(0.55, 0.95),
      orbitSpin: Math.random() < 0.5 ? -1 : 1
    }
  }, [bodyRefs, orbitalBands, sceneConfig, scientificMode, focusPos, randomUnitVector, waypointPos, earthPos])

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const eventName = 'solar:freeroam-input'
    const handler = (event) => applyScriptedInput(event.detail ?? {})

    window.addEventListener(eventName, handler)
    window.__solarFreeRoam = {
      simulate: applyScriptedInput,
      clear: clearScriptedInput
    }

    return () => {
      window.removeEventListener(eventName, handler)
      if (window.__solarFreeRoam?.simulate === applyScriptedInput) {
        delete window.__solarFreeRoam
      }
    }
  }, [applyScriptedInput, clearScriptedInput])

  useEffect(() => {
    if (!enabled || !keyboardEnabled) {
      pressedRef.current.clear()
      clearScriptedInput()
      return undefined
    }

    const isEditableTarget = (target) => {
      if (!(target instanceof HTMLElement)) return false
      if (target.isContentEditable) return true
      return ['INPUT', 'TEXTAREA', 'SELECT', 'OPTION'].includes(target.tagName)
    }

    const setKeyState = (event, isPressed) => {
      if (isEditableTarget(event.target)) return
      if (!keySets.all.has(event.code)) return

      if (isPressed) pressedRef.current.add(event.code)
      else pressedRef.current.delete(event.code)
      event.preventDefault()
    }

    const handleKeyDown = (event) => setKeyState(event, true)
    const handleKeyUp = (event) => setKeyState(event, false)

    window.addEventListener('keydown', handleKeyDown, { passive: false })
    window.addEventListener('keyup', handleKeyUp, { passive: false })

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      pressedRef.current.clear()
      clearScriptedInput()
    }
  }, [clearScriptedInput, enabled, keyboardEnabled, keySets])

  useEffect(() => {
    if (!enabled) {
      lookOffsetRef.current.yaw = 0
      lookOffsetRef.current.pitch = 0
      manualLookDeltaRef.current.yaw = 0
      manualLookDeltaRef.current.pitch = 0
      lookDragActiveRef.current = false
      autoStateRef.current.hasTarget = false
      autoStateRef.current.orbitTurnsProgress = 0
      autoStateRef.current.orbitTurnsTarget = 1
      autoStateRef.current.orbitPrevAzimuth = null
      autoSpeedRef.current = 0
      emitAutoRoamStatus(null)
      return undefined
    }
    if (!autoRoamEnabled) {
      autoStateRef.current.hasTarget = false
      autoStateRef.current.orbitTurnsProgress = 0
      autoStateRef.current.orbitTurnsTarget = 1
      autoStateRef.current.orbitPrevAzimuth = null
      autoSpeedRef.current = 0
      emitAutoRoamStatus(null)
    }

    const handleMouseDown = (event) => {
      const target = event.target
      if (target instanceof HTMLElement && target.closest('.side-drawer')) return
      if (event.button !== 0) return
      lookDragActiveRef.current = true
    }
    const handleMouseUp = (event) => {
      if (event.button !== 0) return
      lookDragActiveRef.current = false
    }

    const handleMouseMove = (event) => {
      if (!lookDragActiveRef.current) return
      const target = event.target
      if (target instanceof HTMLElement && target.closest('.side-drawer')) return
      const sensitivity = 0.0023
      if (autoRoamEnabled) {
        lookOffsetRef.current.yaw -= event.movementX * sensitivity
        lookOffsetRef.current.pitch -= event.movementY * sensitivity
        lookOffsetRef.current.pitch = THREE.MathUtils.clamp(lookOffsetRef.current.pitch, -1.25, 1.25)
      } else {
        manualLookDeltaRef.current.yaw -= event.movementX * sensitivity
        manualLookDeltaRef.current.pitch -= event.movementY * sensitivity
      }
    }

    window.addEventListener('mousedown', handleMouseDown, { passive: true })
    window.addEventListener('mouseup', handleMouseUp, { passive: true })
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => {
      window.removeEventListener('mousedown', handleMouseDown)
      window.removeEventListener('mouseup', handleMouseUp)
      window.removeEventListener('mousemove', handleMouseMove)
      lookDragActiveRef.current = false
      lookOffsetRef.current.yaw = 0
      lookOffsetRef.current.pitch = 0
      manualLookDeltaRef.current.yaw = 0
      manualLookDeltaRef.current.pitch = 0
    }
  }, [autoRoamEnabled, emitAutoRoamStatus, enabled])

  useFrame((state, delta) => {
    if (!enabled) return
    const controls = controlsRef.current
    if (!controls) return

    const pressed = pressedRef.current
    const scripted = scriptedRef.current
    const nowMs = performance.now()
    const autoState = autoStateRef.current
    const scriptedActive = nowMs <= scripted.untilMs
    const hasPressed = (codes) => {
      for (const code of codes) {
        if (pressed.has(code)) return true
      }
      return false
    }
    move.set(0, 0, 0)
    state.camera.getWorldDirection(forward)
    forward.normalize()

    if (autoRoamEnabled) {
      const shipForward = shipForwardRef.current
      if (shipForward.lengthSq() < 1e-6) shipForward.copy(forward)

      const speedFactor = THREE.MathUtils.clamp(autoRoamSpeed, 0.1, 1)
      const travelTimeoutMs = (scientificMode ? 48_000 : 16_000) / Math.max(speedFactor, 0.1)
      const travelTimedOut = autoState.hasTarget
        && autoState.mode === 'travel'
        && nowMs - autoState.travelStartedMs > travelTimeoutMs
      if (travelTimedOut) autoState.forceInnerNext = true

      const orbitReadyToDepart = autoState.hasTarget
        && autoState.mode === 'orbit'
        && nowMs >= autoState.holdUntilMs
        && autoState.orbitTurnsProgress >= autoState.orbitTurnsTarget
      const needsTarget = !autoState.hasTarget
        || travelTimedOut
        || orbitReadyToDepart
      if (needsTarget) {
        const next = chooseAutoRoamTarget(state.camera, {
          preferInner: autoState.forceInnerNext,
          previousType: autoState.targetType,
          preferredMoonParent: autoState.targetType === 'planet' ? autoState.focusKey : null
        })
        if (next) {
          autoState.hasTarget = true
          autoState.mode = 'travel'
          autoState.holdUntilMs = 0
          autoState.travelStartedMs = nowMs
          autoState.targetType = next.type
          autoState.focusKey = next.focusKey ?? null
          autoState.arrivalDistance = next.arrivalDistance
          autoState.orbitSpin = next.orbitSpin
          autoState.orbitStrafe = next.orbitStrafe
          autoState.orbitTurnsTarget = 1
          autoState.orbitTurnsProgress = 0
          autoState.orbitPrevAzimuth = null
          autoState.forceInnerNext = next.type === 'oort' || next.type === 'kuiper'
          focusPos.copy(next.focus)
          waypointPos.copy(next.waypoint)
        }
      }

      if (!autoState.hasTarget) {
        emitAutoRoamStatus({
          mode: 'acquiring',
          targetType: null,
          focusKey: null,
          targetLabel: 'Acquiring next waypoint',
          distance: Number.NaN,
          etaSeconds: Number.NaN,
          holdRemainingSeconds: 0,
          orbitTurnsProgress: 0,
          orbitTurnsTarget: 0
        }, nowMs)
      }

      if (autoState.hasTarget) {
        targetPos.copy(autoState.mode === 'travel' ? waypointPos : focusPos)
        targetDir.copy(targetPos).sub(state.camera.position)
        const targetDistance = targetDir.length()

        if (autoState.mode === 'travel' && targetDistance <= autoState.arrivalDistance) {
          autoState.mode = 'orbit'
          autoState.holdUntilMs = nowMs + (
            (autoState.targetType === 'moon' || autoState.targetType === 'planet')
              ? THREE.MathUtils.randInt(10_000, 22_000)
              : THREE.MathUtils.randInt(4_000, 9_000)
          )
          autoState.orbitTurnsTarget = (autoState.targetType === 'moon' || autoState.targetType === 'planet')
            ? THREE.MathUtils.randFloat(1.35, 3.35)
            : autoState.targetType === 'sun'
              ? THREE.MathUtils.randFloat(0.75, 1.75)
              : THREE.MathUtils.randFloat(0.45, 1.1)
          autoState.orbitTurnsProgress = 0
          radialDir.copy(state.camera.position).sub(focusPos)
          autoState.orbitPrevAzimuth = Math.atan2(radialDir.z, radialDir.x)
        }

        if (autoState.mode === 'travel') {
          if (targetDistance > 1e-4) desiredDir.copy(targetDir).divideScalar(targetDistance)
          else desiredDir.copy(shipForward)
        } else {
          radialDir.copy(state.camera.position).sub(focusPos)
          if (radialDir.lengthSq() < 1e-6) radialDir.copy(randomUnitVector())
          radialDir.normalize()

          const orbitAzimuth = Math.atan2(radialDir.z, radialDir.x)
          if (typeof autoState.orbitPrevAzimuth === 'number') {
            let deltaAzimuth = orbitAzimuth - autoState.orbitPrevAzimuth
            while (deltaAzimuth > Math.PI) deltaAzimuth -= Math.PI * 2
            while (deltaAzimuth < -Math.PI) deltaAzimuth += Math.PI * 2
            autoState.orbitTurnsProgress += Math.abs(deltaAzimuth) / (Math.PI * 2)
          }
          autoState.orbitPrevAzimuth = orbitAzimuth

          tangentDir.crossVectors(worldUp, radialDir)
          if (tangentDir.lengthSq() < 1e-6) tangentDir.crossVectors(axisX, radialDir)
          tangentDir.normalize().multiplyScalar(autoState.orbitSpin)

          desiredDir.copy(tangentDir).multiplyScalar(0.82)
          desiredDir.addScaledVector(radialDir, -0.34)
          desiredDir.normalize()
        }

        shipForward.lerp(desiredDir, THREE.MathUtils.clamp(delta * 1.7, 0.03, 0.24))
        if (shipForward.lengthSq() < 1e-6) shipForward.copy(desiredDir)
        shipForward.normalize()

        shipRight.crossVectors(shipForward, worldUp)
        if (shipRight.lengthSq() < 1e-6) shipRight.set(1, 0, 0)
        shipRight.normalize()
        shipUp.crossVectors(shipRight, shipForward).normalize()

        move.copy(shipForward)
        if (autoState.mode === 'orbit') {
          move.addScaledVector(shipRight, autoState.orbitStrafe * 0.22)
          move.addScaledVector(shipUp, Math.sin(nowMs * 0.00043) * 0.05)
        }
        move.normalize()

        const travelSpeed = scientificMode
          ? THREE.MathUtils.clamp(targetDistance * 0.11, 22, 32_000)
          : THREE.MathUtils.clamp(targetDistance * 0.13, 2.2, 780)
        const orbitSpeed = scientificMode
          ? THREE.MathUtils.clamp(targetDistance * 0.05, 6, 4_200)
          : THREE.MathUtils.clamp(targetDistance * 0.045, 0.7, 48)
        const closeBodySlowdown = (autoState.targetType === 'planet' || autoState.targetType === 'moon')
          ? THREE.MathUtils.clamp(targetDistance / (autoState.arrivalDistance * 3.2), 0.28, 1)
          : 1
        const targetSpeedPerSecond = (autoState.mode === 'travel' ? travelSpeed : orbitSpeed) * speedFactor * closeBodySlowdown
        autoSpeedRef.current = THREE.MathUtils.damp(
          autoSpeedRef.current,
          targetSpeedPerSecond,
          autoState.mode === 'travel' ? 1.9 : 2.6,
          delta
        )
        const requestedStep = autoSpeedRef.current * delta
        const maxTravelStep = Math.max(targetDistance * 0.32, autoState.arrivalDistance * 0.22)
        const safeStep = autoState.mode === 'travel'
          ? Math.min(requestedStep, maxTravelStep)
          : requestedStep
        step.copy(move).multiplyScalar(safeStep)
        state.camera.position.add(step)

        const targetLabel = describeRoamTarget(autoState.targetType, autoState.focusKey)
        const holdRemainingSeconds = Math.max(0, (autoState.holdUntilMs - nowMs) / 1000)
        const speedPerSecond = autoSpeedRef.current
        const etaSeconds = autoState.mode === 'travel'
          ? (speedPerSecond > 1e-3 ? targetDistance / speedPerSecond : Number.NaN)
          : holdRemainingSeconds
        emitAutoRoamStatus({
          mode: autoState.mode,
          targetType: autoState.targetType,
          focusKey: autoState.focusKey ?? null,
          targetLabel,
          distance: targetDistance,
          etaSeconds,
          holdRemainingSeconds,
          orbitTurnsProgress: autoState.orbitTurnsProgress,
          orbitTurnsTarget: autoState.orbitTurnsTarget
        }, nowMs)

        if (bodyRefs?.current?.Earth) {
          const earthHit = bodyRefs.current.Earth
          earthHit.mesh.getWorldPosition(earthPos)
          const minEarthDistance = earthHit.radius + MAP_ENTER_SURFACE_BUFFER + 0.34
          const currentEarthDistance = state.camera.position.distanceTo(earthPos)
          if (currentEarthDistance < minEarthDistance) {
            targetDir.copy(state.camera.position).sub(earthPos)
            if (targetDir.lengthSq() < 1e-6) targetDir.set(1, 0.2, 0.6)
            targetDir.normalize()
            const correction = minEarthDistance - currentEarthDistance + 0.02
            state.camera.position.addScaledVector(targetDir, correction)
          }
        }

        if (autoState.mode === 'travel') {
          const nearApproach = targetDistance < autoState.arrivalDistance * 5
          if (nearApproach) lookBaseDir.copy(focusPos).sub(state.camera.position)
          else lookBaseDir.copy(shipForward)
        } else {
          lookBaseDir.copy(focusPos).sub(state.camera.position)
        }
        if (lookBaseDir.lengthSq() < 1e-6) lookBaseDir.copy(shipForward)
        else lookBaseDir.normalize()
        desiredDir.copy(lookBaseDir).multiplyScalar(-1)
        shipMatrix.makeBasis(shipRight, shipUp, desiredDir)
        shipQuat.setFromRotationMatrix(shipMatrix)
        lookEuler.set(lookOffsetRef.current.pitch, lookOffsetRef.current.yaw, 0)
        lookQuat.setFromEuler(lookEuler)
        state.camera.quaternion.copy(shipQuat).multiply(lookQuat)
        state.camera.getWorldDirection(lookDir)

        const lookDistance = Math.max(
          state.camera.position.distanceTo(focusPos),
          scientificMode ? 45 : 6
        )
        controls.target.copy(state.camera.position).addScaledVector(lookDir, lookDistance)
        controls.update()
        return
      }
    }

    let yawDelta = 0
    let pitchDelta = 0

    if (scriptedActive) {
      yawDelta += scripted.yaw * delta
      pitchDelta += scripted.pitch * delta
    }
    yawDelta += manualLookDeltaRef.current.yaw
    pitchDelta += manualLookDeltaRef.current.pitch
    manualLookDeltaRef.current.yaw = 0
    manualLookDeltaRef.current.pitch = 0

    if (yawDelta !== 0 || pitchDelta !== 0) {
      viewEuler.setFromQuaternion(state.camera.quaternion)
      viewEuler.y += yawDelta
      viewEuler.x = THREE.MathUtils.clamp(viewEuler.x + pitchDelta, -1.55, 1.55)
      state.camera.quaternion.setFromEuler(viewEuler)

      state.camera.getWorldDirection(lookDir)
      const targetDistance = Math.max(state.camera.position.distanceTo(controls.target), 1)
      controls.target.copy(state.camera.position).addScaledVector(lookDir, targetDistance)
    }

    state.camera.getWorldDirection(forward)
    forward.normalize()
    right.crossVectors(forward, state.camera.up)
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0)
    right.normalize()
    up.copy(state.camera.up).normalize()

    if (hasPressed(keySets.forward)) move.add(forward)
    if (hasPressed(keySets.backward)) move.sub(forward)
    if (hasPressed(keySets.right)) move.add(right)
    if (hasPressed(keySets.left)) move.sub(right)
    if (hasPressed(keySets.up)) move.add(up)
    if (hasPressed(keySets.down)) move.sub(up)

    if (scriptedActive) {
      move.addScaledVector(forward, scripted.forward)
      move.addScaledVector(right, scripted.right)
      move.addScaledVector(up, scripted.up)
    }

    if (move.lengthSq() < 1e-8) {
      controls.update()
      return
    }
    move.normalize()

    const cameraRadius = state.camera.position.length()
    const baseSpeed = scientificMode
      ? THREE.MathUtils.clamp(cameraRadius * 0.0024, 25, 15_000)
      : THREE.MathUtils.clamp(cameraRadius * 0.08, 3, 180)
    const keyboardBoost = hasPressed(keySets.turbo) ? 2.5 : 1
    const scriptedBoost = scriptedActive ? scripted.boost : 1
    const boost = keyboardBoost * scriptedBoost
    const distance = baseSpeed * boost * delta

    step.copy(move).multiplyScalar(distance)
    state.camera.position.add(step)
    controls.target.add(step)
    controls.update()
  })

  return null
}

function Sun({ sunData, onSelect, registerBodyRef, scientificMode = false }) {
  const sunGroupRef = useRef()
  const coreRef = useRef()
  const sunTexture = useTexture(sunData.texture)

  useEffect(() => {
    configureTexture(sunTexture)
  }, [sunTexture])

  useFrame((_, delta) => {
    if (coreRef.current) coreRef.current.rotation.y += delta * 0.14
    if (sunGroupRef.current) sunGroupRef.current.rotation.y += delta * 0.05
  })

  return (
    <group ref={sunGroupRef}>
      <pointLight
        intensity={18.2}
        distance={220_000}
        color={'#ffecad'}
        decay={0.98}
        castShadow
      />
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
        <meshStandardMaterial
          color={new THREE.Color('#fff4d2')}
          map={sunTexture}
          emissive={new THREE.Color('#ffd978')}
          emissiveMap={sunTexture}
          emissiveIntensity={7.1}
          roughness={0.78}
          metalness={0}
        />
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
  lockPlanetFocus,
  freeRoamEnabled,
  autoRoamEnabled,
  autoRoamSpeed,
  onAutoRoamStatus,
  freezeMoonOrbitKey
}) {
  const bodyRefs = useRef({})
  const controlsRef = useRef()
  const asteroidRef = useRef()
  const asteroidMaterialRef = useRef()
  const kuiperRef = useRef()
  const kuiperMaterialRef = useRef()
  const oortRef = useRef()
  const oortMaterialRef = useRef()

  const registerBodyRef = (name, mesh, radius) => {
    if (!mesh) return
    bodyRefs.current[name] = { mesh, radius }
  }

  const earthPos = useMemo(() => new THREE.Vector3(), [])
  const controlsMaxDistance = scientificMode
    ? ((!followSelected || !selectedTargetKey || selectedTargetKey === 'Sun')
        ? sceneConfig.controlsMaxDistanceSun
        : sceneConfig.controlsMaxDistancePlanet)
    : sceneConfig.controlsMaxDistance
  const sceneVariantKey = scientificMode ? 'scientific' : 'fun'
  const scientificFieldKey = `${sceneVariantKey}-field-${sceneConfig.scientificStarFieldCount ?? 0}-${sceneConfig.scientificStarFieldSizeMultiplier ?? 1}-${sceneConfig.scientificStarFieldBrightnessMultiplier ?? 1}`
  const shellKey = `${sceneVariantKey}-shell-${sceneConfig.starShellCount}-${sceneConfig.starShellRadius}`
  const deepSpaceKey = `${sceneVariantKey}-deep-${sceneConfig.deepSpaceCount}-${sceneConfig.deepSpaceRadius}-${sceneConfig.deepSpaceSpread}`
  const starsKey = `${sceneVariantKey}-stars-${sceneConfig.starsCount}-${sceneConfig.starsRadius}-${sceneConfig.starsDepth}-${sceneConfig.starsFactor}`

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

    if (scientificMode) {
      const cameraRadius = state.camera.position.length()
      const focusKey = selectedTargetKey || selectedName || 'Sun'
      const focusPlanet = focusKey.includes('/') ? focusKey.split('/')[0] : focusKey
      const innerFocus = INNER_SYSTEM_PLANETS.includes(focusPlanet)

      const asteroidZoom = THREE.MathUtils.smoothstep(cameraRadius, 2_600, 18_000)
      const kuiperZoom = THREE.MathUtils.smoothstep(cameraRadius, 11_000, 74_000)
      const oortZoom = THREE.MathUtils.smoothstep(cameraRadius, 110_000, 1_800_000)

      const asteroidInnerLift = innerFocus ? THREE.MathUtils.smoothstep(cameraRadius, 9_000, 30_000) : 1
      const kuiperInnerLift = innerFocus ? THREE.MathUtils.smoothstep(cameraRadius, 22_000, 100_000) : 1

      const asteroidVisibility = THREE.MathUtils.clamp(asteroidZoom * asteroidInnerLift, 0, 1)
      const kuiperVisibility = THREE.MathUtils.clamp(kuiperZoom * kuiperInnerLift, 0, 1)
      const oortVisibility = THREE.MathUtils.clamp(oortZoom, 0, 1)

      if (asteroidMaterialRef.current) {
        asteroidMaterialRef.current.opacity = (sceneConfig.asteroidOpacity ?? 0.08) * asteroidVisibility
        asteroidMaterialRef.current.size = sceneConfig.asteroidSize * (0.56 + asteroidVisibility * 0.44)
      }
      if (kuiperMaterialRef.current) {
        kuiperMaterialRef.current.opacity = (sceneConfig.kuiperOpacity ?? 0.06) * kuiperVisibility
        kuiperMaterialRef.current.size = sceneConfig.kuiperSize * (0.52 + kuiperVisibility * 0.48)
      }
      if (oortMaterialRef.current) {
        oortMaterialRef.current.opacity = (sceneConfig.oortOpacity ?? 0.04) * oortVisibility
        oortMaterialRef.current.size = (sceneConfig.oortSize ?? 1.1) * (0.76 + oortVisibility * 0.42)
      }
    }

    if (freezeSolarOrbits) return
    if (asteroidRef.current) asteroidRef.current.rotation.y += delta * 0.012 * speedScale
    if (kuiperRef.current) kuiperRef.current.rotation.y += delta * 0.004 * speedScale
    if (oortRef.current) oortRef.current.rotation.y += delta * 0.0012 * speedScale
  })

  return (
    <>
      <ambientLight intensity={scientificMode ? 0.64 : 0.5} />
      <hemisphereLight args={['#8fb5ff', '#1b1f2b', scientificMode ? 0.3 : 0.22]} />
      {scientificMode ? (
        <ScientificStarField
          key={scientificFieldKey}
          radius={sceneConfig.scientificStarFieldRadius}
          count={sceneConfig.scientificStarFieldCount}
          opacity={sceneConfig.scientificStarFieldOpacity}
          twinkleSpeed={sceneConfig.scientificStarFieldTwinkleSpeed}
          twinkleAmount={sceneConfig.scientificStarFieldTwinkleAmount}
          sizeMultiplier={sceneConfig.scientificStarFieldSizeMultiplier}
          brightnessMultiplier={sceneConfig.scientificStarFieldBrightnessMultiplier}
        />
      ) : null}
      <CameraLockedStarShell
        key={shellKey}
        radius={sceneConfig.starShellRadius}
        count={sceneConfig.starShellCount}
        color={sceneConfig.starShellColor}
        opacity={sceneConfig.starShellOpacity}
        size={sceneConfig.starShellSize}
      />
      <CameraLockedGalacticBand
        key={`${shellKey}-band`}
        radius={sceneConfig.starShellRadius}
        count={Math.floor(sceneConfig.starShellCount * 0.75)}
        thickness={sceneConfig.galacticBandThickness}
        color={sceneConfig.galacticBandColor}
        opacity={sceneConfig.galacticBandOpacity}
        size={sceneConfig.galacticBandSize}
      />
      {sceneConfig.nebulaOpacity > 0 ? (
        <CameraLockedNebula
          key={`${shellKey}-nebula`}
          radius={sceneConfig.starShellRadius}
          count={Math.floor(sceneConfig.starShellCount * 0.7)}
          opacity={sceneConfig.nebulaOpacity}
          size={sceneConfig.nebulaSize}
        />
      ) : null}
      <DeepSpaceField
        key={deepSpaceKey}
        radius={sceneConfig.deepSpaceRadius}
        spread={sceneConfig.deepSpaceSpread}
        count={sceneConfig.deepSpaceCount}
        color={sceneConfig.deepSpaceColor}
        opacity={sceneConfig.deepSpaceOpacity}
        size={sceneConfig.deepSpaceSize}
      />
      <Stars
        key={starsKey}
        radius={sceneConfig.starsRadius}
        depth={sceneConfig.starsDepth}
        count={sceneConfig.starsCount}
        factor={sceneConfig.starsFactor}
        saturation={0}
        toneMapped={false}
        fade
        speed={sceneConfig.starsSpeed}
      />

      <Sun sunData={systemBodies.sun} onSelect={setSelectedName} registerBodyRef={registerBodyRef} scientificMode={scientificMode} />

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
          freezeMoonOrbitKey={freezeMoonOrbitKey}
          scientificMode={scientificMode}
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
          opacity={scientificMode ? (sceneConfig.asteroidOpacity ?? 0.2) : 0.72}
          size={sceneConfig.asteroidSize}
          materialRef={asteroidMaterialRef}
        />
      </group>

      <group ref={kuiperRef} rotation={[0.08, 0.18, 0]}>
        <Belt
          count={sceneConfig.kuiperCount}
          innerRadius={systemOrbitalBands.kuiperBelt.inner}
          outerRadius={systemOrbitalBands.kuiperBelt.outer}
          thickness={sceneConfig.kuiperThickness}
          color="#95afcf"
          opacity={scientificMode ? (sceneConfig.kuiperOpacity ?? 0.12) : 0.34}
          size={sceneConfig.kuiperSize}
          materialRef={kuiperMaterialRef}
        />
      </group>

      <group ref={oortRef} rotation={[0.2, 0.4, 0.1]}>
        <OortCloud
          radius={sceneConfig.oortRadius}
          spread={sceneConfig.oortSpread}
          count={sceneConfig.oortCount}
          opacity={scientificMode ? (sceneConfig.oortOpacity ?? 0.07) : 0.18}
          size={scientificMode ? (sceneConfig.oortSize ?? 0.9) : 1.2}
          sizeAttenuation={!scientificMode}
          materialRef={oortMaterialRef}
        />
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
      <FreeRoamController
        enabled={freeRoamEnabled || autoRoamEnabled}
        keyboardEnabled={freeRoamEnabled}
        autoRoamEnabled={autoRoamEnabled}
        autoRoamSpeed={autoRoamSpeed}
        scientificMode={scientificMode}
        controlsRef={controlsRef}
        bodyRefs={bodyRefs}
        orbitalBands={systemOrbitalBands}
        sceneConfig={sceneConfig}
        onAutoRoamStatus={onAutoRoamStatus}
      />

      <OrbitControls
        ref={controlsRef}
        enabled={!autoRoamEnabled && !freeRoamEnabled}
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
  const [scientificStarDensity, setScientificStarDensity] = useState('high')
  const scientificMode = experienceMode === 'scientific'
  const activeBaseBodies = scientificMode ? scientificBodies : bodies
  const activeOrbitalBands = scientificMode ? scientificOrbitalBands : orbitalBands
  const activeSceneConfig = useMemo(
    () => (scientificMode ? buildScientificSceneConfig(scientificStarDensity) : FUN_SCENE_CONFIG),
    [scientificMode, scientificStarDensity]
  )
  const activeBodies = activeBaseBodies

  const startupOrbitAngles = useMemo(
    () => getStartupOrbitAngles(activeBodies.planets),
    [activeBodies]
  )
  const startupSpinAngles = useMemo(() => getStartupSpinAngles(activeBodies.planets), [activeBodies])
  const moonStartupAngles = useMemo(
    () => (scientificMode
      ? getScientificMoonOrbitState(activeBodies.planets)
      : getStartupMoonOrbitAngles(activeBodies.planets)),
    [activeBodies, scientificMode]
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
  const [freeRoamEnabled, setFreeRoamEnabled] = useState(false)
  const [autoRoamEnabled, setAutoRoamEnabled] = useState(false)
  const [autoRoamSpeed, setAutoRoamSpeed] = useState(0.2)
  const [autoRoamStatus, setAutoRoamStatus] = useState(null)
  const [roamTrackerCollapsed, setRoamTrackerCollapsed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
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
  const scientificMoonFreezeKey = (
    scientificMode
    && autoRoamEnabled
    && autoRoamStatus?.targetType === 'moon'
    && typeof autoRoamStatus.focusKey === 'string'
  )
    ? autoRoamStatus.focusKey
    : null

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
    setFreeRoamEnabled(false)
    setAutoRoamEnabled(false)
    setSelectedMoonKey(null)
    setSelectedName(name)
    setCameraMode('focus')
    setFollowSelected(true)
  }

  const jumpToMoon = (moonKey) => {
    setFreeRoamEnabled(false)
    setAutoRoamEnabled(false)
    const [planetName] = moonKey.split('/')
    setSelectedName(planetName)
    setSelectedMoonKey(moonKey)
    setCameraMode('focus')
    setFollowSelected(true)
  }

  const goHome = () => {
    setFreeRoamEnabled(false)
    setAutoRoamEnabled(false)
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
      if (autoRoamEnabled) return
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
    [autoRoamEnabled, cameraMode, selectedMoonKey, selectedTargetKey, viewMode]
  )

  useEffect(() => {
    setFreeRoamEnabled(false)
    setAutoRoamEnabled(false)
    setAutoRoamStatus(null)
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
    if (!scientificMode || !autoRoamEnabled) {
      setAutoRoamStatus(null)
      setRoamTrackerCollapsed(false)
    }
  }, [autoRoamEnabled, scientificMode])

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
                <p className="hud-eyebrow">Navigation Console</p>
                <h1>Solar System Explorer</h1>
                <p>Navigate planets and moons, then transition between deep-space and Earth map mode.</p>
              </div>

              <section className="control-cluster">
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
                {scientificMode ? (
                  <>
                    <label htmlFor="scientificStarDensity">Scientific Star Density</label>
                    <select
                      id="scientificStarDensity"
                      className="selector-input"
                      value={scientificStarDensity}
                      onChange={(e) => setScientificStarDensity(e.target.value)}
                    >
                      {SCIENTIFIC_STAR_DENSITY_ORDER.map((densityKey) => (
                        <option key={densityKey} value={densityKey}>
                          {SCIENTIFIC_STAR_DENSITY_PRESETS[densityKey].label}
                        </option>
                      ))}
                    </select>
                  </>
                ) : null}
              </section>

              <section className="control-cluster">
                <p className="cluster-title">Simulation</p>
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
              </section>

              <section className="control-cluster">
                <p className="cluster-title">Navigation</p>
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
              </section>

              <section className="control-cluster">
                <p className="cluster-title">Actions</p>
                <div className="hud-buttons">
                  <button type="button" onClick={goHome}>
                    Full System View
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFreeRoamEnabled((prev) => {
                        const next = !prev
                        if (next) {
                          setAutoRoamEnabled(false)
                          setSelectedMoonKey(null)
                          setSelectedName(null)
                          setFollowSelected(false)
                          setCameraMode(null)
                        }
                        return next
                      })
                    }}
                  >
                    {freeRoamEnabled ? 'Disable Free Explore' : 'Enable Free Explore'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAutoRoamEnabled((prev) => {
                        const next = !prev
                        if (next) {
                          setFreeRoamEnabled(false)
                          setSelectedMoonKey(null)
                          setSelectedName(null)
                          setFollowSelected(false)
                          setCameraMode(null)
                        }
                        return next
                      })
                    }}
                  >
                    {autoRoamEnabled ? 'Disable Free Roam Mode' : 'Enable Free Roam Mode'}
                  </button>
                  <button type="button" onClick={() => setShowOrbitLines((prev) => !prev)}>
                    {showOrbitLines ? 'Hide Orbital Lines' : 'Show Orbital Lines'}
                  </button>
                </div>
                {freeRoamEnabled ? (
                  <p className="hud-note">
                    Free Explore controls: <code>W/A/S/D</code> or arrows, <code>Q/E</code> for down/up, <code>Shift</code> to boost.
                  </p>
                ) : null}
                {autoRoamEnabled ? (
                  <>
                    <label htmlFor="autoRoamSpeed">Free Roam Speed: {autoRoamSpeed.toFixed(1)}x</label>
                    <input
                      id="autoRoamSpeed"
                      type="range"
                      min="0.1"
                      max="1.0"
                      step="0.1"
                      value={autoRoamSpeed}
                      onChange={(e) => setAutoRoamSpeed(Number(e.target.value))}
                    />
                    <p className="hud-note">
                      Free Roam Mode autonomously traverses planets, moons, and outer regions while keeping a safe Earth clearance.
                      Hold left click and drag to look around without changing trajectory.
                    </p>
                  </>
                ) : null}
              </section>
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
      {scientificMode && autoRoamEnabled ? (
        <div className={`roam-overlay ${roamTrackerCollapsed ? 'collapsed' : ''}`}>
          <button
            type="button"
            className="roam-overlay-toggle"
            onClick={() => setRoamTrackerCollapsed((prev) => !prev)}
            aria-expanded={!roamTrackerCollapsed}
            aria-label={roamTrackerCollapsed ? 'Show scientific roam tracker' : 'Collapse scientific roam tracker'}
          >
            {roamTrackerCollapsed ? 'Show Tracker' : 'Hide Tracker'}
          </button>
          {!roamTrackerCollapsed ? (
            <div className="roam-overlay-panel" role="status" aria-live="polite">
              <p className="roam-overlay-title">Scientific Roam Tracker</p>
              {autoRoamStatus ? (
                <>
                  <p>
                    <strong>{autoRoamStatus.mode === 'travel'
                      ? 'Heading To'
                      : autoRoamStatus.mode === 'orbit'
                        ? 'Orbiting'
                        : 'Status'}:</strong>{' '}
                    {autoRoamStatus.targetLabel}
                  </p>
                  {autoRoamStatus.mode !== 'acquiring' ? (
                    <p><strong>Distance:</strong> {formatRoamDistance(autoRoamStatus.distance)}</p>
                  ) : null}
                  {autoRoamStatus.mode !== 'acquiring' ? (
                    <p>
                      <strong>{autoRoamStatus.mode === 'travel' ? 'Arrival ETA' : 'Departure ETA'}:</strong>{' '}
                      {formatRoamEta(
                        autoRoamStatus.mode === 'travel'
                          ? autoRoamStatus.etaSeconds
                          : autoRoamStatus.holdRemainingSeconds
                      )}
                    </p>
                  ) : null}
                  {autoRoamStatus.mode === 'orbit' ? (
                    <p>
                      <strong>Orbit Progress:</strong>{' '}
                      {autoRoamStatus.orbitTurnsProgress.toFixed(1)} / {autoRoamStatus.orbitTurnsTarget.toFixed(1)} turns
                    </p>
                  ) : null}
                </>
              ) : (
                <p><strong>Status:</strong> Acquiring next waypoint...</p>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
      {freeRoamEnabled && viewMode === 'space' ? (
        <div className="free-explore-overlay" aria-hidden="true">
          <p className="free-explore-title">Free Explore</p>
          <div className="free-explore-keys">
            <span className="free-explore-spacer" />
            <span className="free-explore-key">W</span>
            <span className="free-explore-spacer" />
            <span className="free-explore-key">A</span>
            <span className="free-explore-key">S</span>
            <span className="free-explore-key">D</span>
          </div>
          <p className="free-explore-note">Move with W A S D</p>
        </div>
      ) : null}
      <div className={`space-stage ${viewMode === 'map' ? 'inactive' : ''}`}>
        <Canvas
          key={`space-canvas-${experienceMode}-${scientificMode ? scientificStarDensity : 'fun'}`}
          camera={{
            position: [earthStartX + earthStartRadius * 2, earthStartRadius * 0.76, earthStartZ + earthStartRadius * 2],
            fov: 52,
            near: scientificMode ? 1 : 0.1,
            far: activeSceneConfig.canvasFar
          }}
          gl={{ antialias: true }}
          onCreated={({ gl }) => {
            gl.outputColorSpace = THREE.SRGBColorSpace
            gl.toneMapping = THREE.ACESFilmicToneMapping
            gl.toneMappingExposure = scientificMode ? 1.08 : 1.0
            gl.physicallyCorrectLights = true
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
            freeRoamEnabled={freeRoamEnabled}
            autoRoamEnabled={autoRoamEnabled}
            autoRoamSpeed={autoRoamSpeed}
            onAutoRoamStatus={scientificMode && autoRoamEnabled ? setAutoRoamStatus : undefined}
            freezeMoonOrbitKey={scientificMoonFreezeKey}
          />
          <BloomPostProcessing
            enabled
            bloomStrength={activeSceneConfig.bloomStrength}
            bloomRadius={activeSceneConfig.bloomRadius}
            bloomThreshold={activeSceneConfig.bloomThreshold}
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
