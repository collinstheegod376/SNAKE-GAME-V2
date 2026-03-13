'use client'
import { useEffect, useRef, useCallback, useState } from 'react'

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
  onScore: (score: number, powerupUsed: string | null) => void
  onGameOver: (score: number) => void
  grantedPowerups: PowerupData[]
  gameRef: React.MutableRefObject<GameAPI | null>
  isPlaying: boolean
  onStart: () => void
  highScore: number
}

export interface GameAPI {
  restart: () => void
  activatePowerup: (key: PowerupKey) => void
  moveDir: (dir: Direction) => void
  getState: () => { running: boolean; dead: boolean; paused: boolean }
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

// Amber palette
const AMBER = '#ffb000'
const AMBER_DIM = '#cc8800'
const AMBER_DARK = '#331a00'
const CYAN = '#00e5ff'
const BG = '#0a0703'

export default function SnakeGame({ onScore, onGameOver, grantedPowerups, gameRef, isPlaying, onStart, highScore }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({
    snake: [{ x: 10, y: 10 }] as Pos[],
    dir: 'RIGHT' as Direction,
    nextDir: 'RIGHT' as Direction,
    food: { x: 15, y: 10 } as Pos,
    score: 0,
    running: false,
    dead: false,
    paused: false,
    activePowerup: null as PowerupKey | null,
    powerupEnd: 0,
    shieldActive: false,
    powerupUsedThisGame: null as string | null,
    foodMoveCooldown: 0,
    lastFoodPos: { x: 15, y: 10 } as Pos,
  })
  const animRef = useRef<number>(0)
  const lastTimeRef = useRef<number>(0)
  const lastTickRef = useRef<number>(0)

  const getSpeed = useCallback(() => {
    return stateRef.current.activePowerup === 'rush' ? 60 : 130
  }, [])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const s = stateRef.current

    ctx.fillStyle = BG
    ctx.fillRect(0, 0, 400, 400)

    // Grid
    for (let x = 0; x < GRID; x++) for (let y = 0; y < GRID; y++) {
      ctx.fillStyle = 'rgba(255,176,0,0.04)'
      ctx.fillRect(x * CELL + CELL/2 - 0.5, y * CELL + CELL/2 - 0.5, 1, 1)
    }

    if (!s.running && !s.dead && !s.paused) {
      // Start screen
      ctx.textAlign = 'center'
      ctx.fillStyle = AMBER
      ctx.shadowColor = AMBER
      ctx.shadowBlur = 24
      ctx.font = 'bold 14px "Press Start 2P", monospace'
      ctx.fillText('SNAKE', 200, 150)
      ctx.shadowBlur = 12
      ctx.font = '6px "Press Start 2P", monospace'
      ctx.fillStyle = AMBER_DIM
      ctx.fillText('PRESS START OR', 200, 188)
      ctx.fillText('MOVE TO PLAY', 200, 204)
      if (highScore > 0) {
        ctx.shadowBlur = 6
        ctx.font = '5px "Press Start 2P", monospace'
        ctx.fillStyle = '#cc8800'
        ctx.fillText(`BEST: ${highScore}`, 200, 234)
      }
      ctx.shadowBlur = 0
      return
    }

    if (s.dead) {
      ctx.textAlign = 'center'
      ctx.shadowColor = '#ff4400'
      ctx.shadowBlur = 24
      ctx.fillStyle = '#ff4400'
      ctx.font = 'bold 12px "Press Start 2P", monospace'
      ctx.fillText('GAME OVER', 200, 165)
      ctx.shadowBlur = 0
      ctx.fillStyle = AMBER
      ctx.font = '7px "Press Start 2P", monospace'
      ctx.fillText(`SCORE: ${s.score}`, 200, 196)
      ctx.fillStyle = AMBER_DIM
      ctx.font = '5px "Press Start 2P", monospace'
      ctx.fillText('PRESS START', 200, 226)
      return
    }

    // Powerup tint
    if (s.activePowerup) {
      const tints: Record<string, string> = {
        invisibility: 'rgba(0,229,255,0.04)',
        rush: 'rgba(255,176,0,0.06)',
        ghost: 'rgba(180,100,255,0.04)',
        magnet: 'rgba(255,80,80,0.04)',
        freeze: 'rgba(100,200,255,0.05)',
        shield: 'rgba(100,255,100,0.04)',
      }
      ctx.fillStyle = tints[s.activePowerup] || 'transparent'
      ctx.fillRect(0, 0, 400, 400)
    }

    // Food
    const fx = s.food.x * CELL + CELL/2
    const fy = s.food.y * CELL + CELL/2
    const fp = 0.5 + 0.5 * Math.sin(Date.now() / 220)
    ctx.shadowColor = '#ff6600'
    ctx.shadowBlur = 10 + fp * 8
    ctx.fillStyle = `rgb(255,${100 + fp * 80},20)`
    ctx.beginPath()
    ctx.arc(fx, fy, CELL/2 - 2, 0, Math.PI * 2)
    ctx.fill()
    ctx.shadowBlur = 0

    // Snake
    s.snake.forEach((seg, i) => {
      const isHead = i === 0
      const t = i / Math.max(s.snake.length - 1, 1)
      const inv = s.activePowerup === 'invisibility' && s.powerupEnd > Date.now()
      const rush = s.activePowerup === 'rush' && s.powerupEnd > Date.now()
      const ghost = s.activePowerup === 'ghost' && s.powerupEnd > Date.now()
      const shield = s.activePowerup === 'shield' || s.shieldActive

      let color: string
      if (inv) color = `rgba(0,229,255,${isHead ? 0.5 : 0.2})`
      else if (rush) color = `rgba(255,${200 - t*80},0,1)`
      else if (ghost) color = `rgba(200,150,255,${1 - t*0.4})`
      else if (shield) color = `rgba(100,255,150,${1 - t*0.3})`
      else color = isHead ? AMBER : `rgba(255,${176 - t*80},0,${1 - t*0.3})`

      ctx.shadowColor = color
      ctx.shadowBlur = isHead ? 10 : 5
      ctx.fillStyle = color
      const p = isHead ? 1 : 2
      ctx.fillRect(seg.x * CELL + p, seg.y * CELL + p, CELL - p*2, CELL - p*2)

      if (isHead) {
        ctx.shadowBlur = 0
        ctx.fillStyle = BG
        const e = 2
        if (s.dir === 'RIGHT' || s.dir === 'LEFT') {
          const ex = s.dir === 'RIGHT' ? seg.x*CELL+CELL-5 : seg.x*CELL+3
          ctx.fillRect(ex, seg.y*CELL+4, e, e)
          ctx.fillRect(ex, seg.y*CELL+CELL-6, e, e)
        } else {
          const ey = s.dir === 'DOWN' ? seg.y*CELL+CELL-5 : seg.y*CELL+3
          ctx.fillRect(seg.x*CELL+4, ey, e, e)
          ctx.fillRect(seg.x*CELL+CELL-6, ey, e, e)
        }
      }
    })
    ctx.shadowBlur = 0

    // Score HUD
    ctx.fillStyle = 'rgba(0,0,0,0.55)'
    ctx.fillRect(4, 4, 110, 16)
    ctx.fillStyle = AMBER
    ctx.font = '5px "Press Start 2P", monospace'
    ctx.textAlign = 'left'
    ctx.fillText(`SCORE: ${s.score}`, 8, 15)

    // Powerup bar
    if (s.activePowerup && s.powerupEnd > 0) {
      const now = Date.now()
      const rem = Math.max(0, s.powerupEnd - now)
      const totals: Record<string, number> = { invisibility:5000, rush:8000, ghost:5000, magnet:6000, freeze:3000 }
      const total = totals[s.activePowerup] || 5000
      const pct = rem / total
      const icons: Record<string, string> = { invisibility:'👻', rush:'⚡', ghost:'🌀', magnet:'🧲', freeze:'❄️', shield:'🛡️' }
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.fillRect(4, 382, 392, 14)
      ctx.fillStyle = AMBER
      ctx.shadowColor = AMBER
      ctx.shadowBlur = 4
      ctx.fillRect(4, 382, pct * 392, 14)
      ctx.shadowBlur = 0
      ctx.fillStyle = '#000'
      ctx.font = '5px "Press Start 2P", monospace'
      ctx.textAlign = 'center'
      ctx.fillText(`${icons[s.activePowerup]} ${s.activePowerup.toUpperCase()} ${(rem/1000).toFixed(1)}s`, 200, 392)
    }
  }, [highScore])

  const tick = useCallback((timestamp: number) => {
    const s = stateRef.current
    if (!s.running || s.paused) {
      draw()
      animRef.current = requestAnimationFrame(tick)
      return
    }

    const speed = getSpeed()

    // Freeze: skip movement but keep loop alive
    if (s.activePowerup === 'freeze' && s.powerupEnd > Date.now()) {
      draw()
      animRef.current = requestAnimationFrame(tick)
      return
    }

    const elapsed = timestamp - lastTickRef.current
    if (elapsed >= speed) {
      lastTickRef.current = timestamp
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
          s.shieldActive = false; s.activePowerup = null
          head.x = Math.max(0, Math.min(GRID-1, head.x))
          head.y = Math.max(0, Math.min(GRID-1, head.y))
        } else {
          s.running = false; s.dead = true
          onGameOver(s.score); draw(); return
        }
      }

      // Self collision
      const isInv = s.activePowerup === 'invisibility' && s.powerupEnd > Date.now()
      if (!isInv && s.snake.slice(1).some(seg => seg.x === head.x && seg.y === head.y)) {
        if (s.shieldActive) {
          s.shieldActive = false; s.activePowerup = null
        } else {
          s.running = false; s.dead = true
          onGameOver(s.score); draw(); return
        }
      }

      // Magnet
      if (s.activePowerup === 'magnet' && s.powerupEnd > Date.now()) {
        s.foodMoveCooldown--
        if (s.foodMoveCooldown <= 0) {
          s.foodMoveCooldown = 3
          const dx = Math.sign(head.x - s.food.x)
          const dy = Math.sign(head.y - s.food.y)
          const nfx = s.food.x + dx, nfy = s.food.y + dy
          if (nfx >= 0 && nfx < GRID && nfy >= 0 && nfy < GRID) s.food = { x: nfx, y: nfy }
        }
      }

      const ate = head.x === s.food.x && head.y === s.food.y
      // Build new snake array fresh each tick — avoids mutation bugs causing freeze
      const newSnake = [head, ...s.snake]
      if (ate) {
        const mult = s.activePowerup === 'rush' && s.powerupEnd > Date.now() ? 2 : 1
        s.score += 10 * mult
        s.snake = newSnake
        // Generate food immediately in same tick — never defer
        s.food = newFood(s.snake)
        onScore(s.score, s.powerupUsedThisGame)
      } else {
        newSnake.pop()
        s.snake = newSnake
      }

      // Powerup expiry
      if (s.activePowerup && s.activePowerup !== 'shield' && s.powerupEnd > 0 && Date.now() > s.powerupEnd) {
        s.activePowerup = null; s.powerupEnd = 0
      }
    }

    draw()
    animRef.current = requestAnimationFrame(tick)
  }, [draw, getSpeed, onGameOver, onScore])

  const restart = useCallback(() => {
    const s = stateRef.current
    s.snake = [{ x: 10, y: 10 }]
    s.dir = 'RIGHT'; s.nextDir = 'RIGHT'
    s.food = newFood([{ x: 10, y: 10 }])
    s.score = 0; s.dead = false; s.running = true; s.paused = false
    s.activePowerup = null; s.powerupEnd = 0
    s.shieldActive = false; s.powerupUsedThisGame = null
    s.foodMoveCooldown = 0
    cancelAnimationFrame(animRef.current)
    lastTickRef.current = performance.now()
    animRef.current = requestAnimationFrame(tick)
    onStart()
  }, [tick, onStart])

  const activatePowerupFn = useCallback((key: PowerupKey) => {
    const s = stateRef.current
    if (!s.running || s.activePowerup) return
    s.activePowerup = key
    s.powerupUsedThisGame = key
    const durations: Record<string, number> = { invisibility:5000, rush:8000, ghost:5000, magnet:6000, freeze:3000 }
    if (key === 'shield') { s.shieldActive = true; s.powerupEnd = 0 }
    else s.powerupEnd = Date.now() + (durations[key] || 5000)
    s.paused = false
  }, [])

  const moveDir = useCallback((dir: Direction) => {
    const s = stateRef.current
    const opp: Record<Direction, Direction> = { UP:'DOWN', DOWN:'UP', LEFT:'RIGHT', RIGHT:'LEFT' }
    if (!s.running && !s.dead) { restart(); return }
    if (dir !== opp[s.dir]) s.nextDir = dir
  }, [restart])

  useEffect(() => {
    gameRef.current = {
      restart,
      activatePowerup: activatePowerupFn,
      moveDir,
      getState: () => ({
        running: stateRef.current.running,
        dead: stateRef.current.dead,
        paused: stateRef.current.paused,
      })
    }
  }, [restart, activatePowerupFn, moveDir, gameRef])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const dirs: Record<string, Direction> = { ArrowUp:'UP', ArrowDown:'DOWN', ArrowLeft:'LEFT', ArrowRight:'RIGHT', w:'UP', s:'DOWN', a:'LEFT', d:'RIGHT' }
      const dir = dirs[e.key]
      if (dir) { e.preventDefault(); moveDir(dir) }
    }
    window.addEventListener('keydown', handler)
    draw()
    return () => { window.removeEventListener('keydown', handler); cancelAnimationFrame(animRef.current) }
  }, [moveDir, draw])

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={400}
      style={{ display: 'block', imageRendering: 'pixelated', width: '100%', height: '100%' }}
    />
  )
}
