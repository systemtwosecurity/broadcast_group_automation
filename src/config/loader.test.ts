import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ConfigLoader } from './loader.js';

describe('ConfigLoader', () => {
  let loader: ConfigLoader;
  const originalEnv = process.env;

  beforeEach(() => {
    // Use the actual config directory for tests
    loader = new ConfigLoader('./config');
    
    // Set up environment variables for tests
    process.env = { ...originalEnv };
    process.env.ADMIN_EMAIL = 'admin@test.com';
    process.env.ADMIN_PASSWORD = 'test-admin-password';
    process.env.USER_PASSWORD_SIGMAHQ = 'sigmahq-password';
    process.env.USER_PASSWORD_YARA_100DAYS = 'yara-password';
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('loadUsers', () => {
    it('should load users from config file', () => {
      const usersConfig = loader.loadUsers();
      
      expect(usersConfig).toBeDefined();
      expect(usersConfig.admin).toBeDefined();
      expect(usersConfig.admin.email).toBeTruthy();
      expect(usersConfig.users).toBeDefined();
      expect(Array.isArray(usersConfig.users)).toBe(true);
    });

    it('should inject admin password from environment', () => {
      const usersConfig = loader.loadUsers();
      
      expect(usersConfig.admin.password).toBe('test-admin-password');
    });

    it('should inject user passwords from environment', () => {
      const usersConfig = loader.loadUsers();
      
      expect(usersConfig.users.length).toBeGreaterThan(0);
      
      // Find the sigmahq user
      const sigmahqUser = usersConfig.users.find(u => u.id === 'sigmahq');
      if (sigmahqUser) {
        expect(sigmahqUser.password).toBe('sigmahq-password');
      }
    });

    it('should handle missing user passwords gracefully', () => {
      // Remove all user password env vars
      Object.keys(process.env).forEach(key => {
        if (key.startsWith('USER_PASSWORD_')) {
          delete process.env[key];
        }
      });
      
      const usersConfig = loader.loadUsers();
      
      usersConfig.users.forEach(user => {
        expect(user.password).toBeUndefined();
      });
    });

    it('should handle REPLACE_AFTER_VERIFICATION placeholder', () => {
      process.env.USER_PASSWORD_SIGMAHQ = 'REPLACE_AFTER_VERIFICATION';
      
      const usersConfig = loader.loadUsers();
      const sigmahqUser = usersConfig.users.find(u => u.id === 'sigmahq');
      
      if (sigmahqUser) {
        expect(sigmahqUser.password).toBeUndefined();
      }
    });

    it('should throw error if config file not found', () => {
      const invalidLoader = new ConfigLoader('./nonexistent');
      expect(() => invalidLoader.loadUsers()).toThrow();
    });
  });

  describe('getUsersWithPasswords', () => {
    it('should return users with passwords', () => {
      const users = loader.getUsersWithPasswords();
      
      expect(Array.isArray(users)).toBe(true);
      expect(users.length).toBeGreaterThan(0);
      
      // Check that first user has expected structure
      const firstUser = users[0];
      expect(firstUser).toHaveProperty('id');
      expect(firstUser).toHaveProperty('email');
    });
  });

  describe('loadGroups', () => {
    it('should load groups from config file', () => {
      const groupsConfig = loader.loadGroups();
      
      expect(groupsConfig).toBeDefined();
      expect(typeof groupsConfig).toBe('object');
    });

    it('should load group configurations with correct structure', () => {
      const groupsConfig = loader.loadGroups();
      
      expect(groupsConfig).toHaveProperty('groups');
      expect(Array.isArray(groupsConfig.groups)).toBe(true);
      expect(groupsConfig.groups.length).toBeGreaterThan(0);
      
      const firstGroup = groupsConfig.groups[0];
      
      expect(firstGroup).toBeDefined();
      expect(firstGroup.id).toBeTruthy();
      expect(firstGroup.name).toBeTruthy();
      expect(firstGroup.type).toMatch(/^(private|public)$/);
      expect(firstGroup.source).toBeDefined();
      
      // Verify source structure
      expect(firstGroup.source.integration_type).toBe('github');
      expect(firstGroup.source.name).toBeTruthy();
    });

    it('should have all groups with required fields', () => {
      const groupsConfig = loader.loadGroups();
      
      groupsConfig.groups.forEach((group: any) => {
        expect(group.id).toBeTruthy();
        expect(group.name).toBeTruthy();
        expect(group.email_prefix).toBeTruthy();
        expect(group.source).toBeDefined();
        expect(group.source.integration_type).toBe('github');
      });
    });

    it('should throw error if config file not found', () => {
      const invalidLoader = new ConfigLoader('./nonexistent');
      expect(() => invalidLoader.loadGroups()).toThrow();
    });
  });

  describe('Custom Base Path', () => {
    it('should accept custom base path', () => {
      const customLoader = new ConfigLoader('./custom-config');
      expect(customLoader).toBeDefined();
    });

    it('should default to ./config if no path provided', () => {
      const defaultLoader = new ConfigLoader();
      expect(defaultLoader).toBeDefined();
      
      // Should be able to load from default path
      const usersConfig = defaultLoader.loadUsers();
      expect(usersConfig).toBeDefined();
    });
  });
});
