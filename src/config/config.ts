import { config as loadEnv } from 'dotenv';
import type { Environment } from '../types/index.js';

// Load environment variables from .env file
loadEnv();

export class Config {
  // Environment
  static get environment(): Environment {
    return (process.env.ENVIRONMENT || 'dev') as Environment;
  }

  // Admin Token
  static get adminToken(): string | null {
    const token = process.env.ADMIN_TOKEN;
    if (!token || token === 'your-admin-bearer-token-here') {
      return null;
    }
    return token;
  }

  // User Token Lookup
  static getUserToken(userId: string): string | null {
    // Convert userId to environment variable format
    // e.g., "sigmahq" -> "USER_TOKEN_SIGMAHQ"
    const envKey = `USER_TOKEN_${userId.toUpperCase()}`;
    const token = process.env[envKey];

    // Return null if not set or is placeholder/skip
    if (!token || token === 'SKIP' || token === 'your-user-bearer-token-here') {
      return null;
    }

    return token;
  }

  // API URLs
  static getApiUrl(
    type: 'detections' | 'integrations' | 'app',
    environment: Environment,
  ): string {
    const envMap = {
      detections: {
        dev: 'https://detections-backend.dev.s2s.ai',
        qa: 'https://detections-backend.qa.s2s.ai',
        prod: 'https://detections-backend.s2s.ai',
      },
      integrations: {
        dev: 'https://integrations-management.dev.s2s.ai',
        qa: 'https://integrations-management.qa.s2s.ai',
        prod: 'https://integrations-management.s2s.ai',
      },
      app: {
        dev: 'https://detections.dev.s2s.ai',
        qa: 'https://detections.qa.s2s.ai',
        prod: 'https://detections.ai',
      },
    };

    return envMap[type][environment];
  }

  // Validate that admin token is set
  static validate(): void {
    if (!this.adminToken) {
      throw new Error(
        `Missing ADMIN_TOKEN environment variable.\n` +
        `Get your token from Chrome DevTools:\n` +
        `1. Login to the app\n` +
        `2. Open DevTools → Network tab\n` +
        `3. Copy the Authorization header from any API call`
      );
    }
  }
}
