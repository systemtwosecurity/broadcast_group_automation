#!/usr/bin/env tsx

/**
 * Test script to list all available MCP Playwright tools
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function listTools() {
  console.log('🔍 Listing MCP Playwright Tools\n');

  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y', '@playwright/mcp'],
  });

  const client = new Client(
    { name: 'test-tools', version: '1.0.0' },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);
    
    const tools = await client.listTools();
    console.log(`✅ Found ${tools.tools.length} tools:\n`);
    
    tools.tools.forEach((tool) => {
      console.log(`📌 ${tool.name}`);
      if (tool.description) {
        console.log(`   ${tool.description}`);
      }
      console.log('');
    });
    
    // Look for tools that might execute JavaScript
    const jsTools = tools.tools.filter(t => 
      t.name.includes('console') || 
      t.name.includes('evaluate') || 
      t.name.includes('execute') ||
      t.name.includes('script')
    );
    
    if (jsTools.length > 0) {
      console.log('\n🎯 JavaScript execution tools found:');
      jsTools.forEach(t => console.log(`   - ${t.name}`));
    } else {
      console.log('\n⚠️  No obvious JavaScript execution tools found');
    }
    
    await client.close();
    transport.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

listTools();

