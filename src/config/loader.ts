import { readFileSync } from 'fs';
import { join } from 'path';
import type { UsersConfig, GroupsConfig, User } from '../types/index.js';
import { Config } from './config.js';

export class ConfigLoader {
  private basePath: string;

  constructor(basePath: string = './config') {
    this.basePath = basePath;
  }

  /**
   * Load users from users.json (emails only)
   * Tokens are loaded from environment variables separately
   */
  loadUsers(): UsersConfig {
    try {
      const usersPath = join(this.basePath, 'users.json');
      const content = readFileSync(usersPath, 'utf-8');
      const users: UsersConfig = JSON.parse(content);

      return users;
    } catch (error: any) {
      throw new Error(`Failed to load users configuration: ${error.message}`);
    }
  }

  loadGroups(): GroupsConfig {
    try {
      const groupsPath = join(this.basePath, 'groups.json');
      const content = readFileSync(groupsPath, 'utf-8');
      return JSON.parse(content);
    } catch (error: any) {
      throw new Error(`Failed to load groups.json: ${error.message}`);
    }
  }
}
