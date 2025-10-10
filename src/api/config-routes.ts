import { Router, Request, Response } from 'express';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const router = Router();

// Helper to get environment file path
const getEnvPath = (environment: string): string => {
  const envFile = `.env.${environment.toLowerCase()}`;
  const envPath = join(process.cwd(), envFile);
  
  // Fallback to .env if environment-specific file doesn't exist
  if (!existsSync(envPath)) {
    return join(process.cwd(), '.env');
  }
  
  return envPath;
};

// Get all tokens from environment-specific file
router.get('/tokens/:environment', (req: Request, res: Response) => {
  try {
    const environment = req.params.environment.toLowerCase(); // dev, qa, prod
    const envPath = getEnvPath(environment);
    const envContent = readFileSync(envPath, 'utf-8');
    
    const tokens: any[] = [];
    const adminTokenMatch = envContent.match(/ADMIN_TOKEN=(.+)/);
    
    // Extract user tokens (simple format without environment suffix)
    const userTokenMatches = envContent.matchAll(/USER_TOKEN_([A-Z0-9_]+)=(.+)/g);
    for (const match of userTokenMatches) {
      const id = match[1].toLowerCase();
      const token = match[2].trim();
      
      // Try to find corresponding email
      const usersPath = join(process.cwd(), 'config/users.json');
      const usersContent = JSON.parse(readFileSync(usersPath, 'utf-8'));
      const user = usersContent.users.find((u: any) => u.id === id);
      
      // Generate environment-specific email
      const email = user?.email.replace(/_dev@/, `_${environment}@`) || `${id}_${environment}@unknown`;
      
      tokens.push({
        id,
        email,
        token,
      });
    }
    
    res.json({
      adminToken: adminTokenMatch ? adminTokenMatch[1].trim() : '',
      tokens,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Save/Update token to environment-specific file
router.post('/tokens', (req: Request, res: Response) => {
  try {
    const { id, email, token, environment } = req.body;
    
    if (!id || !environment) {
      return res.status(400).json({ error: 'ID and environment are required' });
    }
    
    // If token is empty or not provided, use "SKIP"
    const tokenValue = token && token.trim() !== '' ? token.trim() : 'SKIP';
    const env = environment.toLowerCase(); // dev, qa, prod
    
    const envPath = getEnvPath(env);
    let envContent = '';
    
    // Read existing content or create new
    if (existsSync(envPath)) {
      envContent = readFileSync(envPath, 'utf-8');
    }
    
    const envKey = id === 'admin' ? 'ADMIN_TOKEN' : `USER_TOKEN_${id.toUpperCase()}`;
    const envLine = `${envKey}=${tokenValue}`;
    
    // Check if key exists
    const regex = new RegExp(`^${envKey}=.+$`, 'm');
    if (regex.test(envContent)) {
      // Update existing
      envContent = envContent.replace(regex, envLine);
    } else {
      // Add new
      envContent += (envContent && !envContent.endsWith('\n') ? '\n' : '') + envLine + '\n';
    }
    
    writeFileSync(envPath, envContent);
    
    // Update users.json if it's a new user token and email is provided
    if (id !== 'admin' && email) {
      const usersPath = join(process.cwd(), 'config/users.json');
      const usersContent = JSON.parse(readFileSync(usersPath, 'utf-8'));
      
      const userIndex = usersContent.users.findIndex((u: any) => u.id === id);
      if (userIndex === -1) {
        // Add new user (store base email, will be transformed per environment)
        usersContent.users.push({ id, email: email.replace(/_qa@|_prod@|_dev@/, '_dev@') });
        writeFileSync(usersPath, JSON.stringify(usersContent, null, 2));
      }
    }
    
    res.json({ success: true, message: `Token saved to .env.${env}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete token from environment-specific file
router.delete('/tokens/:environment/:id', (req: Request, res: Response) => {
  try {
    const { id, environment } = req.params;
    const env = environment.toLowerCase();
    
    const envPath = getEnvPath(env);
    let envContent = readFileSync(envPath, 'utf-8');
    
    const envKey = id === 'admin' ? 'ADMIN_TOKEN' : `USER_TOKEN_${id.toUpperCase()}`;
    const regex = new RegExp(`^${envKey}=.+$\\n?`, 'm');
    
    envContent = envContent.replace(regex, '');
    writeFileSync(envPath, envContent);
    
    res.json({ success: true, message: `Token deleted from .env.${env}` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Save/Update group
router.post('/groups/save', (req: Request, res: Response) => {
  try {
    const groupConfig = req.body;
    
    if (!groupConfig.id || !groupConfig.name) {
      return res.status(400).json({ error: 'Group ID and name are required' });
    }
    
    const groupsPath = join(process.cwd(), 'config/groups.json');
    const groupsContent = JSON.parse(readFileSync(groupsPath, 'utf-8'));
    
    const index = groupsContent.groups.findIndex((g: any) => g.id === groupConfig.id);
    if (index !== -1) {
      // Update existing
      groupsContent.groups[index] = groupConfig;
    } else {
      // Add new
      groupsContent.groups.push(groupConfig);
    }
    
    writeFileSync(groupsPath, JSON.stringify(groupsContent, null, 2));
    
    // Update users.json
    const usersPath = join(process.cwd(), 'config/users.json');
    const usersContent = JSON.parse(readFileSync(usersPath, 'utf-8'));
    
    const userIndex = usersContent.users.findIndex((u: any) => u.id === groupConfig.id);
    const email = `groups+${groupConfig.id}_${process.env.ENVIRONMENT || 'dev'}@detections.ai`;
    
    if (userIndex === -1) {
      usersContent.users.push({ id: groupConfig.id, email });
      writeFileSync(usersPath, JSON.stringify(usersContent, null, 2));
    }
    
    res.json({ success: true, message: 'Group saved' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete group
router.delete('/groups/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const groupsPath = join(process.cwd(), 'config/groups.json');
    const groupsContent = JSON.parse(readFileSync(groupsPath, 'utf-8'));
    
    groupsContent.groups = groupsContent.groups.filter((g: any) => g.id !== id);
    writeFileSync(groupsPath, JSON.stringify(groupsContent, null, 2));
    
    res.json({ success: true, message: 'Group deleted' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

