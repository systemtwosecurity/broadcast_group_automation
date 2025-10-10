import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function main() {
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y', '@playwright/mcp', '--browser', 'chromium', '--headless', '--isolated']
  });

  const client = new Client(
    { name: 'test', version: '1.0' },
    { capabilities: {} }
  );

  await client.connect(transport);
  
  // Navigate to a page
  console.log('Navigating to detections.dev.s2s.ai...');
  await client.callTool({
    name: 'browser_navigate',
    arguments: { url: 'https://detections.dev.s2s.ai' }
  });
  
  await client.callTool({
    name: 'browser_wait_for',
    arguments: { time: 3 }
  });
  
  // Check network requests for cookies
  console.log('\nChecking network requests...');
  const networkResult = await client.callTool({
    name: 'browser_network_requests',
    arguments: {}
  });
  
  console.log('Network result:', JSON.stringify(networkResult, null, 2));
  
  await client.close();
  transport.close();
}

main().catch(console.error);
