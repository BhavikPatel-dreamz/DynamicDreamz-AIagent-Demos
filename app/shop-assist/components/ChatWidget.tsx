'use client';

import React, { useState, useEffect } from 'react';
import { MessageCircle, X, Search, Package, RotateCcw, Send, ChevronLeft, ChevronRight, Star } from 'lucide-react';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
  products?: Product[];
}

interface Product {
  id: number;
  title: string;
  price: number;
  image: string;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  category: string;
  badge?: string;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm your shopping assistant. I can help you find products, check order status, or answer any questions about our store. How can I help you today?",
      isUser: false,
      timestamp: '10:37 PM',
      products: [
        {
          id: 1,
          title: 'Wireless Bluetooth Headphones',
          price: 79.99,
          image: '/headphones.jpg',
          rating: 4.5,
          reviewCount: 128,
          inStock: true,
          category: 'Electronics',
          badge: 'New'
        },
        {
          id: 2,
          title: 'Smart Watch Series 5',
          price: 299.99,
          image: '/smartwatch.jpg',
          rating: 4.8,
          reviewCount: 89,
          inStock: true,
          category: 'Electronics',
          badge: 'Popular'
        },
        {
          id: 3,
          title: 'USB-C Fast Charging Cable',
          price: 19.99,
          image: '/cable.jpg',
          rating: 4.3,
          reviewCount: 256,
          inStock: true,
          category: 'Electronics',
          badge: 'Sale'
        }
      ]
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [currentProductIndex, setCurrentProductIndex] = useState(0);

  const generateMockProducts = (intent: string, entities: any): Product[] => {
    // Generate relevant products based on intent and entities
    const baseProducts = [
      {
        id: 1,
        title: 'Wireless Bluetooth Headphones',
        price: 79.99,
        image: '/headphones.jpg',
        rating: 4.5,
        reviewCount: 128,
        inStock: true,
        category: 'Electronics',
        badge: 'New'
      },
      {
        id: 2,
        title: 'Smart Watch Series 5',
        price: 299.99,
        image: '/smartwatch.jpg',
        rating: 4.8,
        reviewCount: 89,
        inStock: true,
        category: 'Electronics',
        badge: 'Popular'
      },
      {
        id: 3,
        title: 'USB-C Fast Charging Cable',
        price: 19.99,
        image: '/cable.jpg',
        rating: 4.3,
        reviewCount: 256,
        inStock: true,
        category: 'Electronics',
        badge: 'Sale'
      },
      {
        id: 4,
        title: 'Portable Power Bank 20000mAh',
        price: 49.99,
        image: '/powerbank.jpg',
        rating: 4.6,
        reviewCount: 189,
        inStock: true,
        category: 'Electronics',
        badge: 'Best Seller'
      },
      {
        id: 5,
        title: 'Wireless Mouse with RGB',
        price: 34.99,
        image: '/mouse.jpg',
        rating: 4.2,
        reviewCount: 95,
        inStock: true,
        category: 'Electronics',
        badge: 'Trending'
      }
    ];

    // Filter products based on intent and entities
    if (intent === 'product_search' && entities?.categories?.length > 0) {
      const category = entities.categories[0].toLowerCase();
      return baseProducts.filter(p => p.category.toLowerCase().includes(category)).slice(0, 3);
    }

    if (intent === 'product_search' && entities?.products?.length > 0) {
      const productQuery = entities.products[0].toLowerCase();
      return baseProducts.filter(p => p.title.toLowerCase().includes(productQuery)).slice(0, 3);
    }

    // Return random products for other intents
    return baseProducts.sort(() => 0.5 - Math.random()).slice(0, 3);
  };

  const quickActions = [
    { icon: Search, text: 'Search', action: 'Search for products' },
    { icon: Package, text: 'Orders', action: 'Check order status' },
    { icon: RotateCcw, text: 'Returns', action: 'Return policy' }
  ];

  const suggestedActions = [
    'Search for products',
    'Check order status',
    'Return policy',
    'Store hours'
  ];

  const handleSendMessage = async () => {
    if (inputValue.trim()) {
      const newMessage: Message = {
        id: Date.now().toString(),
        text: inputValue,
        isUser: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prev => [...prev, newMessage]);
      setInputValue('');
      
      try {
        // Send message to Shopify AI agent
        const response = await fetch('/api/shopify/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: inputValue,
            userId: 'user_' + Date.now(), // Generate temporary user ID
            sessionId: 'session_' + Date.now()
          }),
        });

        const data = await response.json();
        
        if (data.success) {
          // Generate mock product recommendations based on the response
          const mockProducts = generateMockProducts(data.intent, data.entities);
          
          const aiResponse: Message = {
            id: (Date.now() + 1).toString(),
            text: data.response,
            isUser: false,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            products: mockProducts
          };
          setMessages(prev => [...prev, aiResponse]);
          
          // Reset product carousel index for new recommendations
          setCurrentProductIndex(0);
        } else {
          // Fallback response if API fails
          const aiResponse: Message = {
            id: (Date.now() + 1).toString(),
            text: "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment.",
            isUser: false,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
          setMessages(prev => [...prev, aiResponse]);
        }
      } catch (error) {
        console.error('Error sending message:', error);
        // Fallback response on error
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: "I'm experiencing technical difficulties. Please try again or contact our support team.",
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiResponse]);
      }
    }
  };

  const handleQuickAction = async (action: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text: action,
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    try {
      // Send action to Shopify AI agent
      const response = await fetch('/api/shopify/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: action,
          userId: 'user_' + Date.now(),
          sessionId: 'session_' + Date.now()
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Generate mock product recommendations based on the response
        const mockProducts = generateMockProducts(data.intent, data.entities);
        
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: data.response,
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          products: mockProducts
        };
        setMessages(prev => [...prev, aiResponse]);
        
        // Reset product carousel index for new recommendations
        setCurrentProductIndex(0);
      } else {
        // Fallback response if API fails
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: "I'd be happy to help you with that! Please let me know what specific information you need.",
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiResponse]);
      }
    } catch (error) {
      console.error('Error processing quick action:', error);
      // Fallback response on error
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'd be happy to help you with that! Please let me know what specific information you need.",
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiResponse]);
    }
  };

  const handleSuggestedAction = async (action: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text: action,
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setMessages(prev => [...prev, newMessage]);
    
    try {
      // Send action to Shopify AI agent
      const response = await fetch('/api/shopify/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: action,
          userId: 'user_' + Date.now(),
          sessionId: 'session_' + Date.now()
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        // Generate mock product recommendations based on the response
        const mockProducts = generateMockProducts(data.intent, data.entities);
        
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: data.response,
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          products: mockProducts
        };
        setMessages(prev => [...prev, aiResponse]);
        
        // Reset product carousel index for new recommendations
        setCurrentProductIndex(0);
      } else {
        // Fallback response if API fails
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: "I'd be happy to help you with that! Please let me know what specific information you need.",
          isUser: false,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiResponse]);
      }
    } catch (error) {
      console.error('Error processing suggested action:', error);
      // Fallback response on error
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'd be happy to help you with that! Please let me know what specific information you need.",
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiResponse]);
    }
  };

  const nextProduct = () => {
    setCurrentProductIndex((prev) => 
      prev === (messages[messages.length - 1]?.products?.length || 1) - 1 ? 0 : prev + 1
    );
  };

  const prevProduct = () => {
    setCurrentProductIndex((prev) => 
      prev === 0 ? (messages[messages.length - 1]?.products?.length || 1) - 1 : prev - 1
    );
  };

  const ProductCarousel = ({ products }: { products: Product[] }) => {
    if (!products || products.length === 0) return null;

    const currentProduct = products[currentProductIndex];

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 my-3 shadow-sm hover:shadow-md transition-shadow duration-300">
        <div className="relative">
          {/* Product Counter */}
          {products.length > 1 && (
            <div className="absolute top-0 right-0 bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-full">
              {currentProductIndex + 1} of {products.length}
            </div>
          )}
          {/* Product Image */}
          <div className="relative h-32 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg mb-3 flex items-center justify-center overflow-hidden">
            {currentProduct.badge && (
              <div className={`absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium text-white shadow-sm ${
                currentProduct.badge === 'New' ? 'bg-green-500' : 
                currentProduct.badge === 'Sale' ? 'bg-red-500' : 
                currentProduct.badge === 'Popular' ? 'bg-blue-500' :
                currentProduct.badge === 'Best Seller' ? 'bg-purple-500' :
                'bg-orange-500'
              }`}>
                {currentProduct.badge}
              </div>
            )}
            <div className="text-gray-400 text-4xl transform hover:scale-110 transition-transform duration-300">📱</div>
          </div>

          {/* Product Info */}
          <div className="text-center mb-3">
            <h4 className="font-semibold text-gray-800 text-sm mb-1">{currentProduct.title}</h4>
            <div className="flex items-center justify-center mb-2">
              <div className="flex text-yellow-400 text-xs">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className={`h-3 w-3 ${i < Math.floor(currentProduct.rating) ? 'fill-current' : ''}`} />
                ))}
              </div>
              <span className="text-gray-500 text-xs ml-1">({currentProduct.reviewCount})</span>
            </div>
            <p className="text-green-600 font-bold text-lg">${currentProduct.price}</p>
            <p className={`text-xs ${currentProduct.inStock ? 'text-green-600' : 'text-red-600'}`}>
              {currentProduct.inStock ? 'In Stock' : 'Out of Stock'}
            </p>
          </div>

          {/* Navigation Arrows */}
          {products.length > 1 && (
            <>
              <button
                onClick={prevProduct}
                className="absolute left-0 top-1/2 transform -translate-y-1/2 bg-white border border-gray-200 rounded-full p-2 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <ChevronLeft className="h-4 w-4 text-gray-600" />
              </button>
              <button
                onClick={nextProduct}
                className="absolute right-0 top-1/2 transform -translate-y-1/2 bg-white border border-gray-200 rounded-full p-2 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <ChevronRight className="h-4 w-4 text-gray-600" />
              </button>
            </>
          )}

          {/* Dots Indicator */}
          {products.length > 1 && (
            <div className="flex justify-center space-x-2 mt-4">
              {products.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentProductIndex(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-200 hover:scale-110 ${
                    index === currentProductIndex 
                      ? 'bg-green-500 shadow-sm' 
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2 mt-4">
            <button className="flex-1 bg-green-500 text-white py-2 px-3 rounded-lg text-sm hover:bg-green-600 transform hover:scale-105 transition-all duration-200 font-medium shadow-sm">
              View Details
            </button>
            <button className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg text-sm hover:bg-gray-200 transform hover:scale-105 transition-all duration-200 font-medium border border-gray-200 hover:border-gray-300">
              Add to Cart
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="bg-green-500 hover:bg-green-600 text-white rounded-full p-4 shadow-lg transition-all duration-300 hover:scale-110"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      </div>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[600px] bg-white rounded-lg shadow-2xl border border-gray-200 z-50 flex flex-col">
          {/* Header */}
          <div className="bg-green-500 text-white p-4 rounded-t-lg flex justify-between items-center">
            <div className="flex items-center space-x-3">
              <div className="bg-white rounded-full p-2">
                <MessageCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h3 className="font-bold">Shopping Assistant</h3>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-300 rounded-full"></div>
                  <span className="text-sm">Online</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Quick Action Buttons */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex space-x-2">
              {quickActions.map((action, index) => (
                <button
                  key={index}
                  onClick={() => handleQuickAction(action.action)}
                  className="flex-1 bg-white border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors flex flex-col items-center space-y-1"
                >
                  <action.icon className="h-5 w-5 text-gray-700" />
                  <span className="text-xs text-gray-700">{action.text}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    message.isUser
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                  <p className={`text-xs mt-1 ${
                    message.isUser ? 'text-green-100' : 'text-gray-500'
                  }`}>
                    {message.timestamp}
                  </p>
                </div>
              </div>
            ))}

            {/* Product Carousel for AI Messages */}
            {messages.map((message) => (
              !message.isUser && message.products && message.products.length > 0 && (
                <div key={`products-${message.id}`} className="flex justify-start">
                  <div className="max-w-xs">
                    <ProductCarousel products={message.products} />
                  </div>
                </div>
              )
            ))}

            {/* Suggested Actions */}
            {messages.length === 1 && (
              <div className="flex flex-wrap gap-2">
                {suggestedActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleSuggestedAction(action)}
                    className="bg-white border border-gray-200 rounded-full px-4 py-2 text-sm text-gray-700 hover:border-gray-300 transition-colors"
                  >
                    {action}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Type your message..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <button
                onClick={handleSendMessage}
                className="bg-green-500 text-white rounded-full p-2 hover:bg-green-600 transition-colors"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
            <p className="text-center text-xs text-gray-500 mt-2">
              Ask about products, orders, or store policies
            </p>
          </div>
        </div>
      )}
    </>
  );
} 