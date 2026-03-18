'use client'
import { useCallback } from 'react'
import { PowerupKey, PowerupData } from './SnakeGame'
import { JoystickPanel, ActionPanel } from './ControlPanels'

export type ControlLayout = 'buttons-left' | 'buttons-right'

export const CTRL_NATURAL_W = 500

interface Props {
  onDirection:       (dir: 'UP'|'DOWN'|'LEFT'|'RIGHT') => void
  onRestart:         () => void
  onPowerupBtn:      () => void
  isPowerupMenuOpen: boolean
  availablePowerups: PowerupData[]
  activePowerupKey:  PowerupKey | null
  isLoggedIn:        boolean
  layout:            ControlLayout
}

export default function ArcadeController({
  onDirection, onRestart, onPowerupBtn, isPowerupMenuOpen,
  availablePowerups, activePowerupKey, isLoggedIn, layout,
}: Props) {

  const handleDir = useCallback((dir: 'UP'|'DOWN'|'LEFT'|'RIGHT') => {
    if (isPowerupMenuOpen) {
      if (dir==='UP'  || dir==='LEFT')  window.dispatchEvent(new Event('menu:up'))
      if (dir==='DOWN'|| dir==='RIGHT') window.dispatchEvent(new Event('menu:down'))
    } else { onDirection(dir) }
  }, [isPowerupMenuOpen, onDirection])

  const handleStart = useCallback(() => {
    if (isPowerupMenuOpen) window.dispatchEvent(new Event('menu:confirm'))
    else onRestart()
  }, [isPowerupMenuOpen, onRestart])

  const joystick = (
    <div className="section">
      <div className="slbl">JOYSTICK</div>
      <JoystickPanel onDir={handleDir} />
    </div>
  )

  const actions = (
    <div className="section">
      <ActionPanel
        onStart={handleStart}
        onPower={onPowerupBtn}
        isPowerupMenuOpen={isPowerupMenuOpen}
        availablePowerups={availablePowerups}
        activePowerupKey={activePowerupKey}
        isLoggedIn={isLoggedIn}
      />
    </div>
  )

  const divider = (
    <div className="divider">
      <div className="dl"/>
      <div className="coin"><div className="slot"/><span className="ct">COIN</span></div>
      <div className="dl"/>
    </div>
  )

  // 'buttons-left' → actions | divider | joystick
  // 'buttons-right' → joystick | divider | actions
  const left  = layout === 'buttons-left'  ? actions  : joystick
  const right = layout === 'buttons-left'  ? joystick : actions

  return (
    <div className="ctrl">
      {left}
      {divider}
      {right}
      <style jsx>{`
        .ctrl {
          width:500px; display:flex; gap:6px; align-items:center;
          background:linear-gradient(160deg,#2e2418,#201a0e 50%,#181208);
          border:1.5px solid #3a2e1a; border-top:none;
          border-radius:0 0 24px 24px; padding:18px 18px 24px;
          box-shadow:5px 5px 0 #0a0806,10px 10px 0 rgba(0,0,0,0.25),
            inset 0 1px 0 rgba(255,255,255,0.025),inset 0 -6px 24px rgba(0,0,0,0.5);
          position:relative;
        }
        .ctrl::before{content:'';position:absolute;top:0;left:20px;right:20px;height:1px;
          background:linear-gradient(90deg,transparent,rgba(255,176,0,0.08),transparent)}
        .section{display:flex;flex-direction:column;align-items:center;gap:8px;flex:1}
        .slbl{font-family:'Press Start 2P',monospace;font-size:5px;color:#5a4820;letter-spacing:2px}
        .divider{display:flex;flex-direction:column;align-items:center;gap:8px;padding:0 4px}
        .dl{width:2px;flex:1;min-height:20px;background:linear-gradient(180deg,transparent,#2a2010,transparent)}
        .coin{display:flex;flex-direction:column;align-items:center;gap:3px}
        .slot{width:30px;height:5px;background:#080502;border-radius:3px;border:1px solid #1a1408;
          box-shadow:inset 0 2px 4px rgba(0,0,0,0.9)}
        .ct{font-family:'Press Start 2P',monospace;font-size:4px;color:#3a2a10}
      `}</style>
    </div>
  )
}
