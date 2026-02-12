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
  lockPlanetFocus
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
    ? (selectedTargetKey === 'Sun' ? sceneConfig.controlsMaxDistanceSun : sceneConfig.controlsMaxDistancePlanet)
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
      const focusKey = selectedTargetKey || selectedName || 'Earth'
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
