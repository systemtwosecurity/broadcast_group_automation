import { config as loadEnv } from 'dotenv';
import type { Environment } from '../types/index.js';

// Load environment variables from .env file
loadEnv();

export class Config {
  // Environment
  static get environment(): Environment {
    return (process.env.ENVIRONMENT || 'dev') as Environment;
  }

  // Admin Credentials
  static get adminEmail(): string {
    const email = process.env.ADMIN_EMAIL;
    if (!email) {
      throw new Error('ADMIN_EMAIL environment variable is required');
    }
    return email;
  }

  static get adminPassword(): string {
    const password = process.env.ADMIN_PASSWORD;
    if (!password) {
      throw new Error('ADMIN_PASSWORD environment variable is required');
    }
    return password;
  }

  // Auth0 Configuration
  static get auth0Domain(): string {
    const domain = process.env.AUTH0_DOMAIN;
    if (!domain) {
      throw new Error('AUTH0_DOMAIN environment variable is required');
    }
    return domain;
  }

  static get auth0ClientId(): string {
    const clientId = process.env.AUTH0_CLIENT_ID;
    if (!clientId) {
      throw new Error('AUTH0_CLIENT_ID environment variable is required');
    }
    return clientId;
  }

  static get auth0ClientSecret(): string {
    const clientSecret = process.env.AUTH0_CLIENT_SECRET;
    if (!clientSecret) {
      throw new Error('AUTH0_CLIENT_SECRET environment variable is required');
    }
    return clientSecret;
  }

  // User Password Lookup
  static getUserPassword(userId: string): string | null {
    // Convert userId to environment variable format
    // e.g., "sigmahq" -> "USER_PASSWORD_SIGMAHQ"
    const envKey = `USER_PASSWORD_${userId.toUpperCase()}`;
    const password = process.env[envKey];

    // Return null if not set or is placeholder
    if (!password || password === 'REPLACE_AFTER_VERIFICATION') {
      return null;
    }

    return password;
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

  // Validate that all required environment variables are set
  static validate(): void {
    const required = ['ADMIN_EMAIL', 'ADMIN_PASSWORD'];
    const missing = required.filter((key) => !process.env[key]);

    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(', ')}`,
      );
    }
  }
}
