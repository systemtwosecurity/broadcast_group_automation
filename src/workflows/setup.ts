import { StateDatabase } from '../database/db.js';
import { MCPClient } from '../mcp/client.js';
import { DetectionsAPI } from '../api/detections.js';
import { IntegrationsAPI } from '../api/integrations.js';
import { ConfigLoader } from '../config/loader.js';
import type { Environment, WorkflowOptions, User, GroupConfig } from '../types/index.js';

export class SetupWorkflow {
  constructor(
    private db: StateDatabase,
    private mcpClient: MCPClient,
    private detectionsAPI: DetectionsAPI,
    private integrationsAPI: IntegrationsAPI,
    private configLoader: ConfigLoader,
    private environment: Environment
  ) {}

  async execute(options: WorkflowOptions = {}): Promise<void> {
    const { groupIds = null } = options;

    console.log("🚀 PHASE 2: Setting Up Groups & Sources\n");

    // Load configurations
    const usersConfig = this.configLoader.loadUsers();
    const groupsConfig = this.configLoader.loadGroups();
    const allUsers = usersConfig.users;

    // Filter users based on groupIds
    let selectedUsers = allUsers;
    if (groupIds && groupIds.length > 0) {
      selectedUsers = allUsers.filter(u => groupIds.includes(u.id));
      
      if (selectedUsers.length === 0) {
        console.error(`❌ No users found for group IDs: ${groupIds.join(", ")}\n`);
        return;
      }
    }

    // Categorize users
    const { Config } = await import('../config/config.js');
    const readyUsers: User[] = [];
    const notReadyUsers: User[] = [];
    const alreadyDoneUsers: User[] = [];

    for (const user of selectedUsers) {
      // Check token
      const hasToken = !!Config.getUserToken(user.id);
      
      // Check database
      const status = this.db.getUserStatus(user.id, this.environment);
      
      if (!hasToken) {
        notReadyUsers.push(user);
      } else if (status.groupCreated && status.sourceCreated) {
        alreadyDoneUsers.push(user);
      } else {
        readyUsers.push(user);
      }
    }

    // Status report
    console.log(`📊 Status Check:`);
    console.log(`   ✅ Ready to setup: ${readyUsers.length}`);
    if (notReadyUsers.length > 0) {
      console.log(`   ⏭️  Skipping (no token): ${notReadyUsers.length}`);
      notReadyUsers.forEach(u => console.log(`      - ${u.id} (${u.email}) - Set USER_TOKEN_${u.id.toUpperCase()} in .env`));
    }
    if (alreadyDoneUsers.length > 0) {
      console.log(`   📝 Already complete: ${alreadyDoneUsers.length}`);
      alreadyDoneUsers.forEach(u => console.log(`      - ${u.id}`));
    }
    console.log();

    if (readyUsers.length === 0) {
      console.log("⚠️  No users ready for setup.\n");
      return;
    }

    // Process each ready user
    const results = {
      success: [] as string[],
      failed: [] as string[],
      skipped: notReadyUsers.map(u => u.id)
    };

    for (const user of readyUsers) {
      console.log(`─────────────────────────────────────`);
      console.log(`📦 Processing: ${user.id}`);
      console.log(`─────────────────────────────────────`);

      try {
        // Get user token from environment variable
        const userToken = Config.getUserToken(user.id);
        if (!userToken) {
          console.log(`⚠️  No token for ${user.id}, skipping...\n`);
          results.skipped.push(user.id);
          continue;
        }
        
        console.log(`🔑 Using token for ${user.email}...`);

        // Find group config
        const groupConfig = groupsConfig.groups.find((g: GroupConfig) => g.id === user.id);
        if (!groupConfig) {
          console.log(`⚠️  No group config found, skipping...\n`);
          results.skipped.push(user.id);
          continue;
        }

        // Import axios
        const axios = (await import('axios')).default;

        // Create group (if not exists)
        let groupApiId = this.db.getGroupApiId(user.id, this.environment);
        
          if (!groupApiId) {
            console.log(`🏗️  Creating group: ${groupConfig.name}...`);
            try {
              const groupResponse = await axios.post(
                `${Config.getApiUrl('detections', this.environment)}/api/v1/groups`,
                groupConfig.group,
                {
                  headers: {
                    'Authorization': `Bearer ${userToken}`,
                    'Content-Type': 'application/json'
                  }
                }
              );
              // API returns { data: { id: "..." } }
              groupApiId = groupResponse.data.data?.id || groupResponse.data.id;
            } catch (error: any) {
              if (error.response?.status === 400 && error.response?.data?.code === 'DUPLICATE_GROUP_NAME') {
                console.log(`   ℹ️  Group "${groupConfig.name}" already exists (created outside automation)`);
                console.log(`   ⚠️  Skipping group creation, but sources won't be created without group ID`);
                console.log(`   💡 To fix: Manually get the group ID and add it to the database`);
                // Skip this user since we don't have the group ID
                results.skipped.push(user.id);
                continue;
              }
              
              if (error.response) {
                console.error(`   ❌ API Error: ${error.response.status} ${error.response.statusText}`);
                console.error(`   📦 Response:`, JSON.stringify(error.response.data, null, 2));
              }
              throw error;
            }
          
          if (groupApiId) {
            this.db.recordGroupCreation(user.id, this.environment, groupApiId, groupConfig.name);
          }
          this.db.logOperation('create_group', user.id, this.environment, 'success');
          console.log(`✅ Group created (ID: ${groupApiId})`);
        } else {
          console.log(`📝 Group already exists (ID: ${groupApiId})`);
        }

        // Create source (if not exists)
        if (!this.db.isSourceCreated(user.id, this.environment)) {
          console.log(`📂 Creating source: ${groupConfig.source.name}...`);
          
          // Replace <group_id> placeholder
          const sourcePayload = JSON.parse(
            JSON.stringify(groupConfig.source).replace(/<group_id>/g, groupApiId || '')
          );
          
          const sourceResponse = await axios.post(
            `${Config.getApiUrl('integrations', this.environment)}/api/v1/sources/generic`,
            sourcePayload,
            {
              headers: {
                'Authorization': `Bearer ${userToken}`,
                'Content-Type': 'application/json'
              }
            }
          );
          // API might return { data: { id: "..." } } or { id: "..." }
          const sourceId = sourceResponse.data.data?.id || sourceResponse.data.id || sourceResponse.data.source_id || 'unknown';
          
          this.db.recordSourceCreation(user.id, this.environment, sourceId, groupConfig.source.name);
          this.db.logOperation('create_source', user.id, this.environment, 'success');
          console.log(`✅ Source created (ID: ${sourceId})`);
        } else {
          console.log(`📝 Source already exists`);
        }

        console.log(`✅ Completed: ${user.id}\n`);
        results.success.push(user.id);

      } catch (error: any) {
        console.error(`❌ Failed: ${user.id} - ${error.message}\n`);
        this.db.logOperation('setup', user.id, this.environment, 'failed', error.message);
        results.failed.push(user.id);
      }
    }

    // Summary
    console.log("═══════════════════════════════════════");
    console.log("📊 Summary");
    console.log("═══════════════════════════════════════");
    console.log(`   ✅ Success: ${results.success.length}`);
    if (results.success.length > 0) {
      results.success.forEach(id => console.log(`      - ${id}`));
    }
    
    if (results.failed.length > 0) {
      console.log(`   ❌ Failed: ${results.failed.length}`);
      results.failed.forEach(id => console.log(`      - ${id}`));
    }
    
    if (results.skipped.length > 0) {
      console.log(`   ⏭️  Skipped: ${results.skipped.length}`);
      results.skipped.forEach(id => console.log(`      - ${id}`));
    }
    console.log("═══════════════════════════════════════\n");

    if (results.skipped.length > 0) {
      const skippedIds = results.skipped.join(',');
      console.log("💡 To setup skipped groups:");
      console.log("   1. Get tokens from Chrome DevTools (Network tab → Authorization header)");
      console.log("   2. Add USER_TOKEN_<ID> variables to .env");
      console.log(`   3. Run: npm run dev -- setup --env ${this.environment} --groups ${skippedIds}\n`);
    }
  }
}

