import { Router, Request, Response } from 'express';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const router = Router();

// Get all tokens (from .env) for a specific environment
router.get('/tokens/:environment', (req: Request, res: Response) => {
  try {
    const environment = req.params.environment.toUpperCase(); // DEV, QA, PROD
    const envPath = join(process.cwd(), '.env');
    const envContent = readFileSync(envPath, 'utf-8');
    
    const tokens: any[] = [];
    const adminTokenMatch = envContent.match(new RegExp(`ADMIN_TOKEN_${environment}=(.+)`));
    const adminTokenFallback = envContent.match(/ADMIN_TOKEN=(.+)/);
    
    // Extract environment-specific user tokens
    const userTokenMatches = envContent.matchAll(new RegExp(`USER_TOKEN_([A-Z0-9_]+)_${environment}=(.+)`, 'g'));
    for (const match of userTokenMatches) {
      const id = match[1].toLowerCase();
      const token = match[2].trim();
      
      // Try to find corresponding email
      const usersPath = join(process.cwd(), 'config/users.json');
      const usersContent = JSON.parse(readFileSync(usersPath, 'utf-8'));
      const user = usersContent.users.find((u: any) => u.id === id);
      
      // Generate environment-specific email
      const emailSuffix = environment.toLowerCase();
      const email = user?.email.replace(/_dev@/, `_${emailSuffix}@`) || `${id}_${emailSuffix}@unknown`;
      
      tokens.push({
        id,
        email,
        token,
      });
    }
    
    res.json({
      adminToken: (adminTokenMatch ? adminTokenMatch[1].trim() : (adminTokenFallback ? adminTokenFallback[1].trim() : '')),
      tokens,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Save/Update token with environment
router.post('/tokens', (req: Request, res: Response) => {
  try {
    const { id, email, token, environment } = req.body;
    
    if (!id || !environment) {
      return res.status(400).json({ error: 'ID and environment are required' });
    }
    
    // If token is empty or not provided, use "SKIP"
    const tokenValue = token && token.trim() !== '' ? token.trim() : 'SKIP';
    const env = environment.toUpperCase(); // DEV, QA, PROD
    
    const envPath = join(process.cwd(), '.env');
    let envContent = readFileSync(envPath, 'utf-8');
    
    const envKey = id === 'admin' ? `ADMIN_TOKEN_${env}` : `USER_TOKEN_${id.toUpperCase()}_${env}`;
    const envLine = `${envKey}=${tokenValue}`;
    
    // Check if key exists
    const regex = new RegExp(`^${envKey}=.+$`, 'm');
    if (regex.test(envContent)) {
      // Update existing
      envContent = envContent.replace(regex, envLine);
    } else {
      // Add new
      envContent += `\n${envLine}`;
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
    
    res.json({ success: true, message: 'Token saved' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete token for specific environment
router.delete('/tokens/:environment/:id', (req: Request, res: Response) => {
  try {
    const { id, environment } = req.params;
    const env = environment.toUpperCase();
    
    const envPath = join(process.cwd(), '.env');
    let envContent = readFileSync(envPath, 'utf-8');
    
    const envKey = id === 'admin' ? `ADMIN_TOKEN_${env}` : `USER_TOKEN_${id.toUpperCase()}_${env}`;
    const regex = new RegExp(`^${envKey}=.+$\\n?`, 'm');
    
    envContent = envContent.replace(regex, '');
    writeFileSync(envPath, envContent);
    
    res.json({ success: true, message: 'Token deleted' });
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

