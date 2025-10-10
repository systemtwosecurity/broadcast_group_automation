-- ============================================
-- State Tracking Database Schema
-- ============================================

-- Users table (mirrors config/users.json)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  is_admin BOOLEAN DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Invitations table (tracks per environment)
CREATE TABLE IF NOT EXISTS invitations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  environment TEXT NOT NULL,
  invitation_sent BOOLEAN DEFAULT 0,
  invitation_sent_at TEXT,
  already_existed BOOLEAN DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, environment),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Groups table (tracks created groups)
CREATE TABLE IF NOT EXISTS groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  environment TEXT NOT NULL,
  group_api_id TEXT,
  group_name TEXT NOT NULL,
  group_created BOOLEAN DEFAULT 0,
  group_created_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, environment),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Sources table (tracks created sources)
CREATE TABLE IF NOT EXISTS sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  environment TEXT NOT NULL,
  group_id INTEGER,
  source_api_id TEXT,
  source_name TEXT NOT NULL,
  source_created BOOLEAN DEFAULT 0,
  source_created_at TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, environment),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (group_id) REFERENCES groups(id)
);

-- Operation logs (audit trail)
CREATE TABLE IF NOT EXISTS operation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_type TEXT NOT NULL,
  user_id TEXT,
  environment TEXT NOT NULL,
  status TEXT NOT NULL,
  error_message TEXT,
  details TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invitations_user_env ON invitations(user_id, environment);
CREATE INDEX IF NOT EXISTS idx_groups_user_env ON groups(user_id, environment);
CREATE INDEX IF NOT EXISTS idx_sources_user_env ON sources(user_id, environment);
CREATE INDEX IF NOT EXISTS idx_operation_logs_type_env ON operation_logs(operation_type, environment);
CREATE INDEX IF NOT EXISTS idx_operation_logs_created ON operation_logs(created_at);

