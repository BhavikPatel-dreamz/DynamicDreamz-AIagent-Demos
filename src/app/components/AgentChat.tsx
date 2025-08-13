'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { ScrollArea } from '../components/ui/scroll-area';
import { Badge } from '../components/ui/badge';
import { Loader2, Send, Bot, User, Database, Github } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    mcpServers?: string[];
    toolCalls?: any[];
  };
}

interface AgentResponse {
  message: string;
  toolCalls: any[];
  metadata: {
    serversUsed: string[];
    executionTime: number;
  };
}

export default function AgentChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState<any>(null);
  const [availableTools, setAvailableTools] = useState<any[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSystemStatus();
    loadAvailableTools();
  }, []);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const loadSystemStatus = async () => {
    try {
      const response = await fetch('/api/health');
      const data = await response.json();
      setSystemStatus(data);
    } catch (error) {
      console.error('Failed to load system status:', error);
    }
  };

  const loadAvailableTools = async () => {
    try {
      const response = await fetch('/api/agent');
      const data = await response.json();
      setAvailableTools(data.tools || []);
    } catch (error) {
      console.error('Failed to load available tools:', error);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: inputMessage }),
      });

      const data: AgentResponse = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        metadata: {
          mcpServers: data.metadata.serversUsed,
          toolCalls: data.toolCalls
        }
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to send message:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getServerIcon = (server: string) => {
    switch (server.toLowerCase()) {
      case 'mongodb':
        return <Database className="w-4 h-4" />;
      case 'github':
        return <Github className="w-4 h-4" />;
      default:
        return <Bot className="w-4 h-4" />;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Multi-MCP AI Agent Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          {systemStatus ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {systemStatus.mcp?.servers?.length || 0}
                </div>
                <div className="text-sm text-gray-600">MCP Servers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {availableTools.length}
                </div>
                <div className="text-sm text-gray-600">Available Tools</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {messages.length}
                </div>
                <div className="text-sm text-gray-600">Messages</div>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-500">Loading system status...</div>
          )}
        </CardContent>
      </Card>

      {/* Chat Interface */}
      <Card className="h-[600px] flex flex-col">
        <CardHeader>
          <CardTitle>Chat with AI Agent</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col">
          <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-blue-600" />
                    </div>
                  )}
                  
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    
                    {message.metadata?.mcpServers && message.metadata.mcpServers.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {message.metadata.mcpServers.map((server, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {getServerIcon(server)}
                            <span className="ml-1">{server}</span>
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <div className={`text-xs mt-2 ${
                      message.role === 'user' ? 'text-blue-200' : 'text-gray-500'
                    }`}>
                      {formatTimestamp(message.timestamp)}
                    </div>
                  </div>
                  
                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="bg-gray-100 rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-gray-600">Processing...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <div className="flex gap-2 mt-4">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about MongoDB data, GitHub repositories, or anything else..."
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="px-6"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Available Tools */}
      <Card>
        <CardHeader>
          <CardTitle>Available MCP Tools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableTools.map((tool, index) => (
              <div key={index} className="border rounded-lg p-3">
                <div className="font-medium text-sm">{tool.name}</div>
                <div className="text-xs text-gray-600 mt-1">{tool.description}</div>
                {tool.inputSchema?.properties && (
                  <div className="mt-2">
                    <div className="text-xs font-medium text-gray-700">Parameters:</div>
                    <div className="text-xs text-gray-600">
                      {Object.keys(tool.inputSchema.properties).join(', ')}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 