import React, { useState, useEffect } from 'react';
import { Plus, MessageSquare, Trash2, Edit3, MoreVertical } from 'lucide-react';

interface ChatSession {
  sessionId: string;
  title: string;
  lastActivity: string;
  messageCount: number;
  createdAt: string;
}

interface SessionManagerProps {
  currentSessionId?: string;
  onSessionChange: (sessionId: string) => void;
  onNewSession: () => void;
}

export const SessionManager: React.FC<SessionManagerProps> = ({
  currentSessionId,
  onSessionChange,
  onNewSession
}) => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingSession, setEditingSession] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/shopify-bdm/sessions?action=list');
      const data = await response.json();
      
      if (data.success) {
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Failed to load sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const createNewSession = async () => {
    try {
      const response = await fetch('/api/shopify-bdm/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create' })
      });
      
      const data = await response.json();
      if (data.success) {
        await loadSessions();
        onNewSession();
        onSessionChange(data.sessionId);
      }
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this chat session?')) return;
    
    try {
      const response = await fetch('/api/shopify-bdm/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', sessionId })
      });
      
      const data = await response.json();
      if (data.success) {
        await loadSessions();
        // If deleted session was current, switch to first available
        const remainingSessions = sessions.filter(s => s.sessionId !== sessionId);
        if (currentSessionId === sessionId && remainingSessions.length > 0) {
          onSessionChange(remainingSessions[0].sessionId);
        }
      }
    } catch (error) {
      console.error('Failed to delete session:', error);
    }
  };

  const updateSessionTitle = async (sessionId: string, newTitle: string) => {
    try {
      const response = await fetch('/api/shopify-bdm/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_title', sessionId, title: newTitle })
      });
      
      const data = await response.json();
      if (data.success) {
        await loadSessions();
        setEditingSession(null);
      }
    } catch (error) {
      console.error('Failed to update session title:', error);
    }
  };

  const startEditing = (sessionId: string, currentTitle: string) => {
    setEditingSession(sessionId);
    setEditTitle(currentTitle);
  };

  const finishEditing = () => {
    if (editingSession && editTitle.trim()) {
      updateSessionTitle(editingSession, editTitle.trim());
    } else {
      setEditingSession(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 24 * 60 * 60 * 1000) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <div className="w-80 bg-gray-900 border-r border-gray-800 p-4">
        <div className="animate-pulse">
          <div className="h-10 bg-gray-800 rounded mb-4"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-800 rounded mb-2"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <button
          onClick={createNewSession}
          className="w-full flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto p-2">
        {sessions.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No chat sessions yet.</p>
            <p className="text-sm">Create your first chat!</p>
          </div>
        ) : (
          sessions.map((session) => (
            <div
              key={session.sessionId}
              className={`group relative mb-2 p-3 rounded-lg cursor-pointer transition-colors ${
                currentSessionId === session.sessionId
                  ? 'bg-blue-600/20 border border-blue-500/50'
                  : 'bg-gray-800 hover:bg-gray-700'
              }`}
              onClick={() => onSessionChange(session.sessionId)}
            >
              {/* Session Content */}
              <div className="flex-1 min-w-0">
                {editingSession === session.sessionId ? (
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={finishEditing}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') finishEditing();
                      if (e.key === 'Escape') setEditingSession(null);
                    }}
                    className="w-full bg-gray-700 text-white px-2 py-1 rounded border border-gray-600 text-sm"
                    autoFocus
                  />
                ) : (
                  <h4 className="font-medium text-white text-sm truncate">
                    {session.title}
                  </h4>
                )}
                
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-400">
                    {session.messageCount} messages
                  </span>
                  <span className="text-xs text-gray-400">
                    {formatDate(session.lastActivity)}
                  </span>
                </div>
              </div>

              {/* Session Actions */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEditing(session.sessionId, session.title);
                    }}
                    className="p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-white"
                    title="Rename session"
                  >
                    <Edit3 className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSession(session.sessionId);
                    }}
                    className="p-1 hover:bg-red-600 rounded text-gray-400 hover:text-white"
                    title="Delete session"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800 text-xs text-gray-400">
        <p>{sessions.length} chat session{sessions.length !== 1 ? 's' : ''}</p>
      </div>
    </div>
  );
};
