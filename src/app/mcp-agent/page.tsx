import AgentChat from '../components/AgentChat';

export default function MCPAgentPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Multi-MCP AI Agent Demo
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Experience an AI agent that orchestrates multiple MCP (Model Context Protocol) servers 
            to provide intelligent responses and execute tools across different services.
          </p>
        </div>
        
        <AgentChat />
        
        <div className="mt-12 text-center text-gray-500">
          <p className="text-sm">
            This demo showcases how multiple MCP servers can work together through a central orchestrator.
          </p>
        </div>
      </div>
    </div>
  );
} 