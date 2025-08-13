"use client"
import React, { useState, useCallback, useEffect } from 'react';
import { Upload, FileText, X, CheckCircle, CloudUpload, Folder, Clock, AlertCircle, RefreshCw, Loader2 } from 'lucide-react';

export const PDFUpload = () => {
  const [userId, setUserId] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  const MAX_FILES = 3;

  // Generate random user ID
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

  // Update URL with userId parameter without page reload
  const updateUrlWithUserId = (newUserId) => {
    if (typeof window === 'undefined') return;
    
    const url = new URL(window.location);
    url.searchParams.set('userId', newUserId);
    window.history.replaceState({}, '', url);
  };

  const showToast = (title, description, variant = "default") => {
    console.log({ title, description, variant });
    // You can replace this with your actual toast implementation
  };

  // Fetch uploaded files list
  const fetchUploadedFiles = async (userIdToFetch = null) => {
    const targetUserId = userIdToFetch || userId;
    if (!targetUserId.trim()) return;

    setIsLoadingList(true);
    try {
      const response = await fetch('/api/pdf-base/list', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: targetUserId.trim()
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch files: ${response.status}`);
      }

      const result = await response.json();
      
      // Handle the actual API response structure
      let filesData = [];
      if (result.success && result.response && Array.isArray(result.response)) {
        filesData = result.response;
      } else if (Array.isArray(result.files)) {
        filesData = result.files;
      } else if (Array.isArray(result)) {
        filesData = result;
      }
      
      // Transform the response to match our component's expected format
      const transformedFiles = filesData.map(file => {
        const payload = file.payload || file;
        return {
          id: file.id || Math.random().toString(36).substr(2, 9),
          name: payload.filename || payload.name || 'Unknown file',
          size: payload.size || 0,
          userId: targetUserId.trim(),
          uploadedAt: payload.uploadedAt ? new Date(payload.uploadedAt) : new Date(payload.created_at || Date.now()),
          serverResponse: file,
        };
      });

      setUploadedFiles(transformedFiles);
      setLastRefresh(new Date());
      
      if (transformedFiles.length > 0) {
        showToast(
          "Files Loaded", 
          `Found ${transformedFiles.length} uploaded file${transformedFiles.length !== 1 ? 's' : ''}.`
        );
      }
    } catch (error) {
      console.error('Failed to fetch uploaded files:', error);
      showToast(
        "Failed to Load Files", 
        `Could not load uploaded files: ${error.message}`, 
        "destructive"
      );
    } finally {
      setIsLoadingList(false);
    }
  };

  // Load user ID with priority: Query params -> LocalStorage -> Generate new
  useEffect(() => {
    // Priority order: Query params -> LocalStorage -> Generate new
    let finalUserId = getUserIdFromQuery();

    console.log("finalUserId",finalUserId);
    
    
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
    
    // Update URL if userId came from localStorage or was generated
    if (!getUserIdFromQuery()) {
      updateUrlWithUserId(finalUserId);
    }
    
    // Set the userId in state
    setUserId(finalUserId);
    
    // Fetch files for the user ID
    fetchUploadedFiles(finalUserId);
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
        // Clear uploaded files and reload data for new user
        setUploadedFiles([]);
        fetchUploadedFiles(queryUserId);
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

  // Function to generate new user ID
  const generateNewUserId = () => {
    const newUserId = generateUserId();
    setUserId(newUserId);
    
    // Update both localStorage and URL
    if (typeof window !== 'undefined') {
      localStorage.setItem('pdf_upload_user_id', newUserId);
    }
    updateUrlWithUserId(newUserId);
    
    // Clear uploaded files when generating new user ID
    setUploadedFiles([]);
    showToast("New User ID Generated", "A new user ID has been generated and saved.", "success");
  };

  // Manual refresh function
  const handleRefresh = () => {
    if (userId.trim()) {
      fetchUploadedFiles();
    }
  };

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0] && userId) {
      handleFiles(Array.from(e.dataTransfer.files));
    } else if (!userId) {
      showToast("User ID Required", "Please enter a User ID before uploading files.", "destructive");
    }
  }, [userId]);

  const handleFiles = async (files) => {
    if (!userId.trim()) {
      showToast("User ID Required", "Please enter a User ID before uploading files.", "destructive");
      return;
    }

    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length === 0) {
      showToast("Invalid File Type", "Please upload PDF files only.", "destructive");
      return;
    }

    // Check if adding these files would exceed the maximum
    const totalFiles = uploadedFiles.length + pdfFiles.length;
    if (totalFiles > MAX_FILES) {
      showToast(
        "Too Many Files", 
        `You can only upload a maximum of ${MAX_FILES} files. Currently you have ${uploadedFiles.length} files uploaded.`, 
        "destructive"
      );
      return;
    }

    setIsUploading(true);

    // Upload each file to your API
    for (const file of pdfFiles) {
      try {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
        
        const formData = new FormData();
        formData.append('userId', userId.trim());
        formData.append('pdf', file);

        const response = await fetch('/api/pdf-base/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Upload failed: ${response.status} - ${errorData}`);
        }

        const result = await response.json();
        
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));

        showToast("Upload Successful", `${file.name} has been uploaded successfully.`);
        
        // Remove from progress tracking
        setTimeout(() => {
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[file.name];
            return newProgress;
          });
        }, 1000);

      } catch (error) {
        console.error('Upload error:', error);
        showToast(
          "Upload Failed", 
          `Failed to upload ${file.name}: ${error.message}`, 
          "destructive"
        );
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[file.name];
          return newProgress;
        });
      }
    }

    setIsUploading(false);
    
    // Refresh the file list after successful uploads
    setTimeout(() => {
      fetchUploadedFiles();
    }, 1000);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const removeFile = async (fileId) => {
    setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
    
    const response = await fetch('/api/pdf-base/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: fileId,
        userId: userId.trim(),
      }),
    });

    console.log("File removed from server response:", response);
    showToast("File Removed", "The file has been removed from the local list. Note: This doesn't delete the file from the server.");
  }  

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const canUploadMore = uploadedFiles.length < MAX_FILES;
  const remainingSlots = MAX_FILES - uploadedFiles.length;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* User ID Input */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Folder className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900">User Information</h2>
              <p className="text-gray-600">Your unique user ID (from URL params or auto-generated)</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleRefresh}
                disabled={isLoadingList || !userId.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-green-50 hover:bg-green-100 disabled:bg-gray-50 text-green-600 disabled:text-gray-400 rounded-xl transition-all duration-200 text-sm font-medium"
                title="Refresh file list"
              >
                {isLoadingList ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                Refresh
              </button>
              <button
                onClick={generateNewUserId}
                className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-xl transition-all duration-200 text-sm font-medium"
                title="Generate new user ID"
              >
                <RefreshCw className="w-4 h-4" />
                New ID
              </button>
            </div>
          </div>
          
          <div className="max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              User ID {getUserIdFromQuery() ? '(From URL)' : '(Auto-generated)'}
            </label>
            <div className="relative">
              <input
                type="text"
                value={userId}
                readOnly
                className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-gray-700 cursor-not-allowed"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <div className={`w-2 h-2 rounded-full ${userId ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {getUserIdFromQuery() 
                ? 'This ID is from URL parameters and synced across components'
                : 'This ID is auto-generated and saved in your browser for future sessions'
              }
              {lastRefresh && (
                <span className="block mt-1">
                  Last refreshed: {formatTimeAgo(lastRefresh)}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* File Limit Information */}
      
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          <div className="flex-1">
            <h3 className="text-sm font-medium text-amber-800">File Upload Limit</h3>
            <p className="text-sm text-amber-700 mt-1">
              Maximum {MAX_FILES} PDF files can be uploaded. 
              {uploadedFiles.length > 0 && (
                <span className="font-medium">
                  {" "}You have {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} uploaded, 
                  {remainingSlots} slot{remainingSlots !== 1 ? 's' : ''} remaining.
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="bg-white p-5 rounded-3xl shadow-xl border border-gray-200 overflow-hidden">
        <div 
          className={`p-12 border-2 border-dashed rounded-2xl transition-all duration-300 ${
            dragActive 
              ? 'border-red-400 bg-red-50' 
              : canUploadMore && userId.trim()
                ? 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100 cursor-pointer'
                : 'border-gray-300 bg-gray-100 opacity-50 cursor-not-allowed'
          }`}
          onDragEnter={canUploadMore ? handleDrag : undefined}
          onDragLeave={canUploadMore ? handleDrag : undefined}
          onDragOver={canUploadMore ? handleDrag : undefined}
          onDrop={canUploadMore ? handleDrop : undefined}
          onClick={() => canUploadMore && userId.trim() && document.getElementById('file-input')?.click()}
        >
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-all duration-300">
              {isUploading ? (
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-red-500 border-t-transparent"></div>
              ) : (
                <Upload className={`w-8 h-8 ${canUploadMore ? 'text-gray-400' : 'text-gray-300'}`} />
              )}
            </div>
            
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              {dragActive 
                ? 'Drop files here' 
                : isUploading 
                  ? 'Uploading files...' 
                  : !canUploadMore
                    ? `Maximum ${MAX_FILES} files reached`
                    : 'Drop your PDF files here'
              }
            </h3>
            
            <p className="text-gray-600 mb-6">
              {!userId.trim() 
                ? 'Please wait for User ID to load'
                : !canUploadMore
                  ? `You've reached the maximum limit of ${MAX_FILES} files`
                  : `Drag and drop your PDF files here, or click to select files (${remainingSlots} remaining)`
              }
            </p>
            
            <button 
              className={`px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg ${
                !canUploadMore || !userId.trim() || isUploading
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 hover:shadow-xl'
              }`}
              disabled={!canUploadMore || !userId.trim() || isUploading}
              onClick={(e) => {
                e.stopPropagation();
                if (canUploadMore && userId.trim() && !isUploading) {
                  document.getElementById('file-input')?.click();
                }
              }}
            >
              {isUploading ? 'Uploading...' : !canUploadMore ? 'Limit Reached' : 'Select PDF Files'}
            </button>
            
            <input
              id="file-input"
              type="file"
              multiple
              accept=".pdf"
              onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
              className="hidden"
            />
          </div>
        </div>

        {/* Upload Progress */}
        {Object.keys(uploadProgress).length > 0 && (
          <div className="mt-6 space-y-3">
            <h4 className="text-sm font-medium text-gray-700">Uploading...</h4>
            {Object.entries(uploadProgress).map(([fileName, progress]) => (
              <div key={fileName} className="bg-gray-50 p-4 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 truncate">{fileName}</span>
                  <span className="text-sm text-gray-500">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-red-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Loading State */}
      {isLoadingList && uploadedFiles.length === 0 && (
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8">
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
            <p className="text-gray-600">Loading your uploaded files...</p>
          </div>
        </div>
      )}

      {/* Uploaded Files List */}
      {uploadedFiles.length > 0 && (
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8">
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    Uploaded Files
                    {isLoadingList && (
                      <Loader2 className="w-5 h-5 animate-spin inline ml-2" />
                    )}
                  </h3>
                  <p className="text-gray-600">
                    {uploadedFiles.length} of {MAX_FILES} file{uploadedFiles.length !== 1 ? 's' : ''} uploaded
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                  {uploadedFiles.length}/{MAX_FILES} files
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={isLoadingList}
                  className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 disabled:opacity-50 rounded-lg transition-all duration-200"
                  title="Refresh list"
                >
                  {isLoadingList ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
            
            <div className="space-y-4">
              {uploadedFiles.map((file, index) => (
                <div
                  key={file.id}
                  className="group flex items-center justify-between p-6 bg-gray-50 rounded-2xl transition-all duration-200 hover:bg-gray-100 hover:shadow-md"
                  style={{
                    animationDelay: `${index * 100}ms`
                  }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-red-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 truncate">{file.name}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-sm text-gray-500">{formatFileSize(file.size)}</span>
                        <span className="text-sm text-gray-400">•</span>
                        <span className="text-sm text-blue-600 font-medium">User: {file.userId}</span>
                        <span className="text-sm text-gray-400">•</span>
                        <div className="flex items-center gap-1 text-sm text-gray-500">
                          <Clock className="w-3 h-3" />
                          <span>{formatTimeAgo(file.uploadedAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeFile(file.id)}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
                    title="Remove from list (doesn't delete from server)"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoadingList && uploadedFiles.length === 0 && userId && (
        <div className="bg-white rounded-3xl shadow-xl border border-gray-200 p-8">
          <div className="text-center py-8">
            <CloudUpload className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Files Uploaded Yet</h3>
            <p className="text-gray-600">Start by uploading your first PDF file above.</p>
          </div>
        </div>
      )}
    </div>
  );
};