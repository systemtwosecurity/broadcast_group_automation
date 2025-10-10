#!/usr/bin/env tsx

/**
 * Test script to verify MCP Playwright connectivity and basic operations
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function testMCPPlaywright() {
  console.log('🧪 Testing MCP Playwright Connection\n');

  let client: Client | null = null;
  let transport: StdioClientTransport | null = null;

  try {
    // Step 1: Connect to MCP Server
    console.log('1️⃣  Connecting to @playwright/mcp server...');
    transport = new StdioClientTransport({
      command: 'npx',
      args: ['-y', '@playwright/mcp'],
    });

    client = new Client(
      { name: 'mcp-test', version: '1.0.0' },
      { capabilities: {} }
    );

    await client.connect(transport);
    console.log('   ✅ Connected successfully!\n');

    // Step 2: Navigate to a test page
    console.log('2️⃣  Navigating to example.com...');
    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: 'https://example.com' },
    });
    console.log('   ✅ Navigation successful!\n');

    // Step 3: Wait for page to load
    console.log('3️⃣  Waiting for page to load...');
    await client.callTool({
      name: 'browser_wait_for',
      arguments: { time: 2 },
    });
    console.log('   ✅ Page loaded!\n');

    // Step 4: Take a snapshot
    console.log('4️⃣  Capturing page snapshot...');
    const snapshot = await client.callTool({
      name: 'browser_snapshot',
      arguments: {},
    });
    console.log('   ✅ Snapshot captured!');
    console.log('   📸 Snapshot type:', typeof snapshot.content);
    console.log('   📸 Content length:', JSON.stringify(snapshot.content).length, 'bytes\n');

    // Step 5: Take a screenshot
    console.log('5️⃣  Taking screenshot...');
    const screenshot = await client.callTool({
      name: 'browser_take_screenshot',
      arguments: {
        filename: 'test-screenshot.png'
      },
    });
    console.log('   ✅ Screenshot saved!');
    console.log('   📷 Result:', screenshot.content?.[0]?.text || 'Success\n');

    console.log('\n🎉 All tests passed! MCP Playwright is working correctly.\n');
    
    return true;
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\n📋 Error details:', error);
    return false;
  } finally {
    // Cleanup
    if (client) {
      await client.close();
    }
    if (transport) {
      transport.close();
    }
  }
}

// Run the test
testMCPPlaywright()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });

