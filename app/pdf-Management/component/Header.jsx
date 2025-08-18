import React from 'react';
import { Search, Database, Sparkles, Menu } from 'lucide-react';

export const Header = () => {
  return (
    <header className="w-full bg-white/20 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo and Brand */}
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center shadow-lg">
              <Search className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">PDF Search AI</h1>
              <p className="text-sm text-gray-500">Intelligent document search platform</p>
            </div>
          </div>
          
          {/* Status Indicators */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-full border border-blue-200">
              <Database className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Multi-client PDF management</span>
            </div>
            
            <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-full border border-green-200">
              <Sparkles className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-700">Ready for AI integration</span>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
            <Menu className="w-5 h-5" />
          </button>
        </div>

        {/* Mobile Status Indicators */}
        <div className="md:hidden mt-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-full border border-blue-200 w-fit">
            <Database className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Multi-client PDF management</span>
          </div>
          
          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-full border border-green-200 w-fit">
            <Sparkles className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-700">Ready for AI integration</span>
          </div>
        </div>
      </div>
    </header>
  );
};