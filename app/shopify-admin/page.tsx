"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../src/components/ui/card';
import { Button } from '../../src/components/ui/button';
import { Input } from '../../src/components/ui/input';
import { Textarea } from '../../src/components/ui/textarea';
import { Label } from '../../src/components/ui/label';
import { Badge } from '../../src/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../src/components/ui/tabs';
import { Upload, FileText, DollarSign, Clock, Settings, Trash2, Edit } from 'lucide-react';

interface ProjectData {
  _id?: string;
  title: string;
  description: string;
  industry: string;
  projectType: string;
  timeline: string;
  budget: string;
  technologies: string[];
  features: string[];
  challenges: string;
  solutions: string;
  results: string;
  clientFeedback: string;
  createdAt?: string;
}

interface QuoteData {
  _id?: string;
  projectTitle: string;
  clientName: string;
  projectType: string;
  scope: string;
  timeline: string;
  budget: string;
  breakdown: string;
  terms: string;
  status: string;
  createdAt?: string;
}

export default function ShopifyAdminPanel() {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [quotes, setQuotes] = useState<QuoteData[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectData | null>(null);
  const [editingQuote, setEditingQuote] = useState<QuoteData | null>(null);
  
  // Document upload states
  const [documentType, setDocumentType] = useState<'project' | 'quote' | 'mixed'>('project');
  const [documentContent, setDocumentContent] = useState('');
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadedDocuments, setUploadedDocuments] = useState<string[]>([]);

  // Project form state
  const [projectForm, setProjectForm] = useState<ProjectData>({
    title: '',
    description: '',
    industry: '',
    projectType: '',
    timeline: '',
    budget: '',
    technologies: [],
    features: [],
    challenges: '',
    solutions: '',
    results: '',
    clientFeedback: ''
  });

  // Quote form state
  const [quoteForm, setQuoteForm] = useState<QuoteData>({
    projectTitle: '',
    clientName: '',
    projectType: '',
    scope: '',
    timeline: '',
    budget: '',
    breakdown: '',
    terms: '',
    status: 'Draft'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projectsRes, quotesRes] = await Promise.all([
        fetch('/api/shopify-admin/projects'),
        fetch('/api/shopify-admin/quotes')
      ]);
      
      if (projectsRes.ok) {
        const projectsData = await projectsRes.json();
        setProjects(projectsData.projects || []);
      }
      
      if (quotesRes.ok) {
        const quotesData = await quotesRes.json();
        setQuotes(quotesData.quotes || []);
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const method = editingProject ? 'PUT' : 'POST';
      const url = editingProject 
        ? `/api/shopify-admin/projects?id=${editingProject._id}` 
        : '/api/shopify-admin/projects';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(projectForm)
      });

      if (response.ok) {
        resetProjectForm();
        loadData();
      }
    } catch (error) {
      console.error('Error saving project:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const method = editingQuote ? 'PUT' : 'POST';
      const url = editingQuote 
        ? `/api/shopify-admin/quotes?id=${editingQuote._id}` 
        : '/api/shopify-admin/quotes';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quoteForm)
      });

      if (response.ok) {
        resetQuoteForm();
        loadData();
      }
    } catch (error) {
      console.error('Error saving quote:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    
    try {
      const response = await fetch(`/api/shopify-admin/projects?id=${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const deleteQuote = async (id: string) => {
    if (!confirm('Are you sure you want to delete this quote?')) return;
    
    try {
      const response = await fetch(`/api/shopify-admin/quotes?id=${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        loadData();
      }
    } catch (error) {
      console.error('Error deleting quote:', error);
    }
  };

  const resetProjectForm = () => {
    setProjectForm({
      title: '',
      description: '',
      industry: '',
      projectType: '',
      timeline: '',
      budget: '',
      technologies: [],
      features: [],
      challenges: '',
      solutions: '',
      results: '',
      clientFeedback: ''
    });
    setEditingProject(null);
  };

  const resetQuoteForm = () => {
    setQuoteForm({
      projectTitle: '',
      clientName: '',
      projectType: '',
      scope: '',
      timeline: '',
      budget: '',
      breakdown: '',
      terms: '',
      status: 'Draft'
    });
    setEditingQuote(null);
  };

  const editProject = (project: ProjectData) => {
    setProjectForm(project);
    setEditingProject(project);
  };

  const editQuote = (quote: QuoteData) => {
    setQuoteForm(quote);
    setEditingQuote(quote);
  };

  const handleArrayInput = (value: string, setter: (arr: string[]) => void) => {
    const items = value.split(',').map(item => item.trim()).filter(item => item);
    setter(items);
  };

  // Document upload handlers
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setDocumentContent(content);
      setUploadedDocuments(prev => [...prev, file.name]);
    };
    reader.readAsText(file);
  };

  const processDocument = async () => {
    if (!documentContent.trim()) return;

    setUploadStatus('uploading');
    try {
      const response = await fetch('/api/shopify-admin/process-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: documentContent,
          type: documentType,
          filename: uploadedDocuments[uploadedDocuments.length - 1] || 'document.txt'
        })
      });

      if (response.ok) {
        const result = await response.json();
        setUploadStatus('success');
        setDocumentContent('');
        loadData(); // Reload the data to show new items
        
        // Show success message
        setTimeout(() => setUploadStatus('idle'), 3000);
      } else {
        setUploadStatus('error');
        setTimeout(() => setUploadStatus('idle'), 3000);
      }
    } catch (error) {
      console.error('Document processing error:', error);
      setUploadStatus('error');
      setTimeout(() => setUploadStatus('idle'), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Settings className="h-8 w-8" />
            Shopify Project & Quote Manager
          </h1>
          <p className="text-gray-400">
            Upload and manage your previous Shopify projects and quotes to help the AI agent provide better consultation
          </p>
        </div>

        <Tabs defaultValue="projects" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-900">
            <TabsTrigger value="projects" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Projects ({projects.length})
            </TabsTrigger>
            <TabsTrigger value="quotes" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Quotes ({quotes.length})
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload Documents
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="space-y-6">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  {editingProject ? 'Edit Project' : 'Add New Project'}
                </CardTitle>
                <CardDescription>
                  Add details about your previous Shopify projects to help the agent provide better recommendations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProjectSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="project-title">Project Title</Label>
                      <Input
                        id="project-title"
                        value={projectForm.title}
                        onChange={(e) => setProjectForm({...projectForm, title: e.target.value})}
                        className="bg-gray-800 border-gray-700"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="project-industry">Industry</Label>
                      <Input
                        id="project-industry"
                        value={projectForm.industry}
                        onChange={(e) => setProjectForm({...projectForm, industry: e.target.value})}
                        className="bg-gray-800 border-gray-700"
                        placeholder="e.g., Fashion, Electronics, B2B"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="project-type">Project Type</Label>
                      <Input
                        id="project-type"
                        value={projectForm.projectType}
                        onChange={(e) => setProjectForm({...projectForm, projectType: e.target.value})}
                        className="bg-gray-800 border-gray-700"
                        placeholder="e.g., Custom Theme, App Development"
                      />
                    </div>
                    <div>
                      <Label htmlFor="project-timeline">Timeline</Label>
                      <Input
                        id="project-timeline"
                        value={projectForm.timeline}
                        onChange={(e) => setProjectForm({...projectForm, timeline: e.target.value})}
                        className="bg-gray-800 border-gray-700"
                        placeholder="e.g., 8 weeks"
                      />
                    </div>
                    <div>
                      <Label htmlFor="project-budget">Budget</Label>
                      <Input
                        id="project-budget"
                        value={projectForm.budget}
                        onChange={(e) => setProjectForm({...projectForm, budget: e.target.value})}
                        className="bg-gray-800 border-gray-700"
                        placeholder="e.g., $15,000"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="project-description">Project Description</Label>
                    <Textarea
                      id="project-description"
                      value={projectForm.description}
                      onChange={(e) => setProjectForm({...projectForm, description: e.target.value})}
                      className="bg-gray-800 border-gray-700"
                      rows={3}
                      placeholder="Describe the project scope, requirements, and objectives"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="project-technologies">Technologies (comma-separated)</Label>
                      <Input
                        id="project-technologies"
                        value={projectForm.technologies.join(', ')}
                        onChange={(e) => handleArrayInput(e.target.value, (arr) => setProjectForm({...projectForm, technologies: arr}))}
                        className="bg-gray-800 border-gray-700"
                        placeholder="Liquid, JavaScript, React, Node.js"
                      />
                    </div>
                    <div>
                      <Label htmlFor="project-features">Key Features (comma-separated)</Label>
                      <Input
                        id="project-features"
                        value={projectForm.features.join(', ')}
                        onChange={(e) => handleArrayInput(e.target.value, (arr) => setProjectForm({...projectForm, features: arr}))}
                        className="bg-gray-800 border-gray-700"
                        placeholder="Custom checkout, Inventory sync, Multi-language"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="project-challenges">Challenges & Solutions</Label>
                    <Textarea
                      id="project-challenges"
                      value={projectForm.challenges}
                      onChange={(e) => setProjectForm({...projectForm, challenges: e.target.value})}
                      className="bg-gray-800 border-gray-700"
                      rows={2}
                      placeholder="What challenges did you face and how did you solve them?"
                    />
                  </div>

                  <div>
                    <Label htmlFor="project-results">Results & Outcomes</Label>
                    <Textarea
                      id="project-results"
                      value={projectForm.results}
                      onChange={(e) => setProjectForm({...projectForm, results: e.target.value})}
                      className="bg-gray-800 border-gray-700"
                      rows={2}
                      placeholder="What were the measurable results? (e.g., increased conversion, reduced load time)"
                    />
                  </div>

                  <div>
                    <Label htmlFor="project-feedback">Client Feedback</Label>
                    <Textarea
                      id="project-feedback"
                      value={projectForm.clientFeedback}
                      onChange={(e) => setProjectForm({...projectForm, clientFeedback: e.target.value})}
                      className="bg-gray-800 border-gray-700"
                      rows={2}
                      placeholder="What did the client say about the project?"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Saving...' : editingProject ? 'Update Project' : 'Add Project'}
                    </Button>
                    {editingProject && (
                      <Button type="button" variant="outline" onClick={resetProjectForm}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Projects List */}
            <div className="space-y-4">
              {projects.map((project) => (
                <Card key={project._id} className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{project.title}</CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-1">
                          <span>{project.industry}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {project.timeline}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {project.budget}
                          </span>
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => editProject(project)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => deleteProject(project._id!)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-300 mb-3">{project.description}</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {project.technologies.map((tech, index) => (
                        <Badge key={index} variant="secondary">{tech}</Badge>
                      ))}
                    </div>
                    {project.features.length > 0 && (
                      <div className="mb-2">
                        <strong className="text-xs text-gray-400">Features:</strong>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {project.features.map((feature, index) => (
                            <Badge key={index} variant="outline" className="text-xs">{feature}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="quotes" className="space-y-6">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  {editingQuote ? 'Edit Quote' : 'Add New Quote'}
                </CardTitle>
                <CardDescription>
                  Add your previous quotes to help the agent reference pricing and scope patterns
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleQuoteSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="quote-title">Project Title</Label>
                      <Input
                        id="quote-title"
                        value={quoteForm.projectTitle}
                        onChange={(e) => setQuoteForm({...quoteForm, projectTitle: e.target.value})}
                        className="bg-gray-800 border-gray-700"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="quote-client">Client Name</Label>
                      <Input
                        id="quote-client"
                        value={quoteForm.clientName}
                        onChange={(e) => setQuoteForm({...quoteForm, clientName: e.target.value})}
                        className="bg-gray-800 border-gray-700"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="quote-type">Project Type</Label>
                      <Input
                        id="quote-type"
                        value={quoteForm.projectType}
                        onChange={(e) => setQuoteForm({...quoteForm, projectType: e.target.value})}
                        className="bg-gray-800 border-gray-700"
                      />
                    </div>
                    <div>
                      <Label htmlFor="quote-timeline">Timeline</Label>
                      <Input
                        id="quote-timeline"
                        value={quoteForm.timeline}
                        onChange={(e) => setQuoteForm({...quoteForm, timeline: e.target.value})}
                        className="bg-gray-800 border-gray-700"
                      />
                    </div>
                    <div>
                      <Label htmlFor="quote-budget">Total Budget</Label>
                      <Input
                        id="quote-budget"
                        value={quoteForm.budget}
                        onChange={(e) => setQuoteForm({...quoteForm, budget: e.target.value})}
                        className="bg-gray-800 border-gray-700"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="quote-scope">Project Scope</Label>
                    <Textarea
                      id="quote-scope"
                      value={quoteForm.scope}
                      onChange={(e) => setQuoteForm({...quoteForm, scope: e.target.value})}
                      className="bg-gray-800 border-gray-700"
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="quote-breakdown">Pricing Breakdown</Label>
                    <Textarea
                      id="quote-breakdown"
                      value={quoteForm.breakdown}
                      onChange={(e) => setQuoteForm({...quoteForm, breakdown: e.target.value})}
                      className="bg-gray-800 border-gray-700"
                      rows={4}
                      placeholder="Development: $X, Design: $Y, Testing: $Z, etc."
                    />
                  </div>

                  <div>
                    <Label htmlFor="quote-terms">Terms & Conditions</Label>
                    <Textarea
                      id="quote-terms"
                      value={quoteForm.terms}
                      onChange={(e) => setQuoteForm({...quoteForm, terms: e.target.value})}
                      className="bg-gray-800 border-gray-700"
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={loading}>
                      {loading ? 'Saving...' : editingQuote ? 'Update Quote' : 'Add Quote'}
                    </Button>
                    {editingQuote && (
                      <Button type="button" variant="outline" onClick={resetQuoteForm}>
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Quotes List */}
            <div className="space-y-4">
              {quotes.map((quote) => (
                <Card key={quote._id} className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{quote.projectTitle}</CardTitle>
                        <CardDescription className="flex items-center gap-4 mt-1">
                          <span>{quote.clientName}</span>
                          <span>{quote.timeline}</span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {quote.budget}
                          </span>
                          <Badge variant={quote.status === 'Accepted' ? 'default' : 'secondary'}>
                            {quote.status}
                          </Badge>
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => editQuote(quote)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => deleteQuote(quote._id!)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-300 mb-2">{quote.scope}</p>
                    {quote.breakdown && (
                      <div className="mt-2">
                        <strong className="text-xs text-gray-400">Breakdown:</strong>
                        <pre className="text-xs text-gray-300 mt-1 whitespace-pre-wrap">{quote.breakdown}</pre>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="documents" className="space-y-6">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload Project & Quote Documents
                </CardTitle>
                <CardDescription>
                  Upload text files or documents containing your previous project details and quotes. 
                  The AI will automatically parse and extract information to enhance future consultations.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Document Type Selection */}
                  <div>
                    <Label htmlFor="document-type">Document Type</Label>
                    <select
                      id="document-type"
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value as 'project' | 'quote' | 'mixed')}
                      className="w-full p-2 bg-gray-800 border border-gray-700 rounded-md text-white"
                    >
                      <option value="project">Project Documentation</option>
                      <option value="quote">Quote/Proposal Documentation</option>
                      <option value="mixed">Mixed Content (Projects & Quotes)</option>
                    </select>
                  </div>

                  {/* File Upload */}
                  <div>
                    <Label htmlFor="file-upload">Upload Document</Label>
                    <div className="mt-1 flex items-center space-x-4">
                      <input
                        id="file-upload"
                        type="file"
                        accept=".txt,.doc,.docx,.md"
                        onChange={handleFileUpload}
                        className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-600 file:text-white hover:file:bg-blue-700"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">
                      Supported formats: .txt, .doc, .docx, .md
                    </p>
                  </div>

                  {/* Text Input Area */}
                  <div>
                    <Label htmlFor="document-content">Or Paste Content Directly</Label>
                    <Textarea
                      id="document-content"
                      value={documentContent}
                      onChange={(e) => setDocumentContent(e.target.value)}
                      className="bg-gray-800 border-gray-700 h-64"
                      placeholder={documentType === 'project' 
                        ? `Paste your project documentation here. For example:
                        
Project: E-commerce Store Redesign
Client: Fashion Boutique XYZ
Timeline: 8 weeks
Budget: $25,000
Technologies: Shopify Plus, Liquid, JavaScript, CSS
Features: Custom theme, mobile optimization, payment integration
Results: 40% increase in conversion rate...`
                        : `Paste your quote/proposal documentation here. For example:
                        
Quote for: Custom Shopify Development
Client: ABC Company
Project Type: E-commerce Platform
Scope: Custom theme development, third-party integrations
Timeline: 10-12 weeks
Budget: $30,000
Breakdown: Design: $8K, Development: $15K, Testing: $4K, Integration: $3K
Terms: 50% upfront, 50% on completion...`}
                    />
                  </div>

                  {/* Upload Status */}
                  {uploadStatus !== 'idle' && (
                    <div className={`p-3 rounded-md ${
                      uploadStatus === 'uploading' ? 'bg-blue-900 text-blue-200' :
                      uploadStatus === 'success' ? 'bg-green-900 text-green-200' :
                      'bg-red-900 text-red-200'
                    }`}>
                      {uploadStatus === 'uploading' && '🔄 Processing document and extracting data...'}
                      {uploadStatus === 'success' && '✅ Document processed successfully! Data has been added to your database.'}
                      {uploadStatus === 'error' && '❌ Error processing document. Please check the format and try again.'}
                    </div>
                  )}

                  {/* Uploaded Files List */}
                  {uploadedDocuments.length > 0 && (
                    <div>
                      <Label>Uploaded Documents</Label>
                      <div className="mt-2 space-y-2">
                        {uploadedDocuments.map((filename, index) => (
                          <div key={index} className="flex items-center gap-2 p-2 bg-gray-800 rounded-md">
                            <FileText className="h-4 w-4 text-blue-400" />
                            <span className="text-sm">{filename}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-4">
                    <Button 
                      onClick={processDocument} 
                      disabled={!documentContent.trim() || uploadStatus === 'uploading'}
                      className="flex items-center gap-2"
                    >
                      {uploadStatus === 'uploading' ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          Process & Store Document
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setDocumentContent('');
                        setUploadedDocuments([]);
                        setUploadStatus('idle');
                      }}
                    >
                      Clear
                    </Button>
                  </div>

                  {/* Instructions */}
                  <div className="bg-gray-800 p-4 rounded-md border border-gray-700">
                    <h4 className="font-medium mb-2">📋 Document Processing Instructions:</h4>
                    <ul className="text-sm text-gray-300 space-y-1">
                      <li>• Include project titles, client names, budgets, and timelines</li>
                      <li>• Add technical details like technologies used and features implemented</li>
                      <li>• Include results and client feedback when available</li>
                      <li>• For quotes: include pricing breakdowns and scope details</li>
                      <li>• The AI will automatically extract and structure this information</li>
                      <li>• Processed data will be stored in MongoDB and Qdrant for better consultation</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </div>
    </div>
  );
}
