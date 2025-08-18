'use client';

import React from 'react';
import { Search, ShoppingCart, User, X, MessageCircle } from 'lucide-react';
import ChatWidget from './components/ChatWidget';

export default function ShopAssistPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-gray-800">ShopAssist</h1>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex space-x-8">
              <a href="#" className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium">Home</a>
              <a href="#" className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium">Products</a>
              <a href="#" className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium">Categories</a>
              <a href="#" className="text-gray-700 hover:text-gray-900 px-3 py-2 text-sm font-medium">About</a>
            </nav>

            {/* Search Bar */}
            <div className="flex-1 max-w-lg mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search products..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* User & Cart Icons */}
            <div className="flex items-center space-x-4">
              <User className="h-6 w-6 text-gray-700 cursor-pointer hover:text-gray-900" />
              <div className="relative">
                <ShoppingCart className="h-6 w-6 text-gray-700 cursor-pointer hover:text-gray-900" />
                <div className="absolute -top-2 -right-2 bg-green-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  2
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-green-500 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="text-5xl font-bold text-white mb-4">
            Welcome to ShopAssist
          </h1>
          <p className="text-xl text-white mb-8 max-w-2xl mx-auto">
            Your personal AI shopping companion that understands your style and preferences
          </p>
          <button className="bg-gray-100 text-gray-800 px-8 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors">
            Start Shopping
          </button>
        </div>
        
        {/* Chat Icon in Right Sidebar */}
        <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
          <div className="bg-green-500 border-2 border-white rounded-full p-4 cursor-pointer hover:bg-green-600 transition-colors shadow-lg">
            <MessageCircle className="h-8 w-8 text-white" />
          </div>
        </div>
      </section>

      {/* Discover Your Style Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              Discover Your Style
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Browse through our carefully curated categories designed just for you
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {['Electronics', 'Clothing', 'Home & Garden', 'Sports & Outdoors', 'Books', 'Health & Beauty'].map((category) => (
              <button
                key={category}
                className="bg-white border border-gray-200 rounded-full py-3 px-6 text-gray-800 font-medium hover:border-gray-300 transition-colors"
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              Featured Products
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Discover our most popular items with AI-powered recommendations
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Product 1 */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="relative">
                <div className="h-48 bg-gray-200 flex items-center justify-center">
                  <div className="text-gray-400 text-4xl">📱</div>
                </div>
                <div className="absolute top-2 left-2">
                  <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">New</span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-800 mb-2">Wireless Bluetooth Headphones</h3>
                <div className="flex items-center mb-2">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <span key={i}>{i < 4 ? '★' : '☆'}</span>
                    ))}
                  </div>
                  <span className="text-gray-600 text-sm ml-2">(128)</span>
                </div>
                <div className="flex items-center mb-3">
                  <span className="font-bold text-gray-800 text-lg">$79.99</span>
                  <span className="text-gray-400 line-through ml-2">$99.99</span>
                </div>
                <p className="text-green-600 text-sm mb-3">In Stock</p>
                <button className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors">
                  Add to Cart
                </button>
              </div>
            </div>

            {/* Product 2 */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="relative">
                <div className="h-48 bg-gray-200 flex items-center justify-center">
                  <div className="text-gray-400 text-4xl">⌚</div>
                </div>
                <div className="absolute top-2 left-2">
                  <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full">New</span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-800 mb-2">Smart Watch Series 5</h3>
                <div className="flex items-center mb-2">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <span key={i}>{i < 5 ? '★' : '☆'}</span>
                    ))}
                  </div>
                  <span className="text-gray-600 text-sm ml-2">(89)</span>
                </div>
                <div className="flex items-center mb-3">
                  <span className="font-bold text-gray-800 text-lg">$299.99</span>
                </div>
                <p className="text-green-600 text-sm mb-3">In Stock</p>
                <button className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors">
                  Add to Cart
                </button>
              </div>
            </div>

            {/* Product 3 */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="relative">
                <div className="h-48 bg-gray-200 flex items-center justify-center">
                  <div className="text-gray-400 text-4xl">🔌</div>
                </div>
                <div className="absolute top-2 left-2">
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">Sale</span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-800 mb-2">USB-C Fast Charging Cable</h3>
                <div className="flex items-center mb-2">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <span key={i}>{i < 4 ? '★' : '☆'}</span>
                    ))}
                  </div>
                  <span className="text-gray-600 text-sm ml-2">(256)</span>
                </div>
                <div className="flex items-center mb-3">
                  <span className="font-bold text-gray-800 text-lg">$19.99</span>
                  <span className="text-gray-400 line-through ml-2">$29.99</span>
                </div>
                <p className="text-green-600 text-sm mb-3">In Stock</p>
                <button className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors">
                  Add to Cart
                </button>
              </div>
            </div>

            {/* Product 4 */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="relative">
                <div className="h-48 bg-gray-200 flex items-center justify-center">
                  <div className="text-gray-400 text-4xl">🔋</div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-800 mb-2">Portable Power Bank 20000mAh</h3>
                <div className="flex items-center mb-2">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <span key={i}>{i < 4 ? '★' : '☆'}</span>
                    ))}
                  </div>
                  <span className="text-gray-600 text-sm ml-2">(67)</span>
                </div>
                <div className="flex items-center mb-3">
                  <span className="font-bold text-gray-800 text-lg">$49.99</span>
                </div>
                <p className="text-red-600 text-sm mb-3">Out of Stock</p>
                <button className="w-full bg-green-300 text-white py-2 rounded-lg cursor-not-allowed">
                  Add to Cart
                </button>
              </div>
            </div>

            {/* Product 5 */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="relative">
                <div className="h-48 bg-gray-200 flex items-center justify-center">
                  <div className="text-gray-400 text-4xl">🖱️</div>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-800 mb-2">Wireless Mouse with RGB</h3>
                <div className="flex items-center mb-2">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <span key={i}>{i < 3 ? '★' : '☆'}</span>
                    ))}
                  </div>
                  <span className="text-gray-600 text-sm ml-2">(42)</span>
                </div>
                <div className="flex items-center mb-3">
                  <span className="font-bold text-gray-800 text-lg">$34.99</span>
                </div>
                <p className="text-green-600 text-sm mb-3">In Stock</p>
                <button className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors">
                  Add to Cart
                </button>
              </div>
            </div>

            {/* Product 6 */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="relative">
                <div className="h-48 bg-gray-200 flex items-center justify-center">
                  <div className="text-gray-400 text-4xl">⌨️</div>
                </div>
                <div className="absolute top-2 left-2">
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">Sale</span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-800 mb-2">Mechanical Gaming Keyboard</h3>
                <div className="flex items-center mb-2">
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <span key={i}>{i < 5 ? '★' : '☆'}</span>
                    ))}
                  </div>
                  <span className="text-gray-600 text-sm ml-2">(156)</span>
                </div>
                <div className="flex items-center mb-3">
                  <span className="font-bold text-gray-800 text-lg">$89.99</span>
                  <span className="text-gray-400 line-through ml-2">$119.99</span>
                </div>
                <p className="text-green-600 text-sm mb-3">In Stock</p>
                <button className="w-full bg-green-500 text-white py-2 rounded-lg hover:bg-green-600 transition-colors">
                  Add to Cart
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Our Customers Love Us Section */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-800 mb-4">
              Why Our Customers Love Us
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Experience personalized shopping like never before with our AI-powered features
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-green-500 rounded-lg p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <Search className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Smart Search</h3>
              <p className="text-gray-600">Find exactly what you're looking for with our intelligent search algorithm</p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-500 rounded-lg p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <div className="h-10 w-10 text-white">📄</div>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Order Tracking</h3>
              <p className="text-gray-600">Real-time updates on your orders from purchase to delivery</p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-500 rounded-lg p-6 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <div className="h-10 w-10 text-white">✨</div>
              </div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">AI Recommendations</h3>
              <p className="text-gray-600">Personalized product suggestions based on your preferences</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-green-500 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">ShopAssist</h2>
          <p className="text-lg mb-6">
            Your intelligent shopping companion, always here to help
          </p>
          <div className="flex justify-center space-x-8 mb-6">
            <a href="#" className="hover:text-gray-200 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-200 transition-colors">Terms</a>
            <a href="#" className="hover:text-gray-200 transition-colors">Support</a>
          </div>
          <p className="text-sm">
            © 2024 ShopAssist. Made with ❤️ for better shopping experiences.
          </p>
        </div>
      </footer>

      {/* Chat Widget */}
      <ChatWidget />
    </div>
  );
} 