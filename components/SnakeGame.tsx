'use client'
import { useEffect, useRef, useCallback, useState } from 'react'

const GRID = 20
const CELL = 400 / GRID

export type PowerupKey = 'invisibility' | 'rush' | 'ghost' | 'magnet' | 'freeze' | 'shield'

interface PowerupData {
  key: PowerupKey
  name: string
  icon: string
  duration_ms: number | null
}

interface Props {
  onScore: (score: number, powerupUsed: string | null) => void
  onGameOver: (score: number) => void
  grantedPowerups: PowerupData[]
  activePowerup: PowerupKey | null
  onActivatePowerup: () => void
  gameRef: React.MutableRefObject<{ restart: () => void; activatePowerup: (key: PowerupKey) => void } | null>
  isPlaying: boolean
  onStart: () => void
  highScore: number
}

type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'
type Pos = { x: number; y: number }

function rnd(max: number) { return Math.floor(Math.random() * max) }
function newFood(snake: Pos[]): Pos {
  let food: Pos
  do { food = { x: rnd(GRID), y: rnd(GRID) } }
  while (snake.some(s => s.x === food.x && s.y === food.y))
  return food
}

export default function SnakeGame({ onScore, onGameOver, grantedPowerups, activePowerup, onActivatePowerup, gameRef, isPlaying, onStart, highScore }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({
    snake: [{ x: 10, y: 10 }] as Pos[],
    dir: 'RIGHT' as Direction,
    nextDir: 'RIGHT' as Direction,
    food: { x: 15, y: 10 } as Pos,
    score: 0,
    running: false,
    dead: false,
    activePowerup: null as PowerupKey | null,
    powerupEnd: 0,
    shieldActive: false,
    powerupUsedThisGame: null as string | null,
    frame: 0,
    foodMoveCooldown: 0,
  })
  const animRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)

  const getSpeed = useCallback(() => {
    const s = stateRef.current
    return s.activePowerup === 'rush' ? 60 : 120
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const s = stateRef.current

    // Background
    ctx.fillStyle = '#030e03'
    ctx.fillRect(0, 0, 400, 400)

    // Grid dots
    ctx.fillStyle = 'rgba(0,255,65,0.06)'
    for (let x = 0; x < GRID; x++) for (let y = 0; y < GRID; y++) {
      ctx.fillRect(x * CELL + CELL / 2 - 0.5, y * CELL + CELL / 2 - 0.5, 1, 1)
    }

    if (!s.running && !s.dead) {
      // Start screen
      ctx.fillStyle = '#00ff41'
      ctx.font = 'bold 13px "Press Start 2P", monospace'
      ctx.textAlign = 'center'
      ctx.shadowColor = '#00ff41'
      ctx.shadowBlur = 20
      ctx.fillText('SNAKE', 200, 160)
      ctx.font = '6px "Press Start 2P", monospace'
      ctx.shadowBlur = 8
      ctx.fillText('PRESS START OR ARROW KEY', 200, 200)
      ctx.fillText('TO PLAY', 200, 216)
      ctx.shadowBlur = 0
      if (highScore > 0) {
        ctx.fillStyle = '#00cc33'
        ctx.font = '5px "Press Start 2P", monospace'
        ctx.fillText(`HI: ${highScore}`, 200, 240)
      }
      return
    }

    if (s.dead) {
      ctx.fillStyle = '#00ff41'
      ctx.font = 'bold 11px "Press Start 2P", monospace'
      ctx.textAlign = 'center'
      ctx.shadowColor = '#ff0040'
      ctx.shadowBlur = 20
      ctx.fillStyle = '#ff0040'
      ctx.fillText('GAME OVER', 200, 170)
      ctx.shadowBlur = 0
      ctx.fillStyle = '#00ff41'
      ctx.font = '6px "Press Start 2P", monospace'
      ctx.fillText(`SCORE: ${s.score}`, 200, 200)
      ctx.font = '5px "Press Start 2P", monospace'
      ctx.fillStyle = '#00cc33'
      ctx.fillText('PRESS RESTART', 200, 230)
      return
    }

    // Active powerup glow overlay
    if (s.activePowerup) {
      const colors: Record<string, string> = {
        invisibility: 'rgba(0,200,255,0.04)',
        rush: 'rgba(255,200,0,0.05)',
        ghost: 'rgba(180,0,255,0.04)',
        magnet: 'rgba(255,50,50,0.04)',
        freeze: 'rgba(0,150,255,0.05)',
        shield: 'rgba(0,255,100,0.05)',
      }
      ctx.fillStyle = colors[s.activePowerup] || 'transparent'
      ctx.fillRect(0, 0, 400, 400)
    }

    // Food
    const fx = s.food.x * CELL + CELL / 2
    const fy = s.food.y * CELL + CELL / 2
    const foodPulse = 0.5 + 0.5 * Math.sin(Date.now() / 200)
    ctx.shadowColor = '#ff3030'
    ctx.shadowBlur = 10 + foodPulse * 8
    ctx.fillStyle = `rgb(255,${60 + foodPulse * 80},60)`
    ctx.beginPath()
    ctx.arc(fx, fy, CELL / 2 - 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    // Snake
    s.snake.forEach((seg, i) => {
      const isHead = i === 0
      const t = i / s.snake.length
      const isInvisible = s.activePowerup === 'invisibility'
      const isGhost = s.activePowerup === 'ghost'
      const isRush = s.activePowerup === 'rush'
      const isShield = s.activePowerup === 'shield' || s.shieldActive

      let r = isInvisible ? 0 : isHead ? 1 : 1 - t * 0.3
      let g = isInvisible ? 0.4 : isRush ? 1 : 1
      let b = isInvisible ? 1 : isGhost ? 0.8 : isShield ? 0.6 : 0
      let a = isInvisible ? 0.3 : 1

      ctx.shadowColor = `rgba(${r * 255},${g * 255},${b * 255},${a})`
      ctx.shadowBlur = isHead ? 12 : 6
      ctx.fillStyle = `rgba(${r * 255},${g * 255},${b * 255},${a})`
      const padding = isHead ? 1 : 2
      ctx.fillRect(seg.x * CELL + padding, seg.y * CELL + padding, CELL - padding * 2, CELL - padding * 2)

      // Head eyes
      if (isHead) {
        ctx.shadowBlur = 0
        ctx.fillStyle = '#030e03'
        const eyeSize = 2
        if (s.dir === 'RIGHT' || s.dir === 'LEFT') {
          const ex = s.dir === 'RIGHT' ? seg.x * CELL + CELL - 5 : seg.x * CELL + 3
          ctx.fillRect(ex, seg.y * CELL + 4, eyeSize, eyeSize)
          ctx.fillRect(ex, seg.y * CELL + CELL - 6, eyeSize, eyeSize)
        } else {
          const ey = s.dir === 'DOWN' ? seg.y * CELL + CELL - 5 : seg.y * CELL + 3
          ctx.fillRect(seg.x * CELL + 4, ey, eyeSize, eyeSize)
          ctx.fillRect(seg.x * CELL + CELL - 6, ey, eyeSize, eyeSize)
        }
      }
    })
    ctx.shadowBlur = 0

    // Score HUD
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(4, 4, 100, 16)
    ctx.fillStyle = '#00ff41'
    ctx.font = '5px "Press Start 2P", monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`SCORE: ${s.score}`, 8, 15)

    // Powerup timer bar
    if (s.activePowerup && s.powerupEnd > 0) {
      const now = Date.now()
      const remaining = Math.max(0, s.powerupEnd - now)
      const total = (() => {
        const map: Record<string, number> = { invisibility: 5000, rush: 8000, ghost: 5000, magnet: 6000, freeze: 3000 }
        return map[s.activePowerup!] || 5000
      })()
      const pct = remaining / total
      const icons: Record<string, string> = { invisibility: '👻', rush: '⚡', ghost: '🌀', magnet: '🧲', freeze: '❄️', shield: '🛡️' }

      ctx.fillStyle = 'rgba(0,0,0,0.5)'
      ctx.fillRect(4, 384, 392, 12)
      ctx.fillStyle = '#00ff41'
      ctx.shadowColor = '#00ff41'
      ctx.shadowBlur = 4
      ctx.fillRect(4, 384, pct * 392, 12)
      ctx.shadowBlur = 0
      ctx.fillStyle = '#000'
      ctx.font = '5px "Press Start 2P", monospace'
      ctx.textAlign = 'center'
      ctx.fillText(`${icons[s.activePowerup]} ${s.activePowerup.toUpperCase()} ${(remaining / 1000).toFixed(1)}s`, 200, 393)
    }
  }, [highScore])

  const tick = useCallback((timestamp: number) => {
    const s = stateRef.current
    if (!s.running) return

    const speed = getSpeed()
    const elapsed = timestamp - lastTimeRef.current

    // Freeze time: pause movement
    if (s.activePowerup === 'freeze' && s.powerupEnd > Date.now()) {
      draw()
      animRef.current = requestAnimationFrame(tick)
      return
    }

    if (elapsed >= speed) {
      lastTimeRef.current = timestamp
      s.frame++
      s.dir = s.nextDir

      const head = { ...s.snake[0] }
      const isGhost = s.activePowerup === 'ghost' && s.powerupEnd > Date.now()

      if (s.dir === 'UP') head.y--
      if (s.dir === 'DOWN') head.y++
      if (s.dir === 'LEFT') head.x--
      if (s.dir === 'RIGHT') head.x++

      // Wall collision
      if (isGhost) {
        if (head.x < 0) head.x = GRID - 1
        if (head.x >= GRID) head.x = 0
        if (head.y < 0) head.y = GRID - 1
        if (head.y >= GRID) head.y = 0
      } else if (head.x < 0 || head.x >= GRID || head.y < 0 || head.y >= GRID) {
        if (s.shieldActive) {
          s.shieldActive = false
          s.activePowerup = null
          head.x = Math.max(0, Math.min(GRID - 1, head.x))
          head.y = Math.max(0, Math.min(GRID - 1, head.y))
        } else {
          s.running = false; s.dead = true
          onGameOver(s.score)
          draw(); return
        }
      }

      // Self collision
      const isInvisible = s.activePowerup === 'invisibility' && s.powerupEnd > Date.now()
      const selfHit = !isInvisible && s.snake.slice(1).some(seg => seg.x === head.x && seg.y === head.y)
      if (selfHit) {
        if (s.shieldActive) {
          s.shieldActive = false
          s.activePowerup = null
        } else {
          s.running = false; s.dead = true
          onGameOver(s.score)
          draw(); return
        }
      }

      // Food magnet
      if (s.activePowerup === 'magnet' && s.powerupEnd > Date.now()) {
        s.foodMoveCooldown--
        if (s.foodMoveCooldown <= 0) {
          s.foodMoveCooldown = 3
          const dx = Math.sign(head.x - s.food.x)
          const dy = Math.sign(head.y - s.food.y)
          const nfx = s.food.x + dx
          const nfy = s.food.y + dy
          if (nfx >= 0 && nfx < GRID && nfy >= 0 && nfy < GRID) {
            s.food = { x: nfx, y: nfy }
          }
        }
      }

      const ate = head.x === s.food.x && head.y === s.food.y
      s.snake = [head, ...s.snake]
      if (ate) {
        const multiplier = s.activePowerup === 'rush' && s.powerupEnd > Date.now() ? 2 : 1
        s.score += 10 * multiplier
        onScore(s.score, s.powerupUsedThisGame)
        s.food = newFood(s.snake)
      } else {
        s.snake.pop()
      }

      // Powerup expiry check
      if (s.activePowerup && s.activePowerup !== 'shield' && s.powerupEnd > 0 && Date.now() > s.powerupEnd) {
        s.activePowerup = null
        s.powerupEnd = 0
      }
    }

    draw()
    animRef.current = requestAnimationFrame(tick)
  }, [draw, getSpeed, onGameOver, onScore])

  const restart = useCallback(() => {
    const s = stateRef.current
    s.snake = [{ x: 10, y: 10 }]
    s.dir = 'RIGHT'
    s.nextDir = 'RIGHT'
    s.food = { x: 15, y: 10 }
    s.score = 0
    s.dead = false
    s.running = true
    s.activePowerup = null
    s.powerupEnd = 0
    s.shieldActive = false
    s.powerupUsedThisGame = null
    s.frame = 0
    cancelAnimationFrame(animRef.current)
    lastTimeRef.current = performance.now()
    animRef.current = requestAnimationFrame(tick)
    onStart()
  }, [tick, onStart])

  const activatePowerupFn = useCallback((key: PowerupKey) => {
    const s = stateRef.current
    if (!s.running || s.activePowerup) return
    s.activePowerup = key
    s.powerupUsedThisGame = key
    const durations: Record<string, number> = { invisibility: 5000, rush: 8000, ghost: 5000, magnet: 6000, freeze: 3000 }
    if (key === 'shield') {
      s.shieldActive = true
      s.powerupEnd = 0
    } else {
      s.powerupEnd = Date.now() + (durations[key] || 5000)
    }
  }, [])

  useEffect(() => {
    gameRef.current = { restart, activatePowerup: activatePowerupFn }
  }, [restart, activatePowerupFn, gameRef])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const s = stateRef.current
      const dirs: Record<string, Direction> = { ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT', w: 'UP', s: 'DOWN', a: 'LEFT', d: 'RIGHT' }
      const opposites: Record<Direction, Direction> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' }
      const newDir = dirs[e.key]
      if (newDir) {
        e.preventDefault()
        if (!s.running && !s.dead) { restart(); return }
        if (newDir !== opposites[s.dir]) s.nextDir = newDir
      }
    }
    window.addEventListener('keydown', handler)
    draw()
    return () => { window.removeEventListener('keydown', handler); cancelAnimationFrame(animRef.current) }
  }, [restart, draw])

  const handleDir = (dir: Direction) => {
    const s = stateRef.current
    const opposites: Record<Direction, Direction> = { UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT' }
    if (!s.running && !s.dead) { restart(); return }
    if (dir !== opposites[s.dir]) s.nextDir = dir
  }

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={400}
      style={{ display: 'block', imageRendering: 'pixelated' }}
    />
  )
}
