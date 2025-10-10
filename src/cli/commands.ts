import { Command } from 'commander';
import { StateDatabase } from '../database/db.js';
import { DetectionsAPI } from '../api/detections.js';
import { IntegrationsAPI } from '../api/integrations.js';
import { ConfigLoader } from '../config/loader.js';
import { InvitationWorkflow } from '../workflows/invitation.js';
import { SetupWorkflow } from '../workflows/setup.js';
import type { Environment } from '../types/index.js';
import { mkdirSync } from 'fs';

const program = new Command();

program
  .name("broadcast-automation")
  .description("Automate group and source creation with smart state tracking")
  .version("2.0.0");

// ============================================
// invite - Send invitations
// ============================================
program
  .command("invite")
  .description("Send invitations to users (smart: skips already invited)")
  .option("-e, --env <environment>", "Environment (dev, qa, prod)", "dev")
  .option("-g, --groups <groups>", "Comma-separated group IDs or 'all'", "all")
  .action(async (options) => {
    const environment = options.env as Environment;
    const groupIds = options.groups === "all" ? null : options.groups.split(",").map((s: string) => s.trim());
    
    // Ensure data directory exists
    mkdirSync('./data', { recursive: true });
    
    // Load environment-specific configuration
    const { Config } = await import('../config/config.js');
    Config.loadEnvironment(environment);
    
    // Validate environment variables
    try {
      Config.validate();
    } catch (error: any) {
      console.error(`\n❌ Configuration Error: ${error.message}\n`);
      console.error(`💡 Make sure to create a .env.${environment} file with required variables.\n`);
      console.error(`   See env.${environment}.example for reference.\n`);
      process.exit(1);
    }
    
    const db = new StateDatabase();
    const configLoader = new ConfigLoader();
    
    const detectionsUrl = Config.getApiUrl('detections', environment);
    const detectionsAPI = new DetectionsAPI(detectionsUrl);
    
    try {
      const workflow = new InvitationWorkflow(db, detectionsAPI, configLoader, environment);
      await workflow.execute({ groupIds });
    } catch (error: any) {
      console.error(`\n❌ Error: ${error.message}\n`);
      process.exit(1);
    } finally {
      db.close();
    }
  });

// ============================================
// setup - Create groups and sources
// ============================================
program
  .command("setup")
  .description("Create groups and sources (smart: skips incomplete/done)")
  .option("-e, --env <environment>", "Environment (dev, qa, prod)", "dev")
  .option("-g, --groups <groups>", "Comma-separated group IDs or 'all'", "all")
  .action(async (options) => {
    const environment = options.env as Environment;
    const groupIds = options.groups === "all" ? null : options.groups.split(",").map((s: string) => s.trim());
    
    // Ensure data directory exists
    mkdirSync('./data', { recursive: true });
    
    // Load environment-specific configuration
    const { Config } = await import('../config/config.js');
    Config.loadEnvironment(environment);
    
    // Validate environment variables
    try {
      Config.validate();
    } catch (error: any) {
      console.error(`\n❌ Configuration Error: ${error.message}\n`);
      console.error(`💡 Make sure to create a .env.${environment} file with required variables.\n`);
      console.error(`   See env.${environment}.example for reference.\n`);
      process.exit(1);
    }
    
    const db = new StateDatabase();
    const configLoader = new ConfigLoader();
    
    const detectionsUrl = Config.getApiUrl('detections', environment);
    const integrationsUrl = Config.getApiUrl('integrations', environment);
    const detectionsAPI = new DetectionsAPI(detectionsUrl);
    const integrationsAPI = new IntegrationsAPI(integrationsUrl);
    
    try {
      const workflow = new SetupWorkflow(db, detectionsAPI, integrationsAPI, configLoader, environment);
      await workflow.execute({ groupIds });
    } catch (error: any) {
      console.error(`\n❌ Error: ${error.message}\n`);
      process.exit(1);
    } finally {
      db.close();
    }
  });

// ============================================
// status - Show current state
// ============================================
program
  .command("status")
  .description("Show status of all groups")
  .option("-e, --env <environment>", "Environment (dev, qa, prod)", "dev")
  .action(async (options) => {
    const environment = options.env as Environment;
    
    // Ensure data directory exists
    mkdirSync('./data', { recursive: true });
    
    // Load environment-specific configuration
    const { Config } = await import('../config/config.js');
    Config.loadEnvironment(environment);
    
    const db = new StateDatabase();
    const status = db.getAllStatus(environment);
    
    console.log(`\n📊 Status Report (${environment})\n`);
    console.log("┌──────────────────────────┬──────────┬───────┬────────┐");
    console.log("│ Group ID                 │ Invited  │ Group │ Source │");
    console.log("├──────────────────────────┼──────────┼───────┼────────┤");
    
    status.forEach(s => {
      const id = s.user_id.padEnd(24);
      const invited = s.invited ? '✅' : '⏳';
      const group = s.group_created ? '✅' : '⏳';
      const source = s.source_created ? '✅' : '⏳';
      console.log(`│ ${id} │ ${invited}      │ ${group}    │ ${source}     │`);
    });
    
    console.log("└──────────────────────────┴──────────┴───────┴────────┘\n");
    
    db.close();
  });

// ============================================
// reset - Clear state for groups
// ============================================
program
  .command("reset")
  .description("Reset state for specific groups")
  .option("-e, --env <environment>", "Environment (dev, qa, prod)", "dev")
  .option("-g, --groups <groups>", "Comma-separated group IDs or 'all'")
  .option("--confirm", "Confirm reset operation")
  .action((options) => {
    if (!options.confirm) {
      console.log("⚠️  Please add --confirm flag to reset state\n");
      return;
    }
    
    if (!options.groups) {
      console.log("⚠️  Please specify --groups to reset\n");
      return;
    }
    
    const environment = options.env as Environment;
    
    // Ensure data directory exists
    mkdirSync('./data', { recursive: true });
    
    const db = new StateDatabase();
    
    if (options.groups === "all") {
      db.resetEnvironment(environment);
      console.log(`✅ Reset all groups for ${environment}\n`);
    } else {
      const groupIds = options.groups.split(",").map((s: string) => s.trim());
      groupIds.forEach((id: string) => db.resetUser(id, environment));
      console.log(`✅ Reset ${groupIds.length} groups for ${environment}\n`);
    }
    
    db.close();
  });

// ============================================
// cleanup - Delete groups and sources
// ============================================
program
  .command("cleanup")
  .description("Delete groups and/or sources from API and database")
  .option("-e, --env <environment>", "Environment (dev, qa, prod)", "dev")
  .option("-g, --groups <groups>", "Comma-separated group IDs or 'all'", "all")
  .option("--sources-only", "Delete only sources (keep groups)")
  .option("--groups-only", "Delete only groups (keep sources)")
  .option("--confirm", "Confirm deletion (required)")
  .action(async (options) => {
    if (!options.confirm) {
      console.error("\n⚠️  Please add --confirm flag to delete groups and sources\n");
      process.exit(1);
    }
    
    if (options.sourcesOnly && options.groupsOnly) {
      console.error("\n⚠️  Cannot use both --sources-only and --groups-only\n");
      process.exit(1);
    }
    
    const environment = options.env as Environment;
    const groupIds = options.groups === "all" ? null : options.groups.split(",").map((s: string) => s.trim());
    
    mkdirSync('./data', { recursive: true });
    
    // Load environment-specific configuration
    const { Config } = await import('../config/config.js');
    Config.loadEnvironment(environment);
    
    const db = new StateDatabase();
    const configLoader = new ConfigLoader();
    
    try {
      const usersConfig = configLoader.loadUsers();
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
      
      const deleteGroups = !options.sourcesOnly;
      const deleteSources = !options.groupsOnly;
      
      let actionDesc = "groups and sources";
      if (options.sourcesOnly) actionDesc = "sources only";
      if (options.groupsOnly) actionDesc = "groups only";
      
      console.log(`\n🗑️  Deleting ${actionDesc} for ${environment} environment\n`);
      
      const axios = (await import('axios')).default;
      
      for (const user of selectedUsers) {
        console.log(`─────────────────────────────────────`);
        console.log(`🗑️  Processing: ${user.id}`);
        console.log(`─────────────────────────────────────`);
        
        const userToken = Config.getUserToken(user.id);
        if (!userToken) {
          console.log(`⚠️  No token for ${user.id}, skipping...\n`);
          continue;
        }
        
        const status = db.getUserStatus(user.id, environment);
        let deletedAnything = false;
        
        // Delete source first (if exists and requested)
        if (deleteSources && status.sourceCreated && status.sourceApiId) {
          deletedAnything = true;
          try {
            console.log(`🗑️  Deleting source: ${status.sourceApiId}...`);
            await axios.delete(
              `${Config.getApiUrl('integrations', environment)}/api/v1/sources/${status.sourceApiId}`,
              {
                headers: {
                  'Authorization': `Bearer ${userToken}`,
                  'Accept': '*/*'
                }
              }
            );
            console.log(`✅ Source deleted`);
          } catch (error: any) {
            if (error.response?.status === 404) {
              console.log(`ℹ️  Source not found (already deleted)`);
            } else {
              console.error(`❌ Failed to delete source: ${error.message}`);
            }
          }
        }
        
        // Delete group (if exists and requested)
        if (deleteGroups && status.groupCreated && status.groupApiId) {
          deletedAnything = true;
          try {
            console.log(`🗑️  Deleting group: ${status.groupApiId}...`);
            await axios.delete(
              `${Config.getApiUrl('detections', environment)}/api/v1/groups/${status.groupApiId}`,
              {
                headers: {
                  'Authorization': `Bearer ${userToken}`,
                  'Accept': 'application/json, text/plain, */*'
                }
              }
            );
            console.log(`✅ Group deleted`);
          } catch (error: any) {
            if (error.response?.status === 404) {
              console.log(`ℹ️  Group not found (already deleted)`);
            } else {
              console.error(`❌ Failed to delete group: ${error.message}`);
            }
          }
        }
        
        // Remove from database (selective based on what was deleted)
        if (!deletedAnything) {
          console.log(`ℹ️  Nothing to delete (not created yet)\n`);
        } else {
          if (deleteSources && deleteGroups) {
            db.resetUser(user.id, environment);
            console.log(`✅ Removed all records from database\n`);
          } else if (deleteGroups) {
            db.resetUserGroups(user.id, environment);
            console.log(`✅ Removed group records from database\n`);
          } else if (deleteSources) {
            db.resetUserSources(user.id, environment);
            console.log(`✅ Removed source records from database\n`);
          }
        }
      }
      
      console.log("═══════════════════════════════════════");
      console.log("✅ Cleanup complete!");
      console.log("═══════════════════════════════════════\n");
      
    } catch (error: any) {
      console.error(`\n❌ Error: ${error.message}\n`);
      process.exit(1);
    } finally {
      db.close();
    }
  });

// ============================================
// list-groups - Show all groups
// ============================================
program
  .command("list-groups")
  .description("List all configured groups")
  .action(() => {
    const configLoader = new ConfigLoader();
    const groupsConfig = configLoader.loadGroups();
    
    console.log("\n📋 Available Groups:\n");
    groupsConfig.groups.forEach(group => {
      console.log(`  - ${group.id.padEnd(25)} ${group.name}`);
    });
    console.log();
  });

export function run() {
  program.parse();
}

