#!/usr/bin/env tsx

/**
 * Test script to verify browser_evaluate can retrieve tokens from localStorage
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function testTokenRetrieval() {
  console.log('🧪 Testing Token Retrieval with browser_evaluate\n');

  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y', '@playwright/mcp'],
  });

  const client = new Client(
    { name: 'test-token', version: '1.0.0' },
    { capabilities: {} }
  );

  try {
    await client.connect(transport);
    console.log('✅ Connected to MCP Playwright\n');

    // Navigate to a test page (httpbin.org allows us to test localStorage)
    console.log('1️⃣  Navigating to test page...');
    await client.callTool({
      name: 'browser_navigate',
      arguments: { url: 'https://httpbin.org/' },
    });
    
    await client.callTool({
      name: 'browser_wait_for',
      arguments: { time: 2 },
    });
    console.log('   ✅ Page loaded\n');

    // Test 1: Set a token in localStorage
    console.log('2️⃣  Setting test token in localStorage...');
    await client.callTool({
      name: 'browser_evaluate',
      arguments: {
        function: `() => {
          localStorage.setItem('test_token', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test_token_12345');
        }`,
      },
    });
    console.log('   ✅ Token set\n');

    // Test 2: Retrieve the token
    console.log('3️⃣  Retrieving token from localStorage...');
    const result = await client.callTool({
      name: 'browser_evaluate',
      arguments: {
        function: `() => {
          return localStorage.getItem('test_token');
        }`,
      },
    });

    console.log('   📦 Raw result:', JSON.stringify(result, null, 2));
    
    const content = result.content as Array<{ text?: string }> | undefined;
    const token = content?.[0]?.text;
    
    if (token && token.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')) {
      console.log('   ✅ Token retrieved successfully!');
      console.log('   🎫 Token:', token.substring(0, 50) + '...\n');
      console.log('🎉 Token retrieval mechanism works!\n');
      return true;
    } else {
      console.log('   ❌ Token not found or incorrect');
      console.log('   Expected to find JWT token, got:', token);
      return false;
    }
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\n📋 Full error:', error);
    return false;
  } finally {
    await client.close();
    transport.close();
  }
}

testTokenRetrieval()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });

