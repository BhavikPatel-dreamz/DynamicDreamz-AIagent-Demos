"use client"
import React from 'react'
import { Header } from './component/Header'
import { AlertCircle, Database, Zap, Sparkles, Info } from 'lucide-react';
import { PDFUpload } from './component/PDFUpload';
import { ChatWidget } from './component/ChatWidget';
import "./style/style.css"

const page = () => {
  return (
    <div className='min-h-screen bg-white'>
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Hero Section */}
        <section className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full text-sm font-medium mb-8 border border-green-200">
            <Zap className="h-4 w-4" />
            AI-Powered PDF Search Platform
          </div>

          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Search Your PDFs with{' '}
            <span className="bg-gradient-to-r from-red-500 via-red-600 to-orange-500 bg-clip-text text-transparent">
              AI Intelligence
            </span>
          </h1>

          <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-12 leading-relaxed">
            Upload PDF documents for multiple clients and let AI help you find exactly
            what you need instantly.
          </p>
        </section>

        {/* Search Bar Placeholder */}
         {/* <section className="mb-12">
          <div className="bg-white rounded-2xl border border-gray-200 p-4 max-w-4xl mx-auto shadow-sm">
            <div className="flex items-center gap-3 text-gray-400">
              <Info className="w-5 h-5" />
              <span className="text-base">Search functionality will be enabled once PDFs are uploaded and AI is connected...</span>
            </div>
          </div>
        </section>  */}

        {/* Features Grid */}
        <section className="grid md:grid-cols-3 gap-4 mb-12">
          <div className="group h-full">
            <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 text-center flex flex-col h-full">
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300">
                <Database className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Multi-Client Storage</h3>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-nowrap">
                Organize PDFs by client ID for efficient management
              </p>
              <div className="flex-grow" /> {/* pushes content evenly */}
            </div>
          </div>

          <div className="group h-full">
            <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 text-center flex flex-col h-full">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                AI-Powered Search
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                Connect your AI agent to enable intelligent document search
              </p>
              <div className="flex-grow" />
            </div>
          </div>

          <div className="group h-full">
            <div className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300 border border-gray-100 text-center flex flex-col h-full">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center mb-4 mx-auto group-hover:scale-110 transition-transform duration-300">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Real-time Chat</h3>
              <p className="text-gray-600 text-sm leading-relaxed whitespace-nowrap">
                Interactive chat assistant for instant PDF queries
              </p>
              <div className="flex-grow" />
            </div>
          </div>
        </section>

        {/* Upload Section */}
        <PDFUpload />
      </main>

      {/* Floating Chat Widget */}
      <ChatWidget />
    </div>
  )
}

export default page