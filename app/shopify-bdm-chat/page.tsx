'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Loader2, Plus, MoreVertical, MessageSquare, Settings } from 'lucide-react';
import Link from 'next/link';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: any;
}

export default function ShopifyBDMChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/shopify-bdm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input.trim(),
          clientInfo: null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          metadata: data.metadata,
        };

        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'I apologize, but I encountered an error. Please try again or contact support if the issue persists.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatMessage = (content: string) => {
    const formatted = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/•/g, '◦')
      .replace(/\n/g, '<br />');
    
    return formatted;
  };

  const renderMessageContent = (message: Message) => {
    const content = message.content;
    
    // Check if content contains table format
    if (content.includes('|') && content.includes('---')) {
      return renderTableContent(content);
    }
    
    return (
      <div 
        className="prose prose-sm max-w-none text-gray-100"
        dangerouslySetInnerHTML={{ __html: formatMessage(content) }}
      />
    );
  };

  const renderTableContent = (content: string) => {
    const lines = content.split('\n');
    let tableStartIndex = -1;
    let tableEndIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('|') && lines[i].includes('---')) {
        if (tableStartIndex === -1) {
          tableStartIndex = i - 1;
        }
      } else if (tableStartIndex !== -1 && !lines[i].includes('|')) {
        tableEndIndex = i;
        break;
      }
    }
    
    if (tableStartIndex === -1) {
      return <div className="text-gray-100" dangerouslySetInnerHTML={{ __html: formatMessage(content) }} />;
    }
    
    const beforeTable = lines.slice(0, tableStartIndex).join('\n');
    const tableLines = lines.slice(tableStartIndex, tableEndIndex === -1 ? undefined : tableEndIndex);
    const afterTable = tableEndIndex !== -1 ? lines.slice(tableEndIndex).join('\n') : '';
    
    const headers = tableLines[0]?.split('|').map(h => h.trim()).filter(h => h);
    const rows = tableLines.slice(2)?.map(line => 
      line.split('|').map(cell => cell.trim()).filter(cell => cell)
    );
    
    return (
      <div className="space-y-4">
        {beforeTable && (
          <div className="text-gray-100" dangerouslySetInnerHTML={{ __html: formatMessage(beforeTable) }} />
        )}
        
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-600 rounded-lg bg-gray-800">
            <thead className="bg-gray-700">
              <tr>
                {headers?.map((header, i) => (
                  <th key={i} className="px-4 py-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-gray-800 divide-y divide-gray-600">
              {rows?.map((row, i) => (
                <tr key={i} className="hover:bg-gray-700">
                  {row.map((cell, j) => (
                    <td key={j} className="px-4 py-2 whitespace-nowrap text-sm text-gray-100">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {afterTable && (
          <div className="text-gray-100" dangerouslySetInnerHTML={{ __html: formatMessage(afterTable) }} />
        )}
      </div>
    );
  };

  const newChat = () => {
    setMessages([]);
    setInput('');
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-64 bg-gray-950 flex flex-col">
        {/* New Chat Button */}
        <div className="p-3 border-b border-gray-700">
          <button
            onClick={newChat}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm">New chat</span>
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 p-3">
          <div className="text-xs text-gray-400 mb-2">Recent</div>
          {messages.length > 0 && (
            <div className="space-y-1">
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 bg-gray-800">
                <MessageSquare className="w-4 h-4" />
                <span className="truncate">Shopify Consultation</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-gray-700">
          <div className="text-xs text-gray-500">
            Shopify Development Consultant
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">Shopify Development Consultant</h1>
            <div className="flex items-center gap-2">
              <Link 
                href="/shopify-admin"
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm transition-colors"
                title="Manage Projects & Quotes"
              >
                <Settings className="w-4 h-4" />
                Admin Panel
              </Link>
              <button className="p-2 hover:bg-gray-800 rounded-lg">
                <MoreVertical className="w-5 h-5 text-gray-400" />
              </button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            // Welcome Screen
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-6">
                <Bot className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-semibold mb-4">Shopify Development Consultant</h2>
              <p className="text-gray-400 mb-8 max-w-md">
                I can help you with project quotes, technical questions, project scoping, 
                pricing inquiries, timeline discussions, and capability assessments.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
                <button
                  onClick={() => setInput("I need a quote for a custom Shopify store")}
                  className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors"
                >
                  <div className="font-medium mb-1">Get a Project Quote</div>
                  <div className="text-sm text-gray-400">Custom store development pricing</div>
                </button>
                <button
                  onClick={() => setInput("What are Shopify's API limitations?")}
                  className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors"
                >
                  <div className="font-medium mb-1">Technical Questions</div>
                  <div className="text-sm text-gray-400">APIs, features, and capabilities</div>
                </button>
                <button
                  onClick={() => setInput("How long does a Shopify migration take?")}
                  className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors"
                >
                  <div className="font-medium mb-1">Timeline Estimates</div>
                  <div className="text-sm text-gray-400">Project duration and milestones</div>
                </button>
                <button
                  onClick={() => setInput("What can be customized in Shopify?")}
                  className="p-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-left transition-colors"
                >
                  <div className="font-medium mb-1">Capability Assessment</div>
                  <div className="text-sm text-gray-400">What's possible with Shopify</div>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {messages.map((message) => (
                <div key={message.id} className="flex gap-4">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === 'user' 
                      ? 'bg-blue-600' 
                      : 'bg-green-600'
                  }`}>
                    {message.role === 'user' ? (
                      <User className="w-4 h-4" />
                    ) : (
                      <Bot className="w-4 h-4" />
                    )}
                  </div>
                  
                  <div className="flex-1 space-y-2">
                    <div className="text-sm font-medium text-gray-300">
                      {message.role === 'user' ? 'You' : 'Shopify Consultant'}
                    </div>
                    <div>
                      {renderMessageContent(message)}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="text-sm font-medium text-gray-300">Shopify Consultant</div>
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                      <span className="text-gray-400">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-700 p-6">
          <form onSubmit={handleSubmit} className="relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message Shopify Consultant..."
              className="w-full p-4 pr-12 bg-gray-800 border border-gray-600 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-gray-400"
              rows={1}
              style={{
                minHeight: '56px',
                maxHeight: '200px'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          
          <div className="mt-2 text-xs text-gray-500 text-center">
            Press Enter to send, Shift+Enter for new line
          </div>
        </div>
      </div>
    </div>
  );
}
