import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, X, Bot, User, FileText, Sparkles, AlertCircle } from 'lucide-react';

export const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [userId, setUserId] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadedFilesCount, setUploadedFilesCount] = useState(0);
  const messagesEndRef = useRef(null);

  // Generate random user ID (same logic as PDFUpload component)
  const generateUserId = () => {
    const timestamp = Date.now();
    const randomNum = Math.floor(Math.random() * 10000);
    return `user_${timestamp}_${randomNum}`;
  };

  // Get userId from URL query parameters
  const getUserIdFromQuery = () => {
    if (typeof window === 'undefined') return null;
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('userId');
  };

  // Check user connection status using list API
  const checkUserDocuments = async (userIdToCheck) => {
    try {
      const response = await fetch('/api/pdf-base/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userIdToCheck,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.status}`);
      }

      const result = await response.json();
      
      // Handle the actual API response structure (same as PDFUpload component)
      let filesData = [];
      if (result.success && result.response && Array.isArray(result.response)) {
        filesData = result.response;
      } else if (Array.isArray(result.files)) {
        filesData = result.files;
      } else if (Array.isArray(result)) {
        filesData = result;
      }

      const hasDocuments = filesData.length > 0;
      setIsConnected(hasDocuments);
      setUploadedFilesCount(filesData.length);
      
      return hasDocuments;
    } catch (error) {
      console.error('Error checking user documents:', error);
      setIsConnected(false);
      setUploadedFilesCount(0);
      return false;
    }
  };

  // Check user connection status via API
  useEffect(() => {
    const checkUserStatus = async () => {
      setIsLoading(true);
      
      // Priority order: Query params -> LocalStorage -> Generate new
      let finalUserId = getUserIdFromQuery();
      
      if (!finalUserId) {
        // Try to get from localStorage
        finalUserId = typeof window !== 'undefined' ? localStorage.getItem('pdf_upload_user_id') : null;
      }
      
      if (!finalUserId) {
        // Generate new one only if neither query param nor localStorage exists
        finalUserId = generateUserId();
      }
      
      // Always store in localStorage for consistency
      if (typeof window !== 'undefined') {
        localStorage.setItem('pdf_upload_user_id', finalUserId);
      }
      
      // Set the userId in state
      setUserId(finalUserId);
      
      // Check documents for this user
      const hasDocuments = await checkUserDocuments(finalUserId);
      
      // Load chat history if user has documents
      if (hasDocuments) {
        await loadChatHistory(finalUserId);
      }
      
      setIsLoading(false);
    };

    checkUserStatus();
  }, []);

  // Listen for changes in URL query parameters
  useEffect(() => {
    const handleUrlChange = () => {
      const queryUserId = getUserIdFromQuery();
      if (queryUserId && queryUserId !== userId) {
        // Update userId if query param changes
        setUserId(queryUserId);
        if (typeof window !== 'undefined') {
          localStorage.setItem('pdf_upload_user_id', queryUserId);
        }
        // Clear messages and reload data for new user
        setMessages([]);
        checkUserDocuments(queryUserId).then(hasDocuments => {
          if (hasDocuments) {
            loadChatHistory(queryUserId);
          }
        });
      }
    };

    // Listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', handleUrlChange);
    
    // Listen for URL hash changes (if using hash routing)
    window.addEventListener('hashchange', handleUrlChange);
    
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, [userId]);

  // Refresh documents status when widget opens
  useEffect(() => {
    if (isOpen && userId) {
      checkUserDocuments(userId);
    }
  }, [isOpen, userId]);

  // Load chat history from API
  const loadChatHistory = async (userId) => {
    try {
      const response = await fetch('/api/pdf-base/chat-history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.messages && data.messages.length > 0) {
          const formattedMessages = data.messages.map(msg => ({
            id: msg.id || Date.now().toString(),
            type: msg.type || (msg.role === 'user' ? 'user' : 'assistant'),
            content: msg.content || msg.message,
            timestamp: new Date(msg.timestamp || msg.created_at),
            pdfReferences: msg.sources || msg.references || [],
            metadata: msg.metadata,
          }));
          setMessages(formattedMessages);
        }
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputValue.trim()) return;
    if (!userId || !isConnected) {
      return; // Silently return if not connected
    }

    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const query = inputValue.trim();
    setInputValue('');
    setIsTyping(true);

    try {
      // Call your actual API
      const response = await fetch('/api/pdf-base/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId,
          query: query,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.response || data.answer || 'I found some information in your documents.',
        timestamp: new Date(),
        pdfReferences: data.sources || data.references || [],
        metadata: data.metadata,
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat API error:', error);
      
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Sorry, I encountered an error while searching your documents: ${error.message}. Please make sure your documents are properly uploaded and try again.`,
        timestamp: new Date(),
        isError: true,
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date) => {
    try {
      return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(new Date(date));
    } catch (error) {
      return '';
    }
  };

  const getStatusText = () => {
    if (isLoading) return 'Loading...';
    if (isConnected) return `Ready to search (${uploadedFilesCount} documents)`;
    return 'Upload documents first';
  };

  const getStatusColor = () => {
    if (isLoading) return 'bg-gray-400';
    if (isConnected) return 'bg-green-500 animate-pulse';
    return 'bg-yellow-500';
  };

  return (
    <div className="fixed bottom-8 right-8 z-50">
      {!isOpen ? (
        <div className="relative">
          <button
            onClick={() => setIsOpen(true)}
            className="w-14 h-14 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 hover:scale-110 flex items-center justify-center group"
          >
            <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform duration-200" />
          </button>
          
          {/* Status indicator */}
          <div className={`absolute -top-2 -right-2 w-4 h-4 rounded-full border-2 border-white ${getStatusColor()}`} 
               title={getStatusText()}>
          </div>
          
          {/* Document count badge */}
          {!isLoading && uploadedFilesCount > 0 && (
            <div className="absolute -top-1 -left-1 w-5 h-5 bg-blue-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
              {uploadedFilesCount}
            </div>
          )}
        </div>
      ) : (
        <div className="w-96 h-[35rem] bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden transition-all duration-300">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">PDF Assistant</h3>
                  <p className="text-green-100 text-sm flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${
                      isLoading ? 'bg-gray-300' : isConnected ? 'bg-green-300' : 'bg-yellow-300'
                    }`}></span>
                    {getStatusText()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all duration-200 hover:rotate-90"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
            
            {/* User ID and Document Count Display */}
            {userId && !isLoading && (
              <div className="mt-3 p-2 bg-white/10 rounded-lg">
                <div className="flex items-center justify-between text-xs text-green-100">
                  <span title={`Full User ID: ${userId}`}>
                    User ID: {userId.length > 20 ? `${userId.substring(0, 20)}...` : userId}
                  </span>
                  {uploadedFilesCount > 0 && (
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {uploadedFilesCount} docs
                    </span>
                  )}
                </div>
                {getUserIdFromQuery() && (
                  <div className="text-xs text-green-200 mt-1">
                    ✓ From URL parameter
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Messages */}
          <div className="flex-1 p-6 h-80 overflow-y-auto bg-gray-50">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-green-500 border-t-transparent mx-auto mb-4"></div>
                  <p className="text-gray-500 text-sm">Loading your chat...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Bot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-sm">
                    {isConnected 
                      ? `Start asking questions about your ${uploadedFilesCount} document${uploadedFilesCount !== 1 ? 's' : ''}` 
                      : 'Upload PDF documents first to start chatting'
                    }
                  </p>
                  {!isConnected && (
                    <p className="text-gray-400 text-xs mt-2">
                      Go to the upload section to add your PDFs
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.type === 'assistant' && (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1 ${
                        message.isError 
                          ? 'bg-gradient-to-r from-red-500 to-red-600' 
                          : 'bg-gradient-to-r from-green-500 to-green-600'
                      }`}>
                        {message.isError ? (
                          <AlertCircle className="w-4 h-4 text-white" />
                        ) : (
                          <Bot className="w-4 h-4 text-white" />
                        )}
                      </div>
                    )}
                    
                    <div
                      className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed transition-all duration-200 ${
                        message.type === 'user'
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white ml-auto'
                          : message.isError
                            ? 'bg-red-50 text-red-800 border border-red-200'
                            : 'bg-white text-gray-800 shadow-sm border border-gray-100'
                      }`}
                    >
                      <p>{message.content}</p>
                      
                      {/* PDF References */}
                      {message.pdfReferences && Array.isArray(message.pdfReferences) && message.pdfReferences.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-200 space-y-2">
                          <p className="text-xs text-gray-500 font-medium">Referenced documents:</p>
                          {message.pdfReferences.map((pdf, idx) => (
                            <div key={idx} className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 rounded-lg p-2">
                              <FileText className="w-3 h-3 text-red-500" />
                              <span className="truncate">{typeof pdf === 'string' ? pdf : pdf.filename || pdf.name || 'Document'}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Timestamp */}
                      {message.timestamp && (
                        <div className={`text-xs mt-2 ${
                          message.type === 'user' ? 'text-blue-200' : 'text-gray-400'
                        }`}>
                          {formatTime(message.timestamp)}
                        </div>
                      )}
                    </div>
                    
                    {message.type === 'user' && (
                      <div className="w-8 h-8 bg-gradient-to-r from-gray-600 to-gray-700 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <User className="w-4 h-4 text-white" />
                      </div>
                    )}
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex gap-3 justify-start">
                    <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-green-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Searching {uploadedFilesCount} document{uploadedFilesCount !== 1 ? 's' : ''}...</p>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-6 bg-white border-t border-gray-100">
            <div className="flex gap-3 items-end">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={
                    isLoading ? "Loading..." : 
                    isConnected ? `Ask about your ${uploadedFilesCount} PDF${uploadedFilesCount !== 1 ? 's' : ''}...` : 
                    "Upload documents first..."
                  }
                  className={`w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200 text-gray-900 placeholder-gray-500 pr-12 ${
                    (!isConnected || isLoading) ? 'cursor-not-allowed opacity-60' : ''
                  }`}
                  disabled={isTyping || !isConnected || isLoading}
                />
                {inputValue.trim() && isConnected && !isLoading && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Sparkles className="w-4 h-4 text-gray-400" />
                  </div>
                )}
              </div>
              <button
                onClick={sendMessage}
                disabled={!inputValue.trim() || isTyping || !isConnected || isLoading}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200 ${
                  inputValue.trim() && !isTyping && isConnected && !isLoading
                    ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg hover:shadow-xl hover:scale-105'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            
            {/* Status message for non-connected state */}
            {!isLoading && !isConnected && (
              <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  <p className="text-xs text-amber-700">
                    No documents found. Upload PDF files first to enable chat functionality.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};