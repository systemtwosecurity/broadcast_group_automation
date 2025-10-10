import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StateDatabase } from './db.js';
import { unlinkSync, existsSync } from 'fs';

const TEST_DB_PATH = './data/test.db';

describe('StateDatabase', () => {
  let db: StateDatabase;

  beforeEach(() => {
    // Clean up any existing test database
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }
    db = new StateDatabase(TEST_DB_PATH);
  });

  afterEach(() => {
    db.close();
    if (existsSync(TEST_DB_PATH)) {
      unlinkSync(TEST_DB_PATH);
    }
  });

  describe('User Management', () => {
    it('should ensure a user exists', () => {
      db.ensureUser('user1', 'user1@example.com');
      const status = db.getUserStatus('user1', 'dev');
      expect(status).toBeDefined();
    });

    it('should handle duplicate user additions gracefully', () => {
      db.ensureUser('user1', 'user1@example.com');
      db.ensureUser('user1', 'user1@example.com'); // Duplicate
      // Should not throw error
      const status = db.getUserStatus('user1', 'dev');
      expect(status).toBeDefined();
    });

    it('should support admin users', () => {
      db.ensureUser('admin', 'admin@example.com', true);
      // Admin users exist but won't show in getAllStatus
      const allStatus = db.getAllStatus('dev');
      const adminUser = allStatus.find(u => u.user_id === 'admin');
      expect(adminUser).toBeUndefined(); // Admin users are filtered out
    });
  });

  describe('Invitation Tracking', () => {
    beforeEach(() => {
      db.ensureUser('user1', 'user1@example.com');
    });

    it('should record an invitation', () => {
      db.recordInvitation('user1', 'dev', false);
      const isInvited = db.isUserInvited('user1', 'dev');
      expect(isInvited).toBe(true);
    });

    it('should return false for non-invited user', () => {
      const isInvited = db.isUserInvited('user1', 'dev');
      expect(isInvited).toBe(false);
    });

    it('should track invitations per environment', () => {
      db.recordInvitation('user1', 'dev', false);
      expect(db.isUserInvited('user1', 'dev')).toBe(true);
      expect(db.isUserInvited('user1', 'qa')).toBe(false);
    });

    it('should handle duplicate invitations gracefully', () => {
      db.recordInvitation('user1', 'dev', false);
      db.recordInvitation('user1', 'dev', false); // Duplicate
      expect(db.isUserInvited('user1', 'dev')).toBe(true);
    });

    it('should track if user already existed', () => {
      db.recordInvitation('user1', 'dev', true); // Already existed
      expect(db.isUserInvited('user1', 'dev')).toBe(true);
    });
  });

  describe('Group Tracking', () => {
    beforeEach(() => {
      db.ensureUser('user1', 'user1@example.com');
    });

    it('should record a group creation', () => {
      db.recordGroupCreation('user1', 'dev', 'group-123', 'Test Group');
      const isCreated = db.isGroupCreated('user1', 'dev');
      expect(isCreated).toBe(true);
    });

    it('should return false for non-created group', () => {
      const isCreated = db.isGroupCreated('user1', 'dev');
      expect(isCreated).toBe(false);
    });

    it('should retrieve group API ID', () => {
      db.recordGroupCreation('user1', 'dev', 'group-123', 'Test Group');
      const groupId = db.getGroupApiId('user1', 'dev');
      expect(groupId).toBe('group-123');
    });

    it('should return null for non-existent group ID', () => {
      const groupId = db.getGroupApiId('user1', 'dev');
      expect(groupId).toBeNull();
    });

    it('should track groups per environment', () => {
      db.recordGroupCreation('user1', 'dev', 'group-123', 'Test Group');
      expect(db.isGroupCreated('user1', 'dev')).toBe(true);
      expect(db.isGroupCreated('user1', 'qa')).toBe(false);
    });
  });

  describe('Source Tracking', () => {
    beforeEach(() => {
      db.ensureUser('user1', 'user1@example.com');
      db.recordGroupCreation('user1', 'dev', 'group-123', 'Test Group');
    });

    it('should record a source creation', () => {
      db.recordSourceCreation('user1', 'dev', 'source-456', 'Test Source');
      const isCreated = db.isSourceCreated('user1', 'dev');
      expect(isCreated).toBe(true);
    });

    it('should return false for non-created source', () => {
      const isCreated = db.isSourceCreated('user1', 'dev');
      expect(isCreated).toBe(false);
    });

    it('should track sources per environment', () => {
      db.recordSourceCreation('user1', 'dev', 'source-456', 'Test Source');
      expect(db.isSourceCreated('user1', 'dev')).toBe(true);
      expect(db.isSourceCreated('user1', 'qa')).toBe(false);
    });
  });

  describe('Status Queries', () => {
    beforeEach(() => {
      db.ensureUser('user1', 'user1@example.com');
      db.recordInvitation('user1', 'dev', false);
      db.recordGroupCreation('user1', 'dev', 'group-123', 'Test Group');
      db.recordSourceCreation('user1', 'dev', 'source-456', 'Test Source');
    });

    it('should get complete user status', () => {
      const status = db.getUserStatus('user1', 'dev');
      
      expect(status.invited).toBe(true);
      expect(status.groupCreated).toBe(true);
      expect(status.sourceCreated).toBe(true);
      expect(status.groupApiId).toBe('group-123');
    });

    it('should get all user statuses', () => {
      db.ensureUser('user2', 'user2@example.com');
      db.recordInvitation('user2', 'dev', false);
      
      const allStatus = db.getAllStatus('dev');
      
      expect(allStatus.length).toBeGreaterThanOrEqual(2);
      
      const user1Status = allStatus.find(s => s.user_id === 'user1');
      expect(user1Status).toBeDefined();
      expect(user1Status?.invited).toBe(1); // SQLite returns 0/1
      expect(user1Status?.group_created).toBe(1);
      expect(user1Status?.source_created).toBe(1);
    });
  });

  describe('Operation Logging', () => {
    beforeEach(() => {
      db.ensureUser('user1', 'user1@example.com');
    });

    it('should log an operation', () => {
      db.logOperation('invite', 'user1', 'dev', 'success');
      // No direct way to retrieve logs, but should not throw
      expect(true).toBe(true);
    });

    it('should log operation with error', () => {
      db.logOperation('group', 'user1', 'dev', 'error', 'Failed to create group');
      expect(true).toBe(true);
    });

    it('should log operation with details', () => {
      db.logOperation('source', 'user1', 'dev', 'success', undefined, { sourceId: 'source-123' });
      expect(true).toBe(true);
    });
  });

  describe('Reset Operations', () => {
    beforeEach(() => {
      db.ensureUser('user1', 'user1@example.com');
      db.recordInvitation('user1', 'dev', false);
      db.recordGroupCreation('user1', 'dev', 'group-123', 'Test Group');
      db.recordSourceCreation('user1', 'dev', 'source-456', 'Test Source');
    });

    it('should reset a user for specific environment', () => {
      db.resetUser('user1', 'dev');
      
      expect(db.isUserInvited('user1', 'dev')).toBe(false);
      expect(db.isGroupCreated('user1', 'dev')).toBe(false);
      expect(db.isSourceCreated('user1', 'dev')).toBe(false);
    });

    it('should reset entire environment', () => {
      db.ensureUser('user2', 'user2@example.com');
      db.recordInvitation('user2', 'dev', false);
      
      db.resetEnvironment('dev');
      
      expect(db.isUserInvited('user1', 'dev')).toBe(false);
      expect(db.isUserInvited('user2', 'dev')).toBe(false);
      expect(db.isGroupCreated('user1', 'dev')).toBe(false);
    });

    it('should preserve other environments when resetting', () => {
      db.recordInvitation('user1', 'qa', false);
      db.recordGroupCreation('user1', 'qa', 'group-789', 'QA Group');
      
      db.resetEnvironment('dev');
      
      expect(db.isUserInvited('user1', 'dev')).toBe(false);
      expect(db.isUserInvited('user1', 'qa')).toBe(true);
      expect(db.isGroupCreated('user1', 'qa')).toBe(true);
    });
  });

  describe('Database Initialization', () => {
    it('should create tables on initialization', () => {
      // Tables should be created automatically
      db.ensureUser('user1', 'user1@example.com');
      const status = db.getUserStatus('user1', 'dev');
      expect(status).toBeDefined();
    });

    it('should persist data across instances', () => {
      db.ensureUser('user1', 'user1@example.com');
      db.recordInvitation('user1', 'dev', false);
      db.close();

      // Create new instance with same database
      const db2 = new StateDatabase(TEST_DB_PATH);
      expect(db2.isUserInvited('user1', 'dev')).toBe(true);
      db2.close();
    });
  });
});
