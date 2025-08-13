#!/usr/bin/env node

/**
 * MCP SDK Server Startup Script
 * 
 * This script starts the official MCP SDK-based servers.
 * These servers use the @modelcontextprotocol/sdk package.
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting MCP SDK Servers...\n');

// Configuration for SDK-based MCP servers
const servers = [
  {
    name: 'MongoDB MCP Server (SDK)',
    script: 'src/lib/mcp-servers/mongodb-mcp-sdk.ts',
    description: 'MongoDB operations using official MCP SDK'
  },
  {
    name: 'GitHub MCP Server (SDK)',
    script: 'src/lib/mcp-servers/github-mcp-sdk.ts',
    description: 'GitHub operations using official MCP SDK'
  }
];

console.log('Available SDK-based MCP Servers:');
servers.forEach((server, index) => {
  console.log(`${index + 1}. ${server.name}`);
  console.log(`   ${server.description}`);
  console.log(`   Script: ${server.script}\n`);
});

// Start each server
servers.forEach(server => {
  console.log(`Starting ${server.name}...`);
  
  const child = spawn('npx', ['ts-node', server.script], {
    stdio: 'pipe',
    env: process.env,
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

console.log('\n✅ All MCP SDK servers started!');
console.log('📱 Access the demo at: http://localhost:3000/mcp-agent');
console.log('🔍 Health check at: http://localhost:3000/api/health');
console.log('\n📚 These servers use the official @modelcontextprotocol/sdk');
console.log('🌐 For more info: https://modelcontextprotocol.io/');
console.log('\nPress Ctrl+C to stop all servers');

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down MCP SDK servers...');
  process.exit(0);
});

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
}); 