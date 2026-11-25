// Builds the moonlit island scene as one SVG string, animated with SMIL alone.
// phase: idle (still), busy (rain + twinkle), settling (everything winds down once).

export type Phase = 'idle' | 'busy' | 'settling'

const W = 1600
const H = 900
const HORIZON = 560

function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const f = (n: number): string => (Math.round(n * 100) / 100).toString()

// Moon and tree sit to the right so they stay clear of the messages.
const MOON = { x: 1250, y: 300, r: 112 }

// Stars exist only while Claude works: each one fades in, twinkles and fades out.
// At rest the sky holds none.
function stars(phase: Phase): string {
  if (phase === 'idle') {
    return ''
  }
  const r = rng(7)
  const timing = phase === 'busy' ? 'repeatCount="indefinite"' : 'repeatDur="3s"'
  const out: string[] = []
  const nearMoon = (x: number, y: number, pad: number) => (x - MOON.x) ** 2 + (y - MOON.y) ** 2 < (MOON.r + pad) ** 2
  for (let i = 0; i < 170; i++) {
    const x = r() * W
    const y = Math.pow(r(), 1.3) * (HORIZON - 70)
    const size = 0.5 + Math.pow(r(), 2.2) * 1.6
    const peak = 0.45 + r() * 0.55
    const dur = 2.8 + r() * 4.5
    const begin = r() * dur
    if (nearMoon(x, y, 40)) {
      continue
    }
    out.push(
      `<circle cx="${f(x)}" cy="${f(y)}" r="${f(size)}" fill="#e6efff" opacity="0">` +
        `<animate attributeName="opacity" values="0;${f(peak)};${f(peak * 0.55)};${f(peak)};0" dur="${f(dur)}s" begin="-${f(begin)}s" ${timing}/></circle>`,
    )
  }
  // brighter stars with soft halos and a faint cross
  for (let i = 0; i < 12; i++) {
    const x = 60 + r() * (W - 120)
    const y = 30 + r() * 400
    if (nearMoon(x, y, 70)) {
      continue
    }
    const dur = 4 + r() * 3.5
    out.push(
      `<g opacity="0"><animate attributeName="opacity" values="0;.95;.5;.95;0" dur="${f(dur)}s" begin="-${f(r() * dur)}s" ${timing}/>` +
        `<circle cx="${f(x)}" cy="${f(y)}" r="7" fill="url(#halo)"/>` +
        `<path d="M${f(x - 6)} ${f(y)}H${f(x + 6)}M${f(x)} ${f(y - 6)}V${f(y + 6)}" stroke="#dfe9ff" stroke-width=".6" opacity=".6"/>` +
        `<circle cx="${f(x)}" cy="${f(y)}" r="1.8" fill="#f6f9ff"/></g>`,
    )
  }
  const fade =
    phase === 'busy'
      ? '<animate attributeName="opacity" from="0" to="1" begin="0s" dur="2.5s" fill="freeze"/>'
      : '<animate attributeName="opacity" from="1" to="0" begin="0s" dur="2.8s" fill="freeze"/>'
  return `<g>${fade}${out.join('')}${phase === 'busy' ? meteors() : ''}</g>`
}

// Two faint shooting stars, each crossing once every several seconds.
function meteors(): string {
  const trails = [
    { x: 380, y: 90, dx: 260, dy: 110, dur: 11, begin: 3 },
    { x: 820, y: 60, dx: 220, dy: 95, dur: 15, begin: 9 },
  ]
  return trails
    .map(
      t =>
        `<g opacity="0">` +
        `<animate attributeName="opacity" values="0;0;.85;0;0" keyTimes="0;.001;.02;.07;1" dur="${t.dur}s" begin="${t.begin}s" repeatCount="indefinite"/>` +
        `<animateTransform attributeName="transform" type="translate" values="0 0;0 0;${t.dx} ${t.dy};${t.dx} ${t.dy}" keyTimes="0;.001;.07;1" dur="${t.dur}s" begin="${t.begin}s" repeatCount="indefinite"/>` +
        `<line x1="${t.x}" y1="${t.y}" x2="${f(t.x - t.dx * 0.45)}" y2="${f(t.y - t.dy * 0.45)}" stroke="url(#meteor)" stroke-width="1.4" stroke-linecap="round"/></g>`,
    )
    .join('')
}

function rain(phase: Phase, pct: number): string {
  if (phase === 'idle') {
    return ''
  }
  const p = Math.max(0, Math.min(100, pct))
  const drops = Math.round(6 + p * 1.5)
  const ripples = Math.round(2 + p * 0.22)
  const r = rng(1000 + drops)
  const timing = phase === 'busy' ? 'repeatCount="indefinite"' : 'repeatDur="2.6s"'
  const alpha = 0.18 + p * 0.0022
  const out: string[] = []
  for (let i = 0; i < drops; i++) {
    const x = r() * (W + 160)
    const len = 14 + r() * 16
    const dur = 0.75 + r() * 0.55
    const fall = H + 60 + r() * 40
    out.push(
      `<line x1="${f(x)}" y1="-40" x2="${f(x - len * 0.18)}" y2="${f(-40 + len)}" opacity="${f(alpha * (0.6 + r() * 0.6))}">` +
        `<animateTransform attributeName="transform" type="translate" from="0 0" to="${f(-fall * 0.18)} ${f(fall)}" dur="${f(dur)}s" begin="-${f(r() * dur)}s" ${timing}/></line>`,
    )
  }
  // Each ripple lands somewhere new on every hit, and some hits are skipped,
  // so the water never gets struck in the same spot on a steady beat.
  const HITS = 6
  const keys: string[] = []
  for (let k = 0; k < HITS; k++) {
    keys.push(f(k / HITS), f((k + 0.7) / HITS), f((k + 0.97) / HITS))
  }
  keys.push('1')
  const keyTimes = keys.join(';')
  const spotTimes = Array.from({ length: HITS }, (_, k) => f(k / HITS)).join(';')
  const rip: string[] = []
  for (let i = 0; i < ripples; i++) {
    const hit = 1.1 + r() * 0.9
    const total = hit * HITS
    const xs: string[] = []
    const ys: string[] = []
    const rx: string[] = []
    const ry: string[] = []
    const op: string[] = []
    for (let k = 0; k < HITS; k++) {
      const y = HORIZON + 14 + Math.pow(r(), 0.8) * (H - HORIZON - 24)
      const scale = (0.5 + ((y - HORIZON) / (H - HORIZON)) * 1.1) * (0.7 + r() * 0.6)
      const peak = r() < 0.3 ? 0 : 0.35 + r() * 0.3
      xs.push(String(Math.round(r() * W)))
      ys.push(String(Math.round(y)))
      const R = f(14 * scale)
      const Ry = f(3.2 * scale)
      rx.push('0', R, R)
      ry.push('0', Ry, Ry)
      op.push(f(peak), '0', '0')
    }
    rx.push('0')
    ry.push('0')
    op.push('0')
    const b = `dur="${f(total)}s" begin="-${f(r() * total)}s" ${timing}`
    rip.push(
      `<ellipse rx="0" ry="0" opacity="0">` +
        `<animate attributeName="cx" values="${xs.join(';')}" keyTimes="${spotTimes}" calcMode="discrete" ${b}/>` +
        `<animate attributeName="cy" values="${ys.join(';')}" keyTimes="${spotTimes}" calcMode="discrete" ${b}/>` +
        `<animate attributeName="rx" values="${rx.join(';')}" keyTimes="${keyTimes}" ${b}/>` +
        `<animate attributeName="ry" values="${ry.join(';')}" keyTimes="${keyTimes}" ${b}/>` +
        `<animate attributeName="opacity" values="${op.join(';')}" keyTimes="${keyTimes}" ${b}/></ellipse>`,
    )
  }
  const fade =
    phase === 'settling'
      ? '<animate attributeName="opacity" from="1" to="0" begin="0s" dur="2.6s" fill="freeze"/>'
      : ''
  return (
    `<g>${fade}<g stroke="#b7d0ff" stroke-width="1.2" stroke-linecap="round">${out.join('')}</g>` +
    `<g fill="none" stroke="#c4d8ff" stroke-width="1">${rip.join('')}</g></g>`
  )
}

function mist(phase: Phase): string {
  const banks = [
    { x: 1360, y: 560, rx: 300, ry: 18, o: 0.26, d: 26 },
    { x: 1480, y: 566, rx: 220, ry: 16, o: 0.28, d: -18 },
    { x: 1150, y: 560, rx: 260, ry: 14, o: 0.2, d: 22 },
    { x: 1250, y: 545, rx: 160, ry: 10, o: 0.14, d: -14 },
  ]
  return banks
    .map((b, i) => {
      let anim = ''
      if (phase === 'busy') {
        anim = `<animateTransform attributeName="transform" type="translate" values="0 0;${b.d} 0;0 0" dur="${18 + i * 5}s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/>`
      }
      return `<ellipse cx="${b.x}" cy="${b.y}" rx="${b.rx}" ry="${b.ry}" fill="#c9dbff" opacity="${b.o}" filter="url(#blur)">${anim}</ellipse>`
    })
    .join('')
}

// Height of the island's top at x, for placing grass on it.
function isleTop(x: number): number {
  const half = x < 1440 ? 290 : 200
  return 527 + 33 * ((x - 1440) / half) ** 2
}

function grass(): string {
  const r = rng(91)
  const blades: string[] = []
  for (let i = 0; i < 70; i++) {
    const x = 1175 + r() * 440
    const y = isleTop(x) + 1.5
    const h = 4 + r() * (x > 1300 && x < 1560 ? 11 : 6)
    const lean = (r() - 0.5) * 6
    blades.push(`M${f(x - 1.2)} ${f(y)}Q${f(x + lean * 0.4)} ${f(y - h * 0.6)} ${f(x + lean)} ${f(y - h)}Q${f(x + 0.3)} ${f(y - h * 0.5)} ${f(x + 1.2)} ${f(y)}Z`)
  }
  return `<path d="${blades.join('')}"/>`
}

// Canopy outline, used for the fill and its moonlit rim.
const CANOPY = `
  <ellipse cx="1404" cy="372" rx="78" ry="44"/>
  <ellipse cx="1350" cy="392" rx="46" ry="26"/>
  <ellipse cx="1452" cy="398" rx="50" ry="28"/>
  <ellipse cx="1380" cy="346" rx="44" ry="30"/>
  <ellipse cx="1436" cy="342" rx="40" ry="28"/>
  <ellipse cx="1408" cy="322" rx="34" ry="22"/>
  <ellipse cx="1478" cy="420" rx="22" ry="12"/>
  <ellipse cx="1322" cy="404" rx="20" ry="11"/>
  <ellipse cx="1368" cy="318" rx="16" ry="11"/>
  <ellipse cx="1462" cy="368" rx="30" ry="20"/>`

const TRUNK = 'M1398 534 C1400 505 1398 480 1392 452 C1388 432 1378 414 1366 398 L1372 394 C1386 410 1394 426 1400 444 C1404 424 1410 404 1424 388 L1430 392 C1418 410 1412 430 1410 452 C1416 444 1428 436 1444 430 L1446 436 C1430 444 1418 454 1412 468 C1408 488 1410 510 1414 534 C1420 536 1426 538 1430 540 L1384 540 C1390 538 1394 536 1398 534 Z'

function leafClusters(): string {
  const r = rng(55)
  const out: string[] = []
  for (let i = 0; i < 26; i++) {
    const x = 1340 + r() * 130
    const y = 330 + r() * 80
    out.push(`<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(6 + r() * 10)}" ry="${f(4 + r() * 6)}"/>`)
  }
  return out.join('')
}

const MOUNTAINS = `
<g id="hills">
  <path fill="#12306a" opacity=".55" d="M-20 ${HORIZON} L60 528 L130 512 L190 522 L260 498 L330 516 L400 506 L470 526 L540 518 L620 536 L700 530 L780 ${HORIZON} Z"/>
  <path fill="#0d2758" opacity=".7" d="M-20 ${HORIZON} L40 544 L110 536 L170 546 L240 532 L300 542 L360 538 L430 548 L520 544 L600 ${HORIZON} Z"/>
  <path fill="#14336f" opacity=".45" d="M860 ${HORIZON} L930 544 L1000 536 L1060 544 L1110 552 L1160 ${HORIZON} Z"/>
</g>`

// Tree, island, rocks and moon: drawn once and mirrored into the water.
const LANDMARK = `
<g id="moon">
  <circle cx="${MOON.x}" cy="${MOON.y}" r="${MOON.r * 3.2}" fill="url(#moonGlow)"/>
  <circle cx="${MOON.x}" cy="${MOON.y}" r="${MOON.r + 6}" fill="#dfeaff" opacity=".18"/>
  <circle cx="${MOON.x}" cy="${MOON.y}" r="${MOON.r}" fill="url(#moonFace)"/>
  <g fill="#8fa8d4" opacity=".16">
    <path d="M${MOON.x - 70} ${MOON.y - 40} C${MOON.x - 50} ${MOON.y - 70} ${MOON.x - 6} ${MOON.y - 60} ${MOON.x - 12} ${MOON.y - 30} C${MOON.x - 18} ${MOON.y - 4} ${MOON.x - 60} ${MOON.y - 2} ${MOON.x - 70} ${MOON.y - 40} Z"/>
    <path d="M${MOON.x + 6} ${MOON.y + 4} C${MOON.x + 30} ${MOON.y - 18} ${MOON.x + 74} ${MOON.y - 4} ${MOON.x + 70} ${MOON.y + 30} C${MOON.x + 66} ${MOON.y + 62} ${MOON.x + 20} ${MOON.y + 60} ${MOON.x + 6} ${MOON.y + 4} Z"/>
    <path d="M${MOON.x - 50} ${MOON.y + 30} C${MOON.x - 36} ${MOON.y + 20} ${MOON.x - 14} ${MOON.y + 34} ${MOON.x - 20} ${MOON.y + 54} C${MOON.x - 30} ${MOON.y + 70} ${MOON.x - 58} ${MOON.y + 52} ${MOON.x - 50} ${MOON.y + 30} Z"/>
  </g>
  <g fill="none" stroke="#9db4dc" stroke-width="1.2" opacity=".35">
    <circle cx="${MOON.x - 38}" cy="${MOON.y - 30}" r="9"/>
    <circle cx="${MOON.x + 44}" cy="${MOON.y + 22}" r="12"/>
    <circle cx="${MOON.x - 8}" cy="${MOON.y + 70}" r="6"/>
    <circle cx="${MOON.x + 56}" cy="${MOON.y - 50}" r="7"/>
    <circle cx="${MOON.x - 72}" cy="${MOON.y + 10}" r="5"/>
    <circle cx="${MOON.x + 20}" cy="${MOON.y - 74}" r="4"/>
  </g>
  <circle cx="${MOON.x}" cy="${MOON.y}" r="${MOON.r}" fill="url(#moonShade)"/>
</g>
<g id="isle">
  <path fill="#071535" d="M1150 ${HORIZON} C1210 548 1260 540 1320 534 C1380 527 1440 526 1490 533 C1540 540 1580 550 1640 ${HORIZON} Z"/>
  <path fill="#2b4f8f" opacity=".5" d="M1180 ${HORIZON - 4} C1230 547 1280 540 1330 535 C1300 540 1250 548 1200 ${HORIZON - 2} Z"/>
  <g fill="#050d24">
    ${grass()}
    <path d="${TRUNK}"/>
    <path d="M1372 394 L1352 382 L1355 378 L1374 389 Z M1424 388 L1440 372 L1444 376 L1428 391 Z M1444 430 L1462 424 L1463 429 L1446 436 Z"/>
  </g>
  <path d="${TRUNK}" fill="none" stroke="#6f93d1" stroke-width="1" opacity=".35" stroke-dasharray="0 6 60 400"/>
  <g fill="#7f9fd8" opacity=".5">${CANOPY}</g>
  <g fill="#050d24" transform="translate(4 3)">${CANOPY}</g>
  <g fill="#0b1a3c" opacity=".9">${leafClusters()}</g>
  <g fill="#050d24">
    <path d="M1236 ${HORIZON} C1238 550 1250 546 1262 548 C1270 550 1276 555 1278 ${HORIZON} Z"/>
    <path d="M1590 ${HORIZON} C1592 552 1602 549 1612 552 C1618 555 1620 ${HORIZON - 2} 1622 ${HORIZON} Z"/>
    <path d="M1118 ${HORIZON} C1120 555 1128 553 1135 555 L1140 ${HORIZON} Z"/>
  </g>
  <path d="M1238 552 C1244 547 1254 546 1262 548" fill="none" stroke="#8fb0e6" stroke-width="1" opacity=".5"/>
</g>`

function clouds(phase: Phase): string {
  const banks = [
    { y: 250, x: 1000, w: 520, o: 0.32, d: 70, dur: 70 },
    { y: 352, x: 1180, w: 380, o: 0.26, d: -50, dur: 55 },
    { y: 140, x: 300, w: 600, o: 0.18, d: 60, dur: 80 },
    { y: 420, x: 560, w: 460, o: 0.16, d: -40, dur: 65 },
  ]
  return banks
    .map(b => {
      const anim =
        phase === 'busy'
          ? `<animateTransform attributeName="transform" type="translate" values="0 0;${b.d} 0;0 0" dur="${b.dur}s" repeatCount="indefinite" calcMode="spline" keySplines=".45 0 .55 1;.45 0 .55 1"/>`
          : ''
      const x = b.x
      const y = b.y
      const w = b.w
      return (
        `<g opacity="${b.o}" filter="url(#cloudBlur)">${anim}` +
        `<ellipse cx="${x}" cy="${y}" rx="${w / 2}" ry="9" fill="#9fb8e6"/>` +
        `<ellipse cx="${f(x - w * 0.18)}" cy="${y - 7}" rx="${f(w * 0.22)}" ry="8" fill="#b8cdf2"/>` +
        `<ellipse cx="${f(x + w * 0.2)}" cy="${y + 5}" rx="${f(w * 0.26)}" ry="6" fill="#7f9ccf"/>` +
        `</g>`
      )
    })
    .join('')
}

export function buildScene(phase: Phase, pct: number): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMaxYMid slice">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#020817"/>
    <stop offset=".45" stop-color="#0a1d48"/>
    <stop offset=".85" stop-color="#1b467f"/>
    <stop offset="1" stop-color="#2a5c98"/>
  </linearGradient>
  <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#1a3f74"/>
    <stop offset=".35" stop-color="#0c2452"/>
    <stop offset="1" stop-color="#030a1f"/>
  </linearGradient>
  <radialGradient id="moonFace" cx=".42" cy=".4" r=".7">
    <stop offset="0" stop-color="#ffffff"/>
    <stop offset=".6" stop-color="#e4eeff"/>
    <stop offset="1" stop-color="#b9cdf0"/>
  </radialGradient>
  <radialGradient id="moonShade" cx=".38" cy=".36" r=".72">
    <stop offset=".7" stop-color="#5a78b0" stop-opacity="0"/>
    <stop offset="1" stop-color="#5a78b0" stop-opacity=".35"/>
  </radialGradient>
  <radialGradient id="moonGlow">
    <stop offset=".25" stop-color="#bcd3ff" stop-opacity=".4"/>
    <stop offset=".55" stop-color="#5f8ad0" stop-opacity=".13"/>
    <stop offset="1" stop-color="#1b3d78" stop-opacity="0"/>
  </radialGradient>
  <radialGradient id="waterGlow">
    <stop offset="0" stop-color="#9fbcf0" stop-opacity=".22"/>
    <stop offset="1" stop-color="#9fbcf0" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="horizonGlow" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#4f7fc0" stop-opacity="0"/>
    <stop offset="1" stop-color="#4f7fc0" stop-opacity=".35"/>
  </linearGradient>
  <radialGradient id="halo">
    <stop offset="0" stop-color="#dfe9ff" stop-opacity=".7"/>
    <stop offset="1" stop-color="#dfe9ff" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="meteor" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#dfe9ff" stop-opacity="0"/>
    <stop offset="1" stop-color="#f4f8ff" stop-opacity=".9"/>
  </linearGradient>
  <linearGradient id="fadeGrad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ffffff" stop-opacity=".75"/>
    <stop offset=".55" stop-color="#ffffff" stop-opacity=".3"/>
    <stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
  </linearGradient>
  <mask id="fade" maskUnits="userSpaceOnUse" x="0" y="${HORIZON}" width="${W}" height="${H - HORIZON}">
    <rect x="0" y="${HORIZON}" width="${W}" height="${H - HORIZON}" fill="url(#fadeGrad)"/>
  </mask>
  <filter id="blur" x="-30%" y="-200%" width="160%" height="500%"><feGaussianBlur stdDeviation="14"/></filter>
  <filter id="cloudBlur" x="-20%" y="-300%" width="140%" height="700%"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="soft" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="1.4"/></filter>
</defs>
<!-- sky -->
<rect width="${W}" height="${HORIZON}" fill="url(#sky)"/>
<rect y="${HORIZON - 140}" width="${W}" height="140" fill="url(#horizonGlow)"/>
${stars(phase)}
${MOUNTAINS}
${LANDMARK}
<g>${clouds(phase)}</g>
<!-- water with the mirrored hills, island and moon -->
<rect y="${HORIZON}" width="${W}" height="${H - HORIZON}" fill="url(#sea)"/>
<ellipse cx="${MOON.x}" cy="${HORIZON + 170}" rx="220" ry="180" fill="url(#waterGlow)"/>
<g mask="url(#fade)">
  <g filter="url(#soft)" transform="translate(0 ${HORIZON * 2}) scale(1 -1)">
    <use href="#hills"/>
    <use href="#moon"/>
    <use href="#isle"/>
  </g>
</g>
<rect x="0" y="${HORIZON - 1}" width="${W}" height="2" fill="#7fa4dc" opacity=".25"/>
<!-- mist -->
<g>${mist(phase)}</g>
<!-- rain -->
${rain(phase, pct)}
</svg>`
}
