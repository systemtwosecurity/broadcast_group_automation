import { Command } from 'commander';
import { StateDatabase } from '../database/db.js';
import { MCPClient } from '../mcp/client.js';
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
    
    // Validate environment variables
    try {
      const { Config } = await import('../config/config.js');
      Config.validate();
    } catch (error: any) {
      console.error(`\n❌ Configuration Error: ${error.message}\n`);
      console.error('💡 Make sure to create a .env file with required variables.\n');
      console.error('   See .env.example for reference.\n');
      process.exit(1);
    }
    
    const db = new StateDatabase();
    const mcpClient = new MCPClient();
    const configLoader = new ConfigLoader();
    
    const { Config } = await import('../config/config.js');
    const detectionsUrl = Config.getApiUrl('detections', environment);
    const detectionsAPI = new DetectionsAPI(detectionsUrl);
    
    try {
      await mcpClient.connect();
      
      const workflow = new InvitationWorkflow(db, mcpClient, detectionsAPI, configLoader, environment);
      await workflow.execute({ groupIds });
    } catch (error: any) {
      console.error(`\n❌ Error: ${error.message}\n`);
      process.exit(1);
    } finally {
      await mcpClient.close();
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
    
    // Validate environment variables
    try {
      const { Config } = await import('../config/config.js');
      Config.validate();
    } catch (error: any) {
      console.error(`\n❌ Configuration Error: ${error.message}\n`);
      console.error('💡 Make sure to create a .env file with required variables.\n');
      console.error('   See .env.example for reference.\n');
      process.exit(1);
    }
    
    const db = new StateDatabase();
    const mcpClient = new MCPClient();
    const configLoader = new ConfigLoader();
    
    const { Config } = await import('../config/config.js');
    const detectionsUrl = Config.getApiUrl('detections', environment);
    const integrationsUrl = Config.getApiUrl('integrations', environment);
    const detectionsAPI = new DetectionsAPI(detectionsUrl);
    const integrationsAPI = new IntegrationsAPI(integrationsUrl);
    
    try {
      await mcpClient.connect();
      
      const workflow = new SetupWorkflow(db, mcpClient, detectionsAPI, integrationsAPI, configLoader, environment);
      await workflow.execute({ groupIds });
    } catch (error: any) {
      console.error(`\n❌ Error: ${error.message}\n`);
      process.exit(1);
    } finally {
      await mcpClient.close();
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
  .action((options) => {
    const environment = options.env as Environment;
    
    // Ensure data directory exists
    mkdirSync('./data', { recursive: true });
    
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

