import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { UserStatus, AllStatus, Environment, OperationType, OperationStatus } from '../types/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class StateDatabase {
  private db: Database.Database;

  constructor(dbPath: string = './data/state.db') {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL'); // Better concurrency
    this.initSchema();
  }

  private initSchema() {
    const schemaSQL = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
    this.db.exec(schemaSQL);
  }

  // ============================================
  // User Management
  // ============================================

  ensureUser(userId: string, email: string, isAdmin: boolean = false) {
    this.db.prepare(`
      INSERT OR IGNORE INTO users (id, email, is_admin)
      VALUES (?, ?, ?)
    `).run(userId, email, isAdmin ? 1 : 0);
  }

  // ============================================
  // Invitation Tracking
  // ============================================

  isUserInvited(userId: string, environment: Environment): boolean {
    const row = this.db.prepare(`
      SELECT invitation_sent, already_existed 
      FROM invitations 
      WHERE user_id = ? AND environment = ?
    `).get(userId, environment) as { invitation_sent: number; already_existed: number } | undefined;
    
    return row ? Boolean(row.invitation_sent || row.already_existed) : false;
  }

  recordInvitation(userId: string, environment: Environment, alreadyExisted: boolean) {
    this.db.prepare(`
      INSERT INTO invitations (user_id, environment, invitation_sent, invitation_sent_at, already_existed)
      VALUES (?, ?, ?, datetime('now'), ?)
      ON CONFLICT(user_id, environment) 
      DO UPDATE SET 
        invitation_sent = ?, 
        invitation_sent_at = datetime('now'), 
        already_existed = ?
    `).run(
      userId,
      environment,
      alreadyExisted ? 0 : 1,
      alreadyExisted ? 1 : 0,
      alreadyExisted ? 0 : 1,
      alreadyExisted ? 1 : 0
    );
  }

  // ============================================
  // Group Tracking
  // ============================================

  isGroupCreated(userId: string, environment: Environment): boolean {
    const row = this.db.prepare(`
      SELECT group_created FROM groups 
      WHERE user_id = ? AND environment = ?
    `).get(userId, environment) as { group_created: number } | undefined;
    
    return row ? Boolean(row.group_created) : false;
  }

  getGroupApiId(userId: string, environment: Environment): string | null {
    const row = this.db.prepare(`
      SELECT group_api_id FROM groups 
      WHERE user_id = ? AND environment = ?
    `).get(userId, environment) as { group_api_id: string | null } | undefined;
    
    return row ? row.group_api_id : null;
  }

  recordGroupCreation(userId: string, environment: Environment, groupApiId: string, groupName: string) {
    this.db.prepare(`
      INSERT INTO groups (user_id, environment, group_api_id, group_name, group_created, group_created_at)
      VALUES (?, ?, ?, ?, 1, datetime('now'))
      ON CONFLICT(user_id, environment) 
      DO UPDATE SET 
        group_api_id = ?, 
        group_created = 1, 
        group_created_at = datetime('now')
    `).run(userId, environment, groupApiId, groupName, groupApiId);
  }

  // ============================================
  // Source Tracking
  // ============================================

  isSourceCreated(userId: string, environment: Environment): boolean {
    const row = this.db.prepare(`
      SELECT source_created FROM sources 
      WHERE user_id = ? AND environment = ?
    `).get(userId, environment) as { source_created: number } | undefined;
    
    return row ? Boolean(row.source_created) : false;
  }

  recordSourceCreation(userId: string, environment: Environment, sourceApiId: string, sourceName: string) {
    const groupRow = this.db.prepare(`
      SELECT id FROM groups WHERE user_id = ? AND environment = ?
    `).get(userId, environment) as { id: number } | undefined;

    this.db.prepare(`
      INSERT INTO sources (user_id, environment, group_id, source_api_id, source_name, source_created, source_created_at)
      VALUES (?, ?, ?, ?, ?, 1, datetime('now'))
      ON CONFLICT(user_id, environment) 
      DO UPDATE SET 
        source_api_id = ?, 
        source_created = 1, 
        source_created_at = datetime('now')
    `).run(userId, environment, groupRow?.id || null, sourceApiId, sourceName, sourceApiId);
  }

  // ============================================
  // Status Queries
  // ============================================

  getUserStatus(userId: string, environment: Environment): UserStatus {
    return {
      invited: this.isUserInvited(userId, environment),
      groupCreated: this.isGroupCreated(userId, environment),
      sourceCreated: this.isSourceCreated(userId, environment),
      groupApiId: this.getGroupApiId(userId, environment)
    };
  }

  getAllStatus(environment: Environment): AllStatus[] {
    return this.db.prepare(`
      SELECT 
        u.id as user_id,
        u.email,
        COALESCE(i.invitation_sent, 0) as invited,
        COALESCE(g.group_created, 0) as group_created,
        g.group_api_id,
        COALESCE(s.source_created, 0) as source_created
      FROM users u
      LEFT JOIN invitations i ON u.id = i.user_id AND i.environment = ?
      LEFT JOIN groups g ON u.id = g.user_id AND g.environment = ?
      LEFT JOIN sources s ON u.id = s.user_id AND s.environment = ?
      WHERE u.is_admin = 0
      ORDER BY u.id
    `).all(environment, environment, environment) as AllStatus[];
  }

  // ============================================
  // Reset Operations
  // ============================================

  resetUser(userId: string, environment: Environment) {
    const transaction = this.db.transaction(() => {
      this.db.prepare(`DELETE FROM invitations WHERE user_id = ? AND environment = ?`).run(userId, environment);
      this.db.prepare(`DELETE FROM sources WHERE user_id = ? AND environment = ?`).run(userId, environment);
      this.db.prepare(`DELETE FROM groups WHERE user_id = ? AND environment = ?`).run(userId, environment);
    });
    
    transaction();
  }

  resetEnvironment(environment: Environment) {
    const transaction = this.db.transaction(() => {
      this.db.prepare(`DELETE FROM invitations WHERE environment = ?`).run(environment);
      this.db.prepare(`DELETE FROM sources WHERE environment = ?`).run(environment);
      this.db.prepare(`DELETE FROM groups WHERE environment = ?`).run(environment);
    });
    
    transaction();
  }

  // ============================================
  // Operation Logging
  // ============================================

  logOperation(
    type: OperationType,
    userId: string,
    environment: Environment,
    status: OperationStatus,
    error?: string,
    details?: any
  ) {
    this.db.prepare(`
      INSERT INTO operation_logs (operation_type, user_id, environment, status, error_message, details)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(type, userId, environment, status, error || null, details ? JSON.stringify(details) : null);
  }

  // ============================================
  // Cleanup
  // ============================================

  close() {
    this.db.close();
  }
}

