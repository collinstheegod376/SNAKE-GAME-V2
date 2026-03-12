-- Snake CRT Game Database Schema

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Players table
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(32) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  high_score INTEGER DEFAULT 0,
  games_played INTEGER DEFAULT 0,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Power-ups catalog
CREATE TABLE IF NOT EXISTS powerups (
  id SERIAL PRIMARY KEY,
  name VARCHAR(64) NOT NULL,
  key VARCHAR(32) UNIQUE NOT NULL,
  description TEXT,
  duration_ms INTEGER,
  icon VARCHAR(8) DEFAULT '⚡'
);

-- Player granted power-ups (junction)
CREATE TABLE IF NOT EXISTS player_powerups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  powerup_key VARCHAR(32) REFERENCES powerups(key) ON DELETE CASCADE,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  granted_by UUID REFERENCES players(id),
  UNIQUE(player_id, powerup_key)
);

-- Scores
CREATE TABLE IF NOT EXISTS scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  powerup_used VARCHAR(32),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Power-up usage log
CREATE TABLE IF NOT EXISTS powerup_usage_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  powerup_key VARCHAR(32),
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed power-ups
INSERT INTO powerups (name, key, description, duration_ms, icon) VALUES
  ('Invisibility Orb', 'invisibility', 'No self-collision for 5 seconds', 5000, '👻'),
  ('Rush Mode', 'rush', '2x speed and 2x score for 8 seconds', 8000, '⚡'),
  ('Ghost Phase', 'ghost', 'Pass through walls for 5 seconds', 5000, '🌀'),
  ('Food Magnet', 'magnet', 'Food moves toward snake head', 6000, '🧲'),
  ('Freeze Time', 'freeze', 'Pause the game clock for 3 seconds', 3000, '❄️'),
  ('Shield', 'shield', 'Block one collision automatically', NULL, '🛡️')
ON CONFLICT (key) DO NOTHING;

-- Default admin (change password after setup!)
-- Password: admin123 (bcrypt hash)
INSERT INTO players (username, password_hash, is_admin) VALUES
  ('admin', '$2b$10$rBnTB.K5Z5K5K5K5K5K5KuK5K5K5K5K5K5K5K5K5K5K5K5K5K5K5K', TRUE)
ON CONFLICT (username) DO NOTHING;
