#!/usr/bin/env tsx

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function checkToolSchema() {
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y', '@playwright/mcp'],
  });

  const client = new Client(
    { name: 'test', version: '1.0.0' },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);
    
    const tools = await client.listTools();
    const evaluateTool = tools.tools.find(t => t.name === 'browser_evaluate');
    
    if (evaluateTool) {
      console.log('browser_evaluate tool schema:');
      console.log(JSON.stringify(evaluateTool, null, 2));
    }
    
    await client.close();
    transport.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkToolSchema();

