'use client'
import { useState } from 'react'

interface Props {
  onClose: () => void
  onAuth: (player: any) => void
}

export default function AuthModal({ onClose, onAuth }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      onAuth(data.player)
      onClose()
    } catch { setError('Connection error') }
    finally { setLoading(false) }
  }

  return (
    <div className="modal-overlay">
      <div className="modal">
        <button className="close-btn" onClick={onClose}>✕</button>
        <div className="modal-header">
          <div className="modal-title">{mode === 'login' ? 'INSERT COIN' : 'NEW PLAYER'}</div>
          <div className="modal-sub">{mode === 'login' ? 'Log in to save scores' : 'Create your arcade account'}</div>
        </div>

        <div className="tab-row">
          <button className={`tab ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>LOGIN</button>
          <button className={`tab ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>REGISTER</button>
        </div>

        <form onSubmit={submit} className="modal-form">
          <div className="field">
            <label>USERNAME</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="ENTER NAME"
              maxLength={20}
              autoComplete="username"
              required
            />
          </div>
          <div className="field">
            <label>PASSWORD</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </div>
          {error && <div className="error-msg">⚠ {error}</div>}
          <button type="submit" className="submit-btn" disabled={loading}>
            {loading ? 'LOADING...' : mode === 'login' ? '▶ START GAME' : '▶ CREATE PLAYER'}
          </button>
        </form>

        {mode === 'register' && (
          <div className="bonus-note">✦ NEW PLAYERS GET FREE INVISIBILITY ORB!</div>
        )}
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          backdrop-filter: blur(4px);
        }
        .modal {
          background: linear-gradient(160deg, #0e1a0e 0%, #080e08 100%);
          border: 1px solid rgba(0,255,65,0.3);
          border-radius: 8px;
          padding: 32px;
          width: 360px;
          position: relative;
          box-shadow: 0 0 60px rgba(0,255,65,0.15), inset 0 1px 0 rgba(0,255,65,0.1);
        }
        .close-btn {
          position: absolute;
          top: 12px;
          right: 16px;
          background: none;
          border: none;
          color: #4a7a4a;
          font-size: 14px;
          cursor: pointer;
          font-family: 'Share Tech Mono', monospace;
          transition: color 0.15s;
        }
        .close-btn:hover { color: #00ff41; }
        .modal-header { margin-bottom: 20px; }
        .modal-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 14px;
          color: #00ff41;
          text-shadow: 0 0 20px rgba(0,255,65,0.5);
          margin-bottom: 6px;
        }
        .modal-sub {
          font-family: 'Share Tech Mono', monospace;
          font-size: 11px;
          color: #4a7a4a;
        }
        .tab-row {
          display: flex;
          gap: 0;
          margin-bottom: 20px;
          border: 1px solid rgba(0,255,65,0.2);
          border-radius: 4px;
          overflow: hidden;
        }
        .tab {
          flex: 1;
          background: transparent;
          border: none;
          color: #4a7a4a;
          font-family: 'Press Start 2P', monospace;
          font-size: 7px;
          padding: 10px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .tab.active {
          background: rgba(0,255,65,0.1);
          color: #00ff41;
          text-shadow: 0 0 8px rgba(0,255,65,0.5);
        }
        .tab:hover:not(.active) { background: rgba(0,255,65,0.05); color: #00cc33; }
        .modal-form { display: flex; flex-direction: column; gap: 14px; }
        .field { display: flex; flex-direction: column; gap: 6px; }
        .field label {
          font-family: 'Press Start 2P', monospace;
          font-size: 6px;
          color: #4a8a4a;
          letter-spacing: 1px;
        }
        .field input {
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(0,255,65,0.2);
          border-radius: 4px;
          color: #00ff41;
          font-family: 'Share Tech Mono', monospace;
          font-size: 14px;
          padding: 10px 12px;
          outline: none;
          transition: border-color 0.15s;
          letter-spacing: 1px;
        }
        .field input:focus { border-color: rgba(0,255,65,0.6); box-shadow: 0 0 12px rgba(0,255,65,0.1); }
        .field input::placeholder { color: #2a4a2a; }
        .error-msg {
          font-family: 'Press Start 2P', monospace;
          font-size: 6px;
          color: #ff4444;
          text-shadow: 0 0 8px rgba(255,0,0,0.4);
          padding: 8px;
          background: rgba(255,0,0,0.05);
          border: 1px solid rgba(255,0,0,0.2);
          border-radius: 4px;
        }
        .submit-btn {
          background: linear-gradient(180deg, rgba(0,255,65,0.15) 0%, rgba(0,200,50,0.1) 100%);
          border: 1px solid rgba(0,255,65,0.4);
          border-radius: 4px;
          color: #00ff41;
          font-family: 'Press Start 2P', monospace;
          font-size: 8px;
          padding: 14px;
          cursor: pointer;
          transition: all 0.15s;
          text-shadow: 0 0 8px rgba(0,255,65,0.5);
          letter-spacing: 1px;
        }
        .submit-btn:hover:not(:disabled) {
          background: linear-gradient(180deg, rgba(0,255,65,0.2) 0%, rgba(0,200,50,0.15) 100%);
          box-shadow: 0 0 20px rgba(0,255,65,0.2);
        }
        .submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .bonus-note {
          margin-top: 14px;
          font-family: 'Press Start 2P', monospace;
          font-size: 5px;
          color: #ffcc00;
          text-align: center;
          text-shadow: 0 0 8px rgba(255,200,0,0.4);
          letter-spacing: 0.5px;
        }
      `}</style>
    </div>
  )
}
