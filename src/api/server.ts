import express, { Request, Response } from 'express';
import cors from 'cors';
import { createServer } from 'net';
import { StateDatabase } from '../database/db.js';
import { ConfigLoader } from '../config/loader.js';
import { Config } from '../config/config.js';
import { InvitationWorkflow } from '../workflows/invitation.js';
import { SetupWorkflow } from '../workflows/setup.js';
import { DetectionsAPI } from './detections.js';
import { IntegrationsAPI } from './integrations.js';
import type { Environment } from '../types/index.js';
import axios from 'axios';
import configRoutes from './config-routes.js';

const app = express();

// Find available port in range 4500-4900
const findAvailablePort = async (startPort: number = 4501, endPort: number = 4900): Promise<number> => {
  for (let port = startPort; port <= endPort; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available ports in range ${startPort}-${endPort}`);
};

const isPortAvailable = (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
};

// Middleware
app.use(cors());
app.use(express.json());

// Initialize shared instances
const db = new StateDatabase();
const configLoader = new ConfigLoader();

// Mount config routes
app.use('/api', configRoutes);

// ============================================
// API Endpoints
// ============================================

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all groups
app.get('/api/groups', (req: Request, res: Response) => {
  try {
    const groupsConfig = configLoader.loadGroups();
    res.json({ groups: groupsConfig.groups });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get status for environment
app.get('/api/status/:environment', (req: Request, res: Response) => {
  try {
    const environment = req.params.environment as Environment;
    const usersConfig = configLoader.loadUsers();
    const allUsers = usersConfig.users;
    
    const statusData = allUsers.map(user => {
      const status = db.getUserStatus(user.id, environment);
      const hasToken = !!Config.getUserToken(user.id);
      
      return {
        id: user.id,
        email: user.email,
        invited: status.invited,
        hasToken,
        groupCreated: status.groupCreated,
        groupApiId: status.groupApiId,
        sourceCreated: status.sourceCreated,
        sourceApiId: status.sourceApiId
      };
    });
    
    res.json({ users: statusData, environment });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Send invitations
app.post('/api/invite', async (req: Request, res: Response) => {
  try {
    const { environment, groupIds } = req.body;
    
    const detectionsUrl = Config.getApiUrl('detections', environment);
    const detectionsAPI = new DetectionsAPI(detectionsUrl);
    
    const workflow = new InvitationWorkflow(db, detectionsAPI, configLoader, environment);
    await workflow.execute({ groupIds: groupIds || null });
    
    res.json({ success: true, message: 'Invitations sent successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Setup groups and sources
app.post('/api/setup', async (req: Request, res: Response) => {
  try {
    const { environment, groupIds } = req.body;
    
    const detectionsUrl = Config.getApiUrl('detections', environment);
    const integrationsUrl = Config.getApiUrl('integrations', environment);
    const detectionsAPI = new DetectionsAPI(detectionsUrl);
    const integrationsAPI = new IntegrationsAPI(integrationsUrl);
    
    const workflow = new SetupWorkflow(db, detectionsAPI, integrationsAPI, configLoader, environment);
    await workflow.execute({ groupIds: groupIds || null });
    
    res.json({ success: true, message: 'Setup completed successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Cleanup groups and/or sources
app.post('/api/cleanup', async (req: Request, res: Response) => {
  try {
    const { environment, groupIds, sourcesOnly, groupsOnly } = req.body;
    
    const usersConfig = configLoader.loadUsers();
    const allUsers = usersConfig.users;
    
    let selectedUsers = allUsers;
    if (groupIds && groupIds.length > 0) {
      selectedUsers = allUsers.filter((u: any) => groupIds.includes(u.id));
    }
    
    const deleteGroups = !sourcesOnly;
    const deleteSources = !groupsOnly;
    
    for (const user of selectedUsers) {
      const userToken = Config.getUserToken(user.id);
      if (!userToken) continue;
      
      const status = db.getUserStatus(user.id, environment);
      
      // Delete source
      if (deleteSources && status.sourceCreated && status.sourceApiId) {
        try {
          await axios.delete(
            `${Config.getApiUrl('integrations', environment)}/api/v1/sources/${status.sourceApiId}`,
            { headers: { 'Authorization': `Bearer ${userToken}`, 'Accept': '*/*' } }
          );
        } catch (err: any) {
          if (err.response?.status !== 404) throw err;
        }
      }
      
      // Delete group
      if (deleteGroups && status.groupCreated && status.groupApiId) {
        try {
          await axios.delete(
            `${Config.getApiUrl('detections', environment)}/api/v1/groups/${status.groupApiId}`,
            { headers: { 'Authorization': `Bearer ${userToken}`, 'Accept': 'application/json, text/plain, */*' } }
          );
        } catch (err: any) {
          if (err.response?.status !== 404) throw err;
        }
      }
      
      // Remove from database
      if (deleteSources && deleteGroups) {
        db.resetUser(user.id, environment);
      } else if (deleteGroups) {
        db.resetUserGroups(user.id, environment);
      } else if (deleteSources) {
        db.resetUserSources(user.id, environment);
      }
    }
    
    res.json({ success: true, message: 'Cleanup completed successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Reset database
app.post('/api/reset', async (req: Request, res: Response) => {
  try {
    const { environment, groupIds } = req.body;
    
    if (groupIds && groupIds.length > 0) {
      groupIds.forEach((id: string) => db.resetUser(id, environment));
    } else {
      db.resetEnvironment(environment);
    }
    
    res.json({ success: true, message: 'Database reset successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Start server with dynamic port
(async () => {
  try {
    const PORT = process.env.PORT ? parseInt(process.env.PORT) : await findAvailablePort();
    
    app.listen(PORT, () => {
      console.log(`🚀 API server running on http://localhost:${PORT}`);
      console.log(`📝 Make sure web UI is configured to use this port`);
    });
  } catch (error: any) {
    console.error(`❌ Failed to start server: ${error.message}`);
    process.exit(1);
  }
})();

// Cleanup on exit
process.on('SIGINT', () => {
  db.close();
  process.exit(0);
});

