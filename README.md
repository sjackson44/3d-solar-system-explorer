# 3D Solar System Explorer

A fun, educational 3D solar system app built to help my kids explore space.

It includes:
- The Sun, planets, and selected major moons
- Planet/moon textures for a more realistic look
- Orbiting bodies and adjustable simulation speed
- Zoom/focus controls for close-up exploration
- Asteroid belt, Kuiper belt, and distant Oort-cloud-style view

## Why This App Exists

This project is meant to make learning the solar system interactive and visual. Instead of only reading facts, you can fly around space, focus on planets/moons, and see how everything relates in one scene.

## Tech Stack

- React
- Vite
- Three.js
- React Three Fiber (`@react-three/fiber`)
- Drei (`@react-three/drei`)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Run in development mode

```bash
npm run dev
```

Then open the local URL shown in your terminal (usually `http://localhost:5173`).

### 3. Build for production

```bash
npm run build
```

### 4. Preview production build

```bash
npm run preview
```

## Basic Controls

- Drag: orbit camera around the scene
- Scroll: zoom in and out
- Click planet/moon: focus on that body
- Use the control panel to:
  - Change simulation speed
  - Jump to key bodies
  - Toggle orbital lines
  - Select planets and moons directly

## Notes

- This is an educational visualization, not a strict 1:1 physics simulation.
- Distances/sizes/speeds are tuned for usability and learning.

## Project Structure

- `src/` - React + Three.js app code
- `solar-system-skins/` - texture assets used by the simulation
- `screenshots/` - local screenshots (ignored by git)

## License

For personal/educational use.
