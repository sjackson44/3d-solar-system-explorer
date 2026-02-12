const HORIZONS_BASE_URL = 'https://ssd.jpl.nasa.gov/api/horizons.api'

const TARGETS = [
  { name: 'Sun', command: '10', center: '500@0', type: 'star' },
  { name: 'Mercury', command: '199', center: '500@10', type: 'planet', parent: 'Sun' },
  { name: 'Venus', command: '299', center: '500@10', type: 'planet', parent: 'Sun' },
  { name: 'Earth', command: '399', center: '500@10', type: 'planet', parent: 'Sun' },
  { name: 'Mars', command: '499', center: '500@10', type: 'planet', parent: 'Sun' },
  { name: 'Jupiter', command: '599', center: '500@10', type: 'planet', parent: 'Sun' },
  { name: 'Saturn', command: '699', center: '500@10', type: 'planet', parent: 'Sun' },
  { name: 'Uranus', command: '799', center: '500@10', type: 'planet', parent: 'Sun' },
  { name: 'Neptune', command: '899', center: '500@10', type: 'planet', parent: 'Sun' },
  { name: 'Pluto', command: '999', center: '500@10', type: 'planet', parent: 'Sun' },
  { name: 'Moon', command: '301', center: '500@399', type: 'moon', parent: 'Earth' },
  { name: 'Phobos', command: '401', center: '500@499', type: 'moon', parent: 'Mars' },
  { name: 'Deimos', command: '402', center: '500@499', type: 'moon', parent: 'Mars' },
  { name: 'Io', command: '501', center: '500@599', type: 'moon', parent: 'Jupiter' },
  { name: 'Europa', command: '502', center: '500@599', type: 'moon', parent: 'Jupiter' },
  { name: 'Ganymede', command: '503', center: '500@599', type: 'moon', parent: 'Jupiter' },
  { name: 'Callisto', command: '504', center: '500@599', type: 'moon', parent: 'Jupiter' },
  { name: 'Titan', command: '606', center: '500@699', type: 'moon', parent: 'Saturn' },
  { name: 'Enceladus', command: '602', center: '500@699', type: 'moon', parent: 'Saturn' },
  { name: 'Rhea', command: '605', center: '500@699', type: 'moon', parent: 'Saturn' },
  { name: 'Iapetus', command: '608', center: '500@699', type: 'moon', parent: 'Saturn' },
  { name: 'Titania', command: '703', center: '500@799', type: 'moon', parent: 'Uranus' },
  { name: 'Oberon', command: '704', center: '500@799', type: 'moon', parent: 'Uranus' },
  { name: 'Umbriel', command: '702', center: '500@799', type: 'moon', parent: 'Uranus' },
  { name: 'Ariel', command: '701', center: '500@799', type: 'moon', parent: 'Uranus' },
  { name: 'Miranda', command: '705', center: '500@799', type: 'moon', parent: 'Uranus' },
  { name: 'Triton', command: '801', center: '500@899', type: 'moon', parent: 'Neptune' },
  { name: 'Nereid', command: '802', center: '500@899', type: 'moon', parent: 'Neptune' },
  { name: 'Proteus', command: '808', center: '500@899', type: 'moon', parent: 'Neptune' },
  { name: 'Larissa', command: '807', center: '500@899', type: 'moon', parent: 'Neptune' },
  { name: 'Charon', command: '901', center: '500@999', type: 'moon', parent: 'Pluto' }
]

let cachedResponse = null
let cachedAtMs = 0
const CACHE_TTL_MS = 10 * 60 * 1000

function horizonsUrl(command, center, startIso, stopIso) {
  const query = new URLSearchParams({
    format: 'json',
    EPHEM_TYPE: 'VECTORS',
    COMMAND: `'${command}'`,
    CENTER: `'${center}'`,
    START_TIME: `'${startIso}'`,
    STOP_TIME: `'${stopIso}'`,
    STEP_SIZE: "'1 h'"
  })
  return `${HORIZONS_BASE_URL}?${query.toString()}`
}

function parseVector(resultText) {
  const vecMatch = resultText.match(/X\s*=\s*([+\-0-9.E]+)\s+Y\s*=\s*([+\-0-9.E]+)\s+Z\s*=\s*([+\-0-9.E]+)/)
  if (!vecMatch) return null
  return {
    x: Number(vecMatch[1]),
    y: Number(vecMatch[2]),
    z: Number(vecMatch[3])
  }
}

function parseRadiusKm(resultText) {
  const radiusPatterns = [
    /Vol\.\s*Mean Radius\s*\(km\)\s*=\s*([0-9.]+)/i,
    /Vol\.\s*mean radius,\s*km\s*=\s*([0-9.]+)/i,
    /Mean radius,\s*km\s*=\s*([0-9.]+)/i,
    /Radius\s*\(IAU\),\s*km\s*=\s*([0-9.]+)/i
  ]
  for (const pattern of radiusPatterns) {
    const match = resultText.match(pattern)
    if (match) return Number(match[1])
  }
  return null
}

async function fetchTargetSnapshot(target, startIso, stopIso) {
  let lastError = null

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const response = await fetch(horizonsUrl(target.command, target.center, startIso, stopIso))
      if (!response.ok) throw new Error(`Horizons request failed for ${target.name}: ${response.status}`)
      const payload = await response.json()
      const result = String(payload.result || '')
      const vector = parseVector(result)
      const radiusKm = parseRadiusKm(result)
      return {
        ...target,
        radiusKm,
        vector
      }
    } catch (error) {
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, 120 * (attempt + 1)))
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Horizons request failed for ${target.name}`)
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const now = Date.now()
  if (cachedResponse && now - cachedAtMs < CACHE_TTL_MS) {
    res.status(200).json(cachedResponse)
    return
  }

  const start = new Date()
  start.setSeconds(0, 0)
  const stop = new Date(start.getTime() + 60 * 60 * 1000)
  const startIso = start.toISOString().slice(0, 16).replace('T', ' ')
  const stopIso = stop.toISOString().slice(0, 16).replace('T', ' ')

  try {
    const settled = []
    for (const target of TARGETS) {
      try {
        const value = await fetchTargetSnapshot(target, startIso, stopIso)
        settled.push({ status: 'fulfilled', value })
      } catch (error) {
        settled.push({ status: 'rejected', reason: error })
      }
    }
    const bodyMap = {}
    settled.forEach((result) => {
      if (result.status !== 'fulfilled') return
      const entry = result.value
      bodyMap[entry.name] = {
        type: entry.type,
        parent: entry.parent || null,
        radiusKm: Number.isFinite(entry.radiusKm) ? entry.radiusKm : null,
        vector: entry.vector
      }
    })

    if (Object.keys(bodyMap).length < 10) {
      throw new Error('Horizons snapshot incomplete')
    }

    const payload = {
      fetchedAt: new Date().toISOString(),
      source: 'NASA/JPL Horizons API',
      bodies: bodyMap
    }
    cachedResponse = payload
    cachedAtMs = now
    res.status(200).json(payload)
  } catch (error) {
    res.status(502).json({
      error: 'Failed to retrieve Horizons snapshot',
      detail: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
