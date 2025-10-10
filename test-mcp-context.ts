import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function main() {
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y', '@playwright/mcp', '--browser', 'chromium', '--headless']
  });

  const client = new Client(
    { name: 'test', version: '1.0' },
    { capabilities: {} }
  );

  await client.connect(transport);
  
  const tools = await client.listTools();
  const relevantTools = tools.tools
    .filter(t => t.name.includes('context') || t.name.includes('browser') || t.name.includes('new'))
    .map(t => ({ name: t.name, description: t.description }));
  
  console.log(JSON.stringify(relevantTools, null, 2));
  
  await client.close();
  transport.close();
}

main().catch(console.error);

