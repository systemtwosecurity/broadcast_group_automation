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
   * Load users from users.json (emails only, no passwords)
   * Passwords are loaded from environment variables via Config class
   */
  loadUsers(): UsersConfig {
    try {
      const usersPath = join(this.basePath, 'users.json');
      const content = readFileSync(usersPath, 'utf-8');
      const users: UsersConfig = JSON.parse(content);

      // Add passwords from environment variables
      users.admin.password = Config.adminPassword;
      users.users = users.users.map(user => ({
        ...user,
        password: Config.getUserPassword(user.id) || undefined
      }));

      return users;
    } catch (error: any) {
      throw new Error(`Failed to load users configuration: ${error.message}`);
    }
  }

  /**
   * Get users with passwords from environment variables
   */
  getUsersWithPasswords(): User[] {
    const usersConfig = this.loadUsers();
    return usersConfig.users.map(user => ({
      ...user,
      password: Config.getUserPassword(user.id) || undefined
    }));
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
