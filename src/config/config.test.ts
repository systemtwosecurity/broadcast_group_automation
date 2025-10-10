import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Config } from './config.js';

describe('Config', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('adminPassword getter', () => {
    it('should return admin password from environment', () => {
      process.env.ADMIN_PASSWORD = 'test-admin-password';
      const password = Config.adminPassword;
      expect(password).toBe('test-admin-password');
    });

    it('should throw if ADMIN_PASSWORD not set', () => {
      delete process.env.ADMIN_PASSWORD;
      expect(() => Config.adminPassword).toThrow(/ADMIN_PASSWORD/);
    });
  });

  describe('getUserPassword', () => {
    it('should return user password from environment', () => {
      process.env.USER_PASSWORD_SIGMAHQ = 'user-password-123';
      const password = Config.getUserPassword('sigmahq');
      expect(password).toBe('user-password-123');
    });

    it('should convert userId to uppercase for env key', () => {
      process.env.USER_PASSWORD_SIGMAHQ = 'user-password-123';
      const password = Config.getUserPassword('SigmaHQ');
      expect(password).toBe('user-password-123');
    });

    it('should return null if user password not set', () => {
      const password = Config.getUserPassword('nonexistent');
      expect(password).toBeNull();
    });

    it('should return null if password is REPLACE_AFTER_VERIFICATION', () => {
      process.env.USER_PASSWORD_TESTUSER = 'REPLACE_AFTER_VERIFICATION';
      const password = Config.getUserPassword('testuser');
      expect(password).toBeNull();
    });

    it('should handle user IDs with underscores', () => {
      process.env.USER_PASSWORD_YARA_100DAYS = 'password-456';
      const password = Config.getUserPassword('yara_100days');
      expect(password).toBe('password-456');
    });
  });

  describe('getApiUrl', () => {
    it('should return correct detections API URL for dev', () => {
      const url = Config.getApiUrl('detections', 'dev');
      expect(url).toBe('https://detections-backend.dev.s2s.ai');
    });

    it('should return correct detections API URL for qa', () => {
      const url = Config.getApiUrl('detections', 'qa');
      expect(url).toBe('https://detections-backend.qa.s2s.ai');
    });

    it('should return correct detections API URL for prod', () => {
      const url = Config.getApiUrl('detections', 'prod');
      expect(url).toBe('https://detections-backend.s2s.ai');
    });

    it('should return correct integrations API URL for dev', () => {
      const url = Config.getApiUrl('integrations', 'dev');
      expect(url).toBe('https://integrations-management.dev.s2s.ai');
    });

    it('should return correct integrations API URL for qa', () => {
      const url = Config.getApiUrl('integrations', 'qa');
      expect(url).toBe('https://integrations-management.qa.s2s.ai');
    });

    it('should return correct integrations API URL for prod', () => {
      const url = Config.getApiUrl('integrations', 'prod');
      expect(url).toBe('https://integrations-management.s2s.ai');
    });

    it('should return correct app URL for dev', () => {
      const url = Config.getApiUrl('app', 'dev');
      expect(url).toBe('https://detections.dev.s2s.ai');
    });

    it('should return correct app URL for qa', () => {
      const url = Config.getApiUrl('app', 'qa');
      expect(url).toBe('https://detections.qa.s2s.ai');
    });

    it('should return correct app URL for prod', () => {
      const url = Config.getApiUrl('app', 'prod');
      expect(url).toBe('https://detections.ai');
    });
  });

  describe('adminEmail getter', () => {
    it('should return admin email from environment', () => {
      process.env.ADMIN_EMAIL = 'admin@example.com';
      const email = Config.adminEmail;
      expect(email).toBe('admin@example.com');
    });

    it('should throw if ADMIN_EMAIL not set', () => {
      delete process.env.ADMIN_EMAIL;
      expect(() => Config.adminEmail).toThrow(/ADMIN_EMAIL/);
    });
  });

  describe('validate', () => {
    it('should not throw if required environment variables are set', () => {
      process.env.ADMIN_EMAIL = 'admin@example.com';
      process.env.ADMIN_PASSWORD = 'admin-password';
      
      expect(() => Config.validate()).not.toThrow();
    });

    it('should throw if ADMIN_EMAIL is missing', () => {
      delete process.env.ADMIN_EMAIL;
      process.env.ADMIN_PASSWORD = 'admin-password';
      
      expect(() => Config.validate()).toThrow(/ADMIN_EMAIL/);
    });

    it('should throw if ADMIN_PASSWORD is missing', () => {
      process.env.ADMIN_EMAIL = 'admin@example.com';
      delete process.env.ADMIN_PASSWORD;
      
      expect(() => Config.validate()).toThrow(/ADMIN_PASSWORD/);
    });

    it('should throw if both required variables are missing', () => {
      delete process.env.ADMIN_EMAIL;
      delete process.env.ADMIN_PASSWORD;
      
      expect(() => Config.validate()).toThrow();
    });

    it('should list all missing variables in error message', () => {
      delete process.env.ADMIN_EMAIL;
      delete process.env.ADMIN_PASSWORD;
      
      try {
        Config.validate();
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('ADMIN_EMAIL');
        expect(error.message).toContain('ADMIN_PASSWORD');
      }
    });
  });
});

