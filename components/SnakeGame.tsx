'use client'
import { useEffect, useRef, useCallback } from 'react'

const GRID = 20
const CELL = 400 / GRID

export type PowerupKey = 'invisibility' | 'rush' | 'ghost' | 'magnet' | 'freeze' | 'shield'

export interface PowerupData {
  key: PowerupKey
  name: string
  icon: string
  description?: string
  duration_ms: number | null
}

interface Props {
  onScore:    (score: number) => void
  onGameOver: (score: number) => void
  gameRef:    React.MutableRefObject<GameAPI | null>
  onStart:    () => void
  highScore:  number
}

export interface GameAPI {
  restart:         () => void
  activatePowerup: (key: PowerupKey, endTime: number) => void
  moveDir:         (dir: Direction) => void
  pause:           () => void
  resume:          () => void
  isRunning:       () => boolean
  isStarted:       () => boolean
}

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
type Pos = { x: number; y: number }

const AMBER = '#ffb000'
const BG    = '#0a0703'

function rnd(n: number) { return Math.floor(Math.random() * n) }
function spawnFood(snake: Pos[]): Pos {
  let f: Pos
  do { f = { x: rnd(GRID), y: rnd(GRID) } }
  while (snake.some(s => s.x === f.x && s.y === f.y))
  return f
}

export default function SnakeGame({ onScore, onGameOver, gameRef, onStart, highScore }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const G = useRef({
    snake:      [{ x: 10, y: 10 }] as Pos[],
    dir:        'RIGHT' as Direction,
    nextDir:    'RIGHT' as Direction,
    food:       { x: 15, y: 10 } as Pos,
    score:      0,
    running:    false,
    dead:       false,
    paused:     false,
    powerup:    null as PowerupKey | null,
    powerupEnd: 0,         // ms timestamp when powerup expires (0 = no timer / shield)
    shield:     false,
    magCool:    0,
  })

  // Store callbacks in refs — RAF loop reads them without being a dependency.
  // This ensures tick() is created once and never recreated, keeping the loop stable.
  const cbScore = useRef(onScore)
  const cbOver  = useRef(onGameOver)
  const cbStart = useRef(onStart)
  const cbHigh  = useRef(highScore)
  useEffect(() => { cbScore.current = onScore    }, [onScore])
  useEffect(() => { cbOver.current  = onGameOver }, [onGameOver])
  useEffect(() => { cbStart.current = onStart    }, [onStart])
  useEffect(() => { cbHigh.current  = highScore  }, [highScore])

  const rafRef      = useRef(0)
  const lastTickRef = useRef(0)

  // ── Draw — zero deps ──────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const cv = canvasRef.current; if (!cv) return
    const ctx = cv.getContext('2d')!
    const g   = G.current
    const now = Date.now()

    ctx.fillStyle = BG; ctx.fillRect(0, 0, 400, 400)

    // grid dots
    ctx.fillStyle = 'rgba(255,176,0,0.045)'
    for (let x = 0; x < GRID; x++)
      for (let y = 0; y < GRID; y++)
        ctx.fillRect(x*CELL+CELL/2-0.5, y*CELL+CELL/2-0.5, 1, 1)

    // ── start screen ──
    if (!g.running && !g.dead) {
      ctx.textAlign = 'center'
      ctx.shadowColor = AMBER; ctx.shadowBlur = 24
      ctx.fillStyle = AMBER
      ctx.font = 'bold 14px "Press Start 2P",monospace'
      ctx.fillText('SNAKE', 200, 148)
      ctx.shadowBlur = 10; ctx.fillStyle = '#cc8800'
      ctx.font = '6px "Press Start 2P",monospace'
      ctx.fillText('PRESS START TO PLAY', 200, 190)
      ctx.fillText('OR MOVE TO BEGIN',    200, 206)
      if (cbHigh.current > 0) {
        ctx.font = '5px "Press Start 2P",monospace'; ctx.fillStyle = '#8a5a00'
        ctx.fillText(`BEST: ${cbHigh.current}`, 200, 234)
      }
      ctx.shadowBlur = 0; return
    }

    // ── game over ──
    if (g.dead) {
      ctx.textAlign = 'center'
      ctx.shadowColor = '#ff4400'; ctx.shadowBlur = 28
      ctx.fillStyle = '#ff4400'
      ctx.font = 'bold 12px "Press Start 2P",monospace'
      ctx.fillText('GAME OVER', 200, 164)
      ctx.shadowBlur = 0
      ctx.fillStyle = AMBER; ctx.font = '7px "Press Start 2P",monospace'
      ctx.fillText(`SCORE: ${g.score}`, 200, 196)
      ctx.fillStyle = '#cc8800'; ctx.font = '5px "Press Start 2P",monospace'
      ctx.fillText('PRESS START', 200, 226)
      return
    }

    // ── active powerup screen tint ──
    if (g.powerup) {
      const tints: Record<string,string> = {
        invisibility:'rgba(0,229,255,0.04)',   rush:'rgba(255,176,0,0.06)',
        ghost:'rgba(180,100,255,0.04)',         magnet:'rgba(255,80,80,0.04)',
        freeze:'rgba(100,200,255,0.05)',        shield:'rgba(100,255,100,0.04)',
      }
      ctx.fillStyle = tints[g.powerup] ?? 'transparent'
      ctx.fillRect(0, 0, 400, 400)
    }

    // ── food ──
    const fp = 0.5 + 0.5 * Math.sin(now / 220)
    ctx.shadowColor = '#ff6600'; ctx.shadowBlur = 10 + fp * 8
    ctx.fillStyle = `rgb(255,${Math.round(100+fp*80)},20)`
    ctx.beginPath()
    ctx.arc(g.food.x*CELL+CELL/2, g.food.y*CELL+CELL/2, CELL/2-2, 0, Math.PI*2)
    ctx.fill(); ctx.shadowBlur = 0

    // ── snake ──
    g.snake.forEach((seg, i) => {
      const head   = i === 0
      const t      = i / Math.max(g.snake.length-1, 1)
      const inv    = g.powerup==='invisibility' && g.powerupEnd>now
      const rush   = g.powerup==='rush'         && g.powerupEnd>now
      const ghost  = g.powerup==='ghost'        && g.powerupEnd>now
      const shield = g.powerup==='shield'       || g.shield

      let color: string
      if      (inv)    color = `rgba(0,229,255,${head?0.5:0.2})`
      else if (rush)   color = `rgba(255,${Math.round(200-t*80)},0,1)`
      else if (ghost)  color = `rgba(200,150,255,${1-t*0.4})`
      else if (shield) color = `rgba(100,255,150,${1-t*0.3})`
      else             color = head ? AMBER : `rgba(255,${Math.round(176-t*80)},0,${1-t*0.3})`

      ctx.shadowColor = color; ctx.shadowBlur = head ? 10 : 5
      ctx.fillStyle   = color
      const p = head ? 1 : 2
      ctx.fillRect(seg.x*CELL+p, seg.y*CELL+p, CELL-p*2, CELL-p*2)

      if (head) {
        ctx.shadowBlur = 0; ctx.fillStyle = BG
        if (g.dir==='RIGHT'||g.dir==='LEFT') {
          const ex = g.dir==='RIGHT' ? seg.x*CELL+CELL-5 : seg.x*CELL+3
          ctx.fillRect(ex, seg.y*CELL+4, 2, 2)
          ctx.fillRect(ex, seg.y*CELL+CELL-6, 2, 2)
        } else {
          const ey = g.dir==='DOWN' ? seg.y*CELL+CELL-5 : seg.y*CELL+3
          ctx.fillRect(seg.x*CELL+4, ey, 2, 2)
          ctx.fillRect(seg.x*CELL+CELL-6, ey, 2, 2)
        }
      }
    })
    ctx.shadowBlur = 0

    // ── score HUD ──
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(4, 4, 116, 16)
    ctx.fillStyle = AMBER; ctx.font = '5px "Press Start 2P",monospace'; ctx.textAlign = 'left'
    ctx.fillText(`SCORE: ${g.score}`, 8, 15)

    // ── paused overlay ──
    if (g.paused) {
      ctx.fillStyle = 'rgba(8,5,2,0.65)'; ctx.fillRect(0, 0, 400, 400)
      ctx.textAlign = 'center'; ctx.fillStyle = AMBER
      ctx.shadowColor = AMBER; ctx.shadowBlur = 18
      ctx.font = '10px "Press Start 2P",monospace'
      ctx.fillText('PAUSED', 200, 195)
      ctx.shadowBlur = 0; ctx.fillStyle = '#cc8800'
      ctx.font = '5px "Press Start 2P",monospace'
      ctx.fillText('SELECT A POWER-UP', 200, 220)
    }
  }, []) // zero deps — reads G.current directly

  // ── Game loop — zero external deps, created once, never recreated ─────────
  const tick = useCallback((ts: number) => {
    rafRef.current = requestAnimationFrame(tick) // schedule FIRST — keeps loop alive
    const g   = G.current
    const now = Date.now()

    // Freeze powerup: stop movement but keep drawing
    if (!g.running || g.paused || (g.powerup==='freeze' && g.powerupEnd>now)) {
      draw(); return
    }

    const speed = (g.powerup==='rush' && g.powerupEnd>now) ? 60 : 130
    if (ts - lastTickRef.current < speed) { draw(); return }
    lastTickRef.current = ts

    g.dir = g.nextDir
    const head = { ...g.snake[0] }
    if (g.dir==='UP')    head.y--
    if (g.dir==='DOWN')  head.y++
    if (g.dir==='LEFT')  head.x--
    if (g.dir==='RIGHT') head.x++

    const isGhost = g.powerup==='ghost' && g.powerupEnd>now

    // Wall collision
    if (isGhost) {
      if (head.x<0)     head.x = GRID-1
      if (head.x>=GRID) head.x = 0
      if (head.y<0)     head.y = GRID-1
      if (head.y>=GRID) head.y = 0
    } else if (head.x<0 || head.x>=GRID || head.y<0 || head.y>=GRID) {
      if (g.shield) { g.shield=false; g.powerup=null; head.x=Math.max(0,Math.min(GRID-1,head.x)); head.y=Math.max(0,Math.min(GRID-1,head.y)) }
      else { g.running=false; g.dead=true; draw(); cbOver.current(g.score); return }
    }

    // Self collision (invisibility bypasses it)
    const isInv = g.powerup==='invisibility' && g.powerupEnd>now
    if (!isInv && g.snake.slice(1).some(s => s.x===head.x && s.y===head.y)) {
      if (g.shield) { g.shield=false; g.powerup=null }
      else { g.running=false; g.dead=true; draw(); cbOver.current(g.score); return }
    }

    // Magnet: pull food toward snake
    if (g.powerup==='magnet' && g.powerupEnd>now) {
      if (--g.magCool <= 0) {
        g.magCool = 3
        const nx = g.food.x + Math.sign(head.x-g.food.x)
        const ny = g.food.y + Math.sign(head.y-g.food.y)
        if (nx>=0&&nx<GRID&&ny>=0&&ny<GRID) g.food = { x:nx, y:ny }
      }
    }

    // Move (fresh array every tick — never mutate)
    const ate = head.x===g.food.x && head.y===g.food.y
    if (ate) {
      g.snake = [head, ...g.snake]
      const mult = (g.powerup==='rush' && g.powerupEnd>now) ? 2 : 1
      g.score += 10 * mult
      g.food = spawnFood(g.snake)
      cbScore.current(g.score)
    } else {
      g.snake = [head, ...g.snake.slice(0,-1)]
    }

    // Powerup natural expiry (engine side)
    if (g.powerup && g.powerup!=='shield' && g.powerupEnd>0 && now>g.powerupEnd) {
      g.powerup = null; g.powerupEnd = 0
    }

    draw()
  }, [draw])

  // ── Public API ────────────────────────────────────────────────────────────
  const restart = useCallback(() => {
    const g = G.current
    g.snake=[{x:10,y:10}]; g.dir='RIGHT'; g.nextDir='RIGHT'
    g.food=spawnFood([{x:10,y:10}])
    g.score=0; g.dead=false; g.running=true; g.paused=false
    g.powerup=null; g.powerupEnd=0; g.shield=false; g.magCool=0
    cancelAnimationFrame(rafRef.current)
    lastTickRef.current = performance.now()
    rafRef.current = requestAnimationFrame(tick)
    cbStart.current()
  }, [tick])

  // activatePowerup receives the endTime from the parent so both are in sync.
  const activatePowerup = useCallback((key: PowerupKey, endTime: number) => {
    const g = G.current
    g.powerup   = key
    g.paused    = false   // always unpause when activating
    if (key === 'shield') { g.shield=true; g.powerupEnd=0 }
    else                  { g.powerupEnd=endTime }
  }, [])

  const moveDir = useCallback((dir: Direction) => {
    const g   = G.current
    const opp = { UP:'DOWN', DOWN:'UP', LEFT:'RIGHT', RIGHT:'LEFT' } as Record<Direction,Direction>
    if (!g.running && !g.dead) { restart(); return }
    if (!g.paused && dir!==opp[g.dir]) g.nextDir = dir
  }, [restart])

  useEffect(() => {
    gameRef.current = {
      restart,
      activatePowerup,
      moveDir,
      pause:     () => { G.current.paused=true  },
      resume:    () => { G.current.paused=false },
      isRunning: () => G.current.running && !G.current.dead,
      isStarted: () => G.current.running || G.current.dead,
    }
  }, [restart, activatePowerup, moveDir, gameRef])

  // Keyboard
  useEffect(() => {
    const map: Record<string,Direction> = {
      ArrowUp:'UP', ArrowDown:'DOWN', ArrowLeft:'LEFT', ArrowRight:'RIGHT',
      w:'UP', s:'DOWN', a:'LEFT', d:'RIGHT',
    }
    const h = (e: KeyboardEvent) => { const d=map[e.key]; if(d){e.preventDefault();moveDir(d)} }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [moveDir])

  // Start loop once on mount
  useEffect(() => {
    lastTickRef.current = performance.now()
    rafRef.current      = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [tick])

  return (
    <canvas
      ref={canvasRef}
      width={400} height={400}
      style={{ display:'block', imageRendering:'pixelated', width:'100%', height:'100%' }}
    />
  )
}
