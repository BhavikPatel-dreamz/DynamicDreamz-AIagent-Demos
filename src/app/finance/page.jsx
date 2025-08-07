"use client"
import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  History, 
  X, 
  Plus, 
  Minus, 
  PieChart, 
  CreditCard, 
  Send,
  Wallet,
} from 'lucide-react';

const FinanceAssistant = () => {
  const [message, setMessage] = useState('');
  const [conversations, setConversations] = useState([]);
  const [balance, setBalance] = useState(5420.50);
  const [sessionId] = useState('session_1754557777385');
  
  const handleSendMessage = () => {
    if (message.trim()) {
      const newConversation = {
        id: Date.now(),
        message: message,
        timestamp: new Date().toLocaleTimeString(),
        response: "I'm here to help you manage your finances! You can check your balance, view categories, recent transactions, add expenses, or add income using the buttons below."
      };
      setConversations([...conversations, newConversation]);
      setMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  const handleQuickAction = (action) => {
    let response = '';
    switch (action) {
      case 'balance':
        response = `Your current balance is $${balance.toFixed(2)}. Looking good! 💰`;
        break;
      case 'categories':
        response = `Here are your spending categories: Food & Dining ($1,250), Transportation ($850), Shopping ($650), Entertainment ($420), Bills & Utilities ($980). Need help with budgeting?`;
        break;
      case 'transactions':
        response = `Your recent transactions include: Grocery Store (-$85.20), Salary Deposit (+$3,200), Coffee Shop (-$12.50), and more. Would you like me to analyze your spending patterns?`;
        break;
      case 'expense':
        response = `I can help you add a new expense. What did you spend money on? Please provide the amount and category.`;
        break;
      case 'income':
        response = `Great! Let's add some income. What type of income is this and how much?`;
        break;
      default:
        response = `How can I help you with your finances today?`;
    }
    
    const newConversation = {
      id: Date.now(),
      message: `Quick action: ${action}`,
      timestamp: new Date().toLocaleTimeString(),
      response: response
    };
    setConversations([...conversations, newConversation]);
  };

  const clearConversations = () => {
    setConversations([]);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-8 h-8 text-amber-500" />
              <h1 className="text-2xl font-semibold text-gray-800">Finance Assistant</h1>
            </div>
            <div className="flex space-x-3">
              <button className="flex items-center space-x-2 px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600 transition-colors">
                <History className="w-4 h-4" />
                <span>View History</span>
              </button>
              <button 
                onClick={clearConversations}
                className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Clear Current</span>
              </button>
            </div>
          </div>
          <div className="flex justify-between items-center mt-2 text-sm text-gray-600">
            <span>Session ID: {sessionId}</span>
            <span>{conversations.length} conversations saved</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chat Interface */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border h-[80vh] flex flex-col">
              {/* Welcome Message */}
              {conversations.length === 0 && (
                <div className="p-6 flex-1 flex items-center justify-end">
                  <div className="bg-gray-50 rounded-lg p-4 max-w-md">
                    <div className="flex items-start space-x-3">
                      <DollarSign className="w-6 h-6 text-amber-500 mt-1" />
                      <p className="text-gray-700">
                        Welcome to your Personal Finance Assistant! How can I help you today?
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Conversation History */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {conversations.map((conv) => (
                  <div key={conv.id} className="space-y-3">
                    {/* User Message */}
                    <div className="flex justify-end">
                      <div className="bg-blue-500 text-white rounded-lg px-4 py-2 max-w-xs">
                        <p>{conv.message}</p>
                        <span className="text-xs opacity-75">{conv.timestamp}</span>
                      </div>
                    </div>
                    {/* Assistant Response */}
                    <div className="flex justify-start">
                      <div className="bg-gray-100 rounded-lg px-4 py-2 max-w-md">
                        <div className="flex items-start space-x-2">
                          <DollarSign className="w-4 h-4 text-amber-500 mt-1" />
                          <p className="text-gray-800">{conv.response}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="p-4 border-t">
                <div className="flex space-x-3 w-full">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center space-x-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                onClick={() => handleQuickAction('balance')}
                className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <Wallet className="w-4 h-4" />
                <span>Check Balance</span>
              </button>
              <button
                onClick={() => handleQuickAction('categories')}
                className="flex items-center space-x-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                <PieChart className="w-4 h-4" />
                <span>View Categories</span>
              </button>
              <button
                onClick={() => handleQuickAction('transactions')}
                className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                <CreditCard className="w-4 h-4" />
                <span>Recent Transactions</span>
              </button>
              <button
                onClick={() => handleQuickAction('expense')}
                className="flex items-center space-x-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                <Minus className="w-4 h-4" />
                <span>Add Expense</span>
              </button>
              <button
                onClick={() => handleQuickAction('income')}
                className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Income</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceAssistant;