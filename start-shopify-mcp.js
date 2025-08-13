#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting Shopify MCP Server...');

// Start the Shopify MCP server
const shopifyMCP = spawn('node', [
  path.join(__dirname, 'src/lib/mcp-servers/shopify-mcp.js')
], {
  stdio: 'inherit',
  cwd: __dirname
});

shopifyMCP.on('error', (error) => {
  console.error('❌ Failed to start Shopify MCP server:', error);
  process.exit(1);
});

shopifyMCP.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ Shopify MCP server exited with code ${code}`);
    process.exit(code);
  }
});

console.log('✅ Shopify MCP Server started successfully');
console.log('📝 You can now use the Shopify AI agent with MCP integration');

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down Shopify MCP Server...');
  shopifyMCP.kill('SIGINT');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down Shopify MCP Server...');
  shopifyMCP.kill('SIGTERM');
  process.exit(0);
}); 