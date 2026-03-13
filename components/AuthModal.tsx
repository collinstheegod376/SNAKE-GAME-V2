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
      onAuth(data.player); onClose()
    } catch { setError('Connection error') }
    finally { setLoading(false) }
  }

  return (
    <div className="overlay">
      <div className="modal">
        <button className="close" onClick={onClose}>✕</button>
        <div className="modal-header">
          <div className="modal-icon">🕹</div>
          <div className="modal-title">{mode === 'login' ? 'PLAYER LOGIN' : 'NEW PLAYER'}</div>
          <div className="modal-sub">{mode === 'login' ? 'Enter your credentials' : 'Create your arcade account'}</div>
        </div>

        <div className="tabs">
          <button className={`tab ${mode === 'login' ? 'active' : ''}`} onClick={() => setMode('login')}>LOGIN</button>
          <button className={`tab ${mode === 'register' ? 'active' : ''}`} onClick={() => setMode('register')}>REGISTER</button>
        </div>

        <form onSubmit={submit} className="form">
          <div className="field">
            <label>USERNAME</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
              placeholder="ENTER NAME" maxLength={20} autoComplete="username" required />
          </div>
          <div className="field">
            <label>PASSWORD</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required />
          </div>
          {error && <div className="err">⚠ {error}</div>}
          <button type="submit" className="submit" disabled={loading}>
            {loading ? '...' : mode === 'login' ? '▶ START' : '▶ CREATE'}
          </button>
        </form>

        {mode === 'register' && (
          <div className="bonus">✦ NEW PLAYERS GET FREE INVISIBILITY ORB!</div>
        )}
      </div>

      <style jsx>{`
        .overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.88);
          display: flex; align-items: center; justify-content: center;
          z-index: 100; backdrop-filter: blur(6px);
        }
        .modal {
          background: linear-gradient(160deg, #1e1608 0%, #120e04 100%);
          border: 1px solid rgba(255,176,0,0.25);
          border-radius: 10px; padding: 28px; width: 340px;
          position: relative;
          box-shadow: 0 0 60px rgba(255,176,0,0.1), inset 0 1px 0 rgba(255,176,0,0.08);
        }
        .close {
          position: absolute; top: 12px; right: 14px;
          background: none; border: none;
          color: #6a5020; font-size: 14px; cursor: pointer;
          font-family: 'Share Tech Mono', monospace; transition: color 0.15s;
        }
        .close:hover { color: var(--amber); }
        .modal-header { text-align: center; margin-bottom: 18px; }
        .modal-icon { font-size: 28px; margin-bottom: 8px; }
        .modal-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 12px; color: var(--amber);
          text-shadow: 0 0 16px rgba(255,176,0,0.4);
          margin-bottom: 6px;
        }
        .modal-sub { font-family: 'Share Tech Mono', monospace; font-size: 11px; color: #6a5020; }
        .tabs {
          display: flex; border: 1px solid rgba(255,176,0,0.15);
          border-radius: 4px; overflow: hidden; margin-bottom: 18px;
        }
        .tab {
          flex: 1; background: transparent; border: none;
          color: #6a5020; font-family: 'Press Start 2P', monospace;
          font-size: 6px; padding: 10px; cursor: pointer; transition: all 0.15s;
        }
        .tab.active {
          background: rgba(255,176,0,0.1); color: var(--amber);
          text-shadow: 0 0 8px rgba(255,176,0,0.4);
        }
        .tab:hover:not(.active) { background: rgba(255,176,0,0.05); color: #aa7820; }
        .form { display: flex; flex-direction: column; gap: 14px; }
        .field { display: flex; flex-direction: column; gap: 5px; }
        .field label {
          font-family: 'Press Start 2P', monospace;
          font-size: 5px; color: #7a6030; letter-spacing: 1px;
        }
        .field input {
          background: rgba(0,0,0,0.4);
          border: 1px solid rgba(255,176,0,0.18);
          border-radius: 4px; color: var(--amber);
          font-family: 'Share Tech Mono', monospace;
          font-size: 14px; padding: 10px 12px; outline: none;
          transition: border-color 0.15s; letter-spacing: 1px;
        }
        .field input:focus { border-color: rgba(255,176,0,0.55); box-shadow: 0 0 10px rgba(255,176,0,0.08); }
        .field input::placeholder { color: #3a2a10; }
        .err {
          font-family: 'Press Start 2P', monospace; font-size: 5px; color: #ff4400;
          padding: 8px; background: rgba(255,68,0,0.05);
          border: 1px solid rgba(255,68,0,0.2); border-radius: 4px;
        }
        .submit {
          background: linear-gradient(180deg, rgba(255,176,0,0.14) 0%, rgba(204,136,0,0.1) 100%);
          border: 1px solid rgba(255,176,0,0.35); border-radius: 4px;
          color: var(--amber); font-family: 'Press Start 2P', monospace;
          font-size: 8px; padding: 14px; cursor: pointer;
          transition: all 0.15s; letter-spacing: 1px;
          text-shadow: 0 0 8px rgba(255,176,0,0.4);
        }
        .submit:hover:not(:disabled) {
          background: linear-gradient(180deg, rgba(255,176,0,0.2) 0%, rgba(204,136,0,0.15) 100%);
          box-shadow: 0 0 20px rgba(255,176,0,0.15);
        }
        .submit:disabled { opacity: 0.5; cursor: not-allowed; }
        .bonus {
          margin-top: 14px;
          font-family: 'Press Start 2P', monospace; font-size: 5px;
          color: var(--cyan); text-align: center;
          text-shadow: 0 0 8px rgba(0,229,255,0.4); letter-spacing: 0.5px;
        }
      `}</style>
    </div>
  )
}
