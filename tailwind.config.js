/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        phosphor: '#00ff41',
        phosphorDim: '#00cc33',
        phosphorGlow: '#39ff14',
        arcade: {
          dark: '#0a0f0a',
          darker: '#050805',
          panel: '#1a1f1a',
          beige: '#c8b89a',
          shadow: '#2d2d2d',
        }
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        mono: ['"Share Tech Mono"', 'monospace'],
      },
      animation: {
        'scanline': 'scanline 8s linear infinite',
        'flicker': 'flicker 0.15s infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'power-on': 'powerOn 1.5s ease-out forwards',
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' }
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.97' }
        },
        glowPulse: {
          '0%, 100%': { textShadow: '0 0 10px #00ff41, 0 0 20px #00ff41' },
          '50%': { textShadow: '0 0 20px #00ff41, 0 0 40px #00ff41, 0 0 60px #00ff41' }
        },
        powerOn: {
          '0%': { opacity: '0', transform: 'scaleY(0.01)' },
          '20%': { opacity: '0.8', transform: 'scaleY(0.01)' },
          '40%': { transform: 'scaleY(1.05)' },
          '60%': { transform: 'scaleY(0.95)' },
          '100%': { opacity: '1', transform: 'scaleY(1)' }
        }
      }
    },
  },
  plugins: [],
}
