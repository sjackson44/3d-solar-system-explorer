export const DISTANCE_SCALE = 36
export const DISTANCE_OFFSET = 28
export const SYSTEM_DISTANCE_MULTIPLIER = 1.82

export const scaleDistance = (au) => (DISTANCE_OFFSET + au * DISTANCE_SCALE) * SYSTEM_DISTANCE_MULTIPLIER

const baseOrbitalBands = {
  asteroidBelt: {
    inner: scaleDistance(2.2),
    outer: scaleDistance(3.2)
  },
  kuiperBelt: {
    inner: scaleDistance(30),
    outer: scaleDistance(50)
  }
}

const baseBodies = {
  sun: {
    name: 'Sun',
    kind: 'star',
    radius: 9.8,
    texture: '/solar-system-skins/sun.jpg',
    facts: [
      'Contains about 99.8% of our solar system\'s mass.',
      'Its core reaches roughly 15 million C.',
      'Light from the Sun takes about 8 minutes to reach Earth.'
    ]
  },
  planets: [
    {
      name: 'Mercury',
      radius: 0.9,
      axialTiltDeg: 0.03,
      au: 0.39,
      distance: scaleDistance(0.39),
      orbitPeriod: 0.24,
      rotationPeriod: 58.6,
      texture: '/solar-system-skins/mercury.jpg',
      facts: ['Smallest planet.', 'No moons.', 'Huge temperature swings day vs night.'],
      moons: []
    },
    {
      name: 'Venus',
      radius: 1.8,
      axialTiltDeg: 177.36,
      au: 0.72,
      distance: scaleDistance(0.72),
      orbitPeriod: 0.62,
      rotationPeriod: -243,
      texture: '/solar-system-skins/venus.jpg',
      facts: ['Hottest planet.', 'Very thick CO2 atmosphere.', 'Rotates backward (retrograde).'],
      moons: []
    },
    {
      name: 'Earth',
      radius: 1.9,
      axialTiltDeg: 23.44,
      au: 1,
      distance: scaleDistance(1),
      orbitPeriod: 1,
      rotationPeriod: 1,
      texture: '/solar-system-skins/earth-day.jpg',
      facts: ['Only known world with life.', 'About 71% covered by water.', 'One natural moon.'],
      moons: [
        { name: 'Moon', radius: 0.5, distance: 4.5, orbitPeriod: 0.0748, orbitalInclinationDeg: 5.145, ascendingNodeDeg: 125.08, texture: '/solar-system-skins/moon.jpg' }
      ]
    },
    {
      name: 'Mars',
      radius: 1.2,
      axialTiltDeg: 25.19,
      au: 1.52,
      distance: scaleDistance(1.52),
      orbitPeriod: 1.88,
      rotationPeriod: 1.03,
      texture: '/solar-system-skins/mars.jpg',
      facts: ['Known as the Red Planet.', 'Home to Olympus Mons, a giant volcano.', 'Has two small moons.'],
      moons: [
        { name: 'Phobos', radius: 0.2, distance: 2.6, orbitPeriod: 0.00087, orbitalInclinationDeg: 1.08, ascendingNodeDeg: 48.0, texture: '/solar-system-skins/phobos.png' },
        { name: 'Deimos', radius: 0.14, distance: 3.6, orbitPeriod: 0.00346, orbitalInclinationDeg: 1.79, ascendingNodeDeg: 79.0, texture: '/solar-system-skins/deimos.png' }
      ]
    },
    {
      name: 'Jupiter',
      radius: 5.2,
      axialTiltDeg: 3.13,
      au: 5.2,
      distance: scaleDistance(5.2),
      orbitPeriod: 11.86,
      rotationPeriod: 0.41,
      texture: '/solar-system-skins/jupiter.jpg',
      facts: ['Largest planet.', 'Great Red Spot is a giant storm.', 'Has dozens of moons.'],
      moons: [
        { name: 'Io', radius: 0.44, distance: 7.5, orbitPeriod: 0.00484, orbitalInclinationDeg: 0.04, ascendingNodeDeg: 43.98, texture: '/solar-system-skins/io.jpg' },
        { name: 'Europa', radius: 0.4, distance: 9.5, orbitPeriod: 0.00972, orbitalInclinationDeg: 0.47, ascendingNodeDeg: 219.11, texture: '/solar-system-skins/europa.jpg' },
        { name: 'Ganymede', radius: 0.5, distance: 11.8, orbitPeriod: 0.01959, orbitalInclinationDeg: 0.18, ascendingNodeDeg: 63.55, texture: '/solar-system-skins/ganymede.jpg' },
        { name: 'Callisto', radius: 0.47, distance: 14.5, orbitPeriod: 0.04569, orbitalInclinationDeg: 0.19, ascendingNodeDeg: 298.85, texture: '/solar-system-skins/callisto.png' }
      ]
    },
    {
      name: 'Saturn',
      radius: 4.6,
      axialTiltDeg: 26.73,
      au: 9.54,
      distance: scaleDistance(9.54),
      orbitPeriod: 29.46,
      rotationPeriod: 0.44,
      texture: '/solar-system-skins/saturn.jpg',
      ringTexture: '/solar-system-skins/saturn-rings.png',
      facts: ['Famous for its bright rings.', 'Less dense than water.', 'Has many moons including Titan.'],
      moons: [
        { name: 'Titan', radius: 0.55, distance: 8.8, orbitPeriod: 0.04366, orbitalInclinationDeg: 0.35, ascendingNodeDeg: 28.06, texture: '/solar-system-skins/titan.jpg' },
        { name: 'Enceladus', radius: 0.22, distance: 6.8, orbitPeriod: 0.00375, orbitalInclinationDeg: 0.02, ascendingNodeDeg: 169.5, texture: '/solar-system-skins/enceladus.jpg' },
        { name: 'Rhea', radius: 0.28, distance: 10.8, orbitPeriod: 0.01237, orbitalInclinationDeg: 0.35, ascendingNodeDeg: 255.0, texture: '/solar-system-skins/rhea.jpg' },
        { name: 'Iapetus', radius: 0.26, distance: 14.6, orbitPeriod: 0.21717, orbitalInclinationDeg: 15.47, ascendingNodeDeg: 84.2, texture: '/solar-system-skins/iapetus.jpg' }
      ]
    },
    {
      name: 'Uranus',
      radius: 3.5,
      axialTiltDeg: 97.77,
      au: 19.2,
      distance: scaleDistance(19.2),
      orbitPeriod: 84,
      rotationPeriod: -0.72,
      texture: '/solar-system-skins/uranus.jpg',
      facts: ['An ice giant.', 'Rotates on its side.', 'Has faint rings and many moons.'],
      moons: [
        { name: 'Titania', radius: 0.3, distance: 18, orbitPeriod: 0.02384, orbitalInclinationDeg: 0.34, ascendingNodeDeg: 98.0, texture: '/solar-system-skins/titania.jpg' },
        { name: 'Oberon', radius: 0.28, distance: 24, orbitPeriod: 0.03686, orbitalInclinationDeg: 0.07, ascendingNodeDeg: 279.8, texture: '/solar-system-skins/oberon.jpg' },
        { name: 'Umbriel', radius: 0.25, distance: 12, orbitPeriod: 0.01135, orbitalInclinationDeg: 0.13, ascendingNodeDeg: 149.0, texture: '/solar-system-skins/umbriel.jpg' },
        { name: 'Ariel', radius: 0.24, distance: 9, orbitPeriod: 0.0069, orbitalInclinationDeg: 0.26, ascendingNodeDeg: 22.4, texture: '/solar-system-skins/ariel.jpg' },
        { name: 'Miranda', radius: 0.19, distance: 6.2, orbitPeriod: 0.00387, orbitalInclinationDeg: 4.34, ascendingNodeDeg: 326.4, texture: '/solar-system-skins/miranda.jpg' }
      ]
    },
    {
      name: 'Neptune',
      radius: 3.4,
      axialTiltDeg: 28.32,
      au: 30.1,
      distance: scaleDistance(30.1),
      orbitPeriod: 164.8,
      rotationPeriod: 0.67,
      texture: '/solar-system-skins/neptune.jpg',
      facts: ['Farthest giant planet.', 'Extremely strong winds.', 'Known moon Triton orbits backward.'],
      moons: [
        { name: 'Triton', radius: 0.32, distance: 6.8, orbitPeriod: -0.01609, orbitalInclinationDeg: 156.9, ascendingNodeDeg: 177.6, texture: '/solar-system-skins/triton.jpg' },
        { name: 'Nereid', radius: 0.16, distance: 9.8, orbitPeriod: 0.98531, orbitalInclinationDeg: 7.23, ascendingNodeDeg: 334.0, texture: '/solar-system-skins/nereid.jpg' },
        { name: 'Proteus', radius: 0.18, distance: 5.4, orbitPeriod: 0.00307, orbitalInclinationDeg: 0.52, ascendingNodeDeg: 94.1, texture: '/solar-system-skins/proteus.webp' },
        { name: 'Larissa', radius: 0.14, distance: 4.2, orbitPeriod: 0.00152, orbitalInclinationDeg: 0.2, ascendingNodeDeg: 312.0, texture: '/solar-system-skins/larissa.jpg' }
      ]
    },
    {
      name: 'Pluto',
      radius: 0.8,
      axialTiltDeg: 122.53,
      au: 39.5,
      distance: scaleDistance(39.5),
      orbitPeriod: 248,
      rotationPeriod: 6.4,
      texture: '/solar-system-skins/pluto.jpg',
      facts: ['A dwarf planet in the Kuiper Belt.', 'Very eccentric orbit.', 'Largest moon is Charon.'],
      moons: [
        { name: 'Charon', radius: 0.3, distance: 3.5, orbitPeriod: 0.01749, orbitalInclinationDeg: 0.0, ascendingNodeDeg: 0.0, texture: '/solar-system-skins/charon.jpg' }
      ]
    }
  ]
}

const SCIENTIFIC_DISTANCE_SCALE = 10

const scaleBodiesForScientificMode = (sourceBodies) => ({
  ...sourceBodies,
  sun: {
    ...sourceBodies.sun,
    radius: sourceBodies.sun.radius * 4
  },
  planets: sourceBodies.planets.map((planet) => ({
    ...planet,
    distance: planet.distance * SCIENTIFIC_DISTANCE_SCALE,
    moons: planet.moons.map((moon) => ({
      ...moon,
      distance: moon.distance * SCIENTIFIC_DISTANCE_SCALE
    }))
  }))
})

const scaleOrbitalBandsForScientificMode = (sourceBands) => ({
  asteroidBelt: {
    inner: sourceBands.asteroidBelt.inner * SCIENTIFIC_DISTANCE_SCALE,
    outer: sourceBands.asteroidBelt.outer * SCIENTIFIC_DISTANCE_SCALE
  },
  kuiperBelt: {
    inner: sourceBands.kuiperBelt.inner * SCIENTIFIC_DISTANCE_SCALE,
    outer: sourceBands.kuiperBelt.outer * SCIENTIFIC_DISTANCE_SCALE
  }
})

export const bodies = baseBodies
export const orbitalBands = baseOrbitalBands
export const scientificBodies = scaleBodiesForScientificMode(baseBodies)
export const scientificOrbitalBands = scaleOrbitalBandsForScientificMode(baseOrbitalBands)
