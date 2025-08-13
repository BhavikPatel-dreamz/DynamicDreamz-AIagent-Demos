#!/usr/bin/env node

/**
 * MCP Server Startup Script
 * 
 * This script can be used to start individual MCP servers for testing
 * or development purposes.
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting MCP Servers...\n');

// Configuration for MCP servers
const servers = [
  {
    name: 'MongoDB MCP Server',
    script: 'src/lib/mcp-servers/mongodb-mcp.ts',
    port: process.env.MONGODB_MCP_PORT || 3001,
    env: { ...process.env, MONGODB_MCP_PORT: process.env.MONGODB_MCP_PORT || 3001 }
  },
  {
    name: 'GitHub MCP Server',
    script: 'src/lib/mcp-servers/github-mcp.ts',
    port: process.env.GITHUB_MCP_PORT || 3003,
    env: { ...process.env, GITHUB_MCP_PORT: process.env.GITHUB_MCP_PORT || 3003 }
  }
];

// Start each server
servers.forEach(server => {
  console.log(`Starting ${server.name} on port ${server.port}...`);
  
  const child = spawn('npx', ['ts-node', server.script], {
    stdio: 'pipe',
    env: server.env,
    cwd: process.cwd()
  });

  child.stdout.on('data', (data) => {
    console.log(`[${server.name}] ${data.toString().trim()}`);
  });

  child.stderr.on('data', (data) => {
    console.error(`[${server.name}] ERROR: ${data.toString().trim()}`);
  });

  child.on('close', (code) => {
    console.log(`[${server.name}] Process exited with code ${code}`);
  });

  child.on('error', (error) => {
    console.error(`[${server.name}] Failed to start: ${error.message}`);
  });
});

console.log('\n✅ All MCP servers started!');
console.log('📱 Access the demo at: http://localhost:3000/mcp-agent');
console.log('🔍 Health check at: http://localhost:3000/api/health');
console.log('\nPress Ctrl+C to stop all servers');

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down MCP servers...');
  process.exit(0);
}); 