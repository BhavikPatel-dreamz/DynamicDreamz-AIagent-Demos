'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { ScrollArea } from '../ui/scroll-area';
import { Badge } from '../ui/badge';
import { Loader2, Send, Bot, User, Database, Github, MessageSquare, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '../ui/button';
import { SessionManager } from './SessionManager';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: {
    searchResults?: {
      mongoResults?: any[];
      qdrantResults?: any[];
      searchQuery?: string;
    };
    toolCalls?: any[];
    mcpServers?: string[];
    processingTime?: number;
  };
}

interface AgentResponse {
  message: string;
  toolCalls: any[];
  metadata: {
    serversUsed: string[];
    executionTime: number;
    searchResults?: any;
    sessionId?: string;
  };
}

export default function EnhancedAgentChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [sessionTitle, setSessionTitle] = useState('New Chat');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Initialize with a new session
  useEffect(() => {
    createNewSession();
  }, []);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const createNewSession = async () => {
    try {
      const response = await fetch('/api/shopify-bdm/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' })
      });
      
      const data = await response.json();
      if (data.success) {
        setCurrentSessionId(data.sessionId);
        setSessionTitle(data.title || 'New Chat');
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const loadSession = async (sessionId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/shopify-bdm/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'load', sessionId })
      });
      
      const data = await response.json();
      if (data.success) {
        setCurrentSessionId(sessionId);
        setSessionTitle(data.title || 'Chat Session');
        // Convert history to Message format
        const loadedMessages = (data.history || []).map((msg: any) => ({
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          metadata: msg.metadata
        }));
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !currentSessionId) return;

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageToSend = inputMessage;
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/shopify-bdm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          message: messageToSend,
          sessionId: currentSessionId
        }),
      });

      const data: AgentResponse = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        metadata: {
          searchResults: data.metadata.searchResults,
          mcpServers: data.metadata.serversUsed,
          toolCalls: data.toolCalls,
          processingTime: data.metadata.executionTime
        }
      };

      setMessages(prev => [...prev, assistantMessage]);

      // Update session title if this is the first message
      if (messages.length === 0) {
        const newTitle = messageToSend.slice(0, 50) + (messageToSend.length > 50 ? '...' : '');
        setSessionTitle(newTitle);
      }

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
      case 'qdrant':
        return <Database className="w-4 h-4 text-purple-500" />;
      default:
        return <Bot className="w-4 h-4" />;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const renderSearchResults = (metadata?: Message['metadata']) => {
    if (!metadata?.searchResults) return null;

    const { mongoResults, qdrantResults, searchQuery } = metadata.searchResults;
    
    return (
      <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
        <h4 className="font-medium text-sm text-gray-700 mb-2 flex items-center gap-2">
          <Database className="w-4 h-4" />
          Search Results for: "{searchQuery}"
        </h4>
        
        {mongoResults && mongoResults.length > 0 && (
          <div className="mb-2">
            <Badge variant="secondary" className="mb-1">
              MongoDB: {mongoResults.length} results
            </Badge>
            <div className="text-xs text-gray-600">
              Found relevant data from projects, quotes, and conversations
            </div>
          </div>
        )}
        
        {qdrantResults && qdrantResults.length > 0 && (
          <div>
            <Badge variant="outline" className="mb-1">
              Qdrant: {qdrantResults.length} semantic matches
            </Badge>
            <div className="text-xs text-gray-600">
              Vector similarity search results
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Session Manager Sidebar */}
      <SessionManager
        currentSessionId={currentSessionId}
        onSessionChange={loadSession}
        onNewSession={createNewSession}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                {sessionTitle}
              </h1>
              <p className="text-sm text-gray-500">
                Enhanced AI Agent with Comprehensive Search
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Session: {currentSessionId.slice(0, 8)}...
              </Badge>
              <div className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-xs text-gray-500">Connected</span>
              </div>
            </div>
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-hidden">
          <ScrollArea ref={scrollAreaRef} className="h-full p-4">
            <div className="space-y-4 max-w-4xl mx-auto">
              {messages.length === 0 && (
                <div className="text-center py-12">
                  <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">
                    Welcome to Enhanced AI Chat
                  </h3>
                  <p className="text-gray-500 mb-4">
                    I can search through your MongoDB data and Qdrant vectors to provide comprehensive answers.
                  </p>
                  <div className="flex justify-center gap-2">
                    <Badge>MongoDB Search</Badge>
                    <Badge>Vector Similarity</Badge>
                    <Badge>Session Management</Badge>
                  </div>
                </div>
              )}

              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex gap-3 ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  )}
                  
                  <div
                    className={`max-w-2xl rounded-lg p-4 ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    <div className="prose prose-sm max-w-none">
                      {message.content.split('\\n').map((line, lineIndex) => (
                        <p key={lineIndex} className={`${lineIndex > 0 ? 'mt-2' : ''} ${message.role === 'user' ? 'text-white' : ''}`}>
                          {line}
                        </p>
                      ))}
                    </div>

                    {/* Search Results */}
                    {renderSearchResults(message.metadata)}

                    {/* Metadata */}
                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200">
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500">
                          {formatTimestamp(message.timestamp)}
                        </span>
                        {message.metadata?.processingTime && (
                          <>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">
                              {message.metadata.processingTime}ms
                            </span>
                          </>
                        )}
                      </div>
                      
                      {message.metadata?.mcpServers && message.metadata.mcpServers.length > 0 && (
                        <div className="flex gap-1">
                          {message.metadata.mcpServers.map((server, i) => (
                            <div
                              key={i}
                              className="flex items-center gap-1"
                              title={`Used ${server} server`}
                            >
                              {getServerIcon(server)}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {message.role === 'user' && (
                    <div className="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Searching and analyzing...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-gray-200 p-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything about your data..."
                  className="pr-12"
                  disabled={isLoading || !currentSessionId}
                />
              </div>
              <Button
                onClick={sendMessage}
                disabled={isLoading || !inputMessage.trim() || !currentSessionId}
                className="px-6"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
            
            <div className="mt-2 text-xs text-gray-500 text-center">
              Enhanced search across MongoDB collections and Qdrant vectors • Session: {currentSessionId.slice(0, 8)}...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
