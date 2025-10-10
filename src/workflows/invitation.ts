import { StateDatabase } from '../database/db.js';
import { MCPClient } from '../mcp/client.js';
import { DetectionsAPI } from '../api/detections.js';
import { ConfigLoader } from '../config/loader.js';
import type { Environment, WorkflowOptions, User } from '../types/index.js';

export class InvitationWorkflow {
  constructor(
    private db: StateDatabase,
    private mcpClient: MCPClient,
    private detectionsAPI: DetectionsAPI,
    private configLoader: ConfigLoader,
    private environment: Environment
  ) {}

  async execute(options: WorkflowOptions = {}): Promise<void> {
    const { groupIds = null } = options;

    console.log("🚀 PHASE 1: Sending Invitations\n");

    // Load users
    const usersConfig = this.configLoader.loadUsers();
    const allUsers = usersConfig.users;

    // Ensure users exist in database
    allUsers.forEach(user => {
      this.db.ensureUser(user.id, user.email);
    });
    this.db.ensureUser('admin', usersConfig.admin.email, true);

    // Filter users based on groupIds
    let selectedUsers = allUsers;
    if (groupIds && groupIds.length > 0) {
      selectedUsers = allUsers.filter(u => groupIds.includes(u.id));
      
      if (selectedUsers.length === 0) {
        console.error(`❌ No users found for group IDs: ${groupIds.join(", ")}\n`);
        return;
      }
    }

    // Check database: who needs invitations?
    const needsInvite: User[] = [];
    const alreadyInvited: User[] = [];

    for (const user of selectedUsers) {
      const invited = this.db.isUserInvited(user.id, this.environment);
      
      if (invited) {
        alreadyInvited.push(user);
      } else {
        needsInvite.push(user);
      }
    }

    console.log(`📊 Pre-Check:`);
    console.log(`   🆕 Needs invitation: ${needsInvite.length}`);
    console.log(`   ✅ Already invited: ${alreadyInvited.length}\n`);

    if (needsInvite.length === 0) {
      console.log("✅ All selected users already invited!\n");
      return;
    }

    // Get admin token
    console.log("=== Admin Login ===");
    const { Config } = await import('../config/config.js');
    const appUrl = Config.getApiUrl('app', this.environment);
    const adminToken = await this.mcpClient.login(
      `${appUrl}/login`,
      usersConfig.admin.email,
      usersConfig.admin.password!
    );

    // Send invitations
    console.log("\n=== Sending Invitations ===");
    const needsInviteEmails = needsInvite.map(u => u.email);
    const result = await this.detectionsAPI.sendInvitations(adminToken, needsInviteEmails);

    // Parse API response
    const invited = result.data?.invitations || [];
    const existed = needsInviteEmails.filter(email => !invited.includes(email));

    // Record in database
    for (const email of invited) {
      const user = needsInvite.find(u => u.email === email);
      if (user) {
        this.db.recordInvitation(user.id, this.environment, false);
        this.db.logOperation('invite', user.id, this.environment, 'success');
      }
    }

    for (const email of existed) {
      const user = needsInvite.find(u => u.email === email);
      if (user) {
        this.db.recordInvitation(user.id, this.environment, true);
        this.db.logOperation('invite', user.id, this.environment, 'skipped', 'User already exists');
      }
    }

    // Report results
    console.log("\n📊 Results:");
    if (invited.length > 0) {
      console.log(`   ✅ Sent: ${invited.length}`);
      invited.forEach(email => console.log(`      - ${email}`));
    }
    
    if (existed.length > 0) {
      console.log(`   ⏭️  Already existed: ${existed.length}`);
      existed.forEach(email => console.log(`      - ${email}`));
    }

    if (alreadyInvited.length > 0) {
      console.log(`   📝 Previously invited (in DB): ${alreadyInvited.length}`);
      alreadyInvited.forEach(u => console.log(`      - ${u.email}`));
    }

    console.log("\n⏸️  NEXT STEPS:");
    console.log("   1. Wait for users to verify emails");
    console.log("   2. Update config/users.json with passwords");
    console.log(`   3. Run: npm run dev -- setup --env ${this.environment}\n`);
  }
}

