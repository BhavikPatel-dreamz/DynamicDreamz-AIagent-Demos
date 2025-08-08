'use client';
import React, { useEffect, useRef, useState } from 'react'


const page = () => {
  const [messages, setMessages] = useState([
        { sender: 'assistant', text: '💰 Welcome to your Personal Finance Assistant! How can I help you today?' }
    ]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [dots, setDots] = useState(1);
    const [sessionId, setSessionId] = useState('');
    const [showHistory, setShowHistory] = useState(false);
    const [historyMessages, setHistoryMessages] = useState([]);

    const chatEndRef = useRef(null);
    const API = `${process.env.NEXT_PUBLIC_API_URL}/api/finance`;
    console.log('API URL:', API);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, loading]);

    // Animate typing dots
    useEffect(() => {
        if (!loading) return;
        const interval = setInterval(() => {
            setDots(d => (d % 3) + 1);
        }, 500);
        return () => clearInterval(interval);
    }, [loading]);


    useEffect(() => {
        //get from the local storage
        const storedSessionId = localStorage.getItem('finance_session_id');
        if (storedSessionId) {
            setSessionId(storedSessionId);
        } else {
            // Generate a new session ID if not found
            const newSessionId = `session_${Date.now()}`;
            localStorage.setItem('finance_session_id', newSessionId);
            setSessionId(newSessionId);
        }
    }, []); 


    const sendMessage = async (e) => {
        e?.preventDefault();
        if (!input.trim()) return;

        const userMessage = { sender: 'user', text: input };
        const newMessages = [...messages, userMessage];
        setMessages([...newMessages, { sender: 'assistant', text: 'Assistant is typing', typing: true }]);
        setInput('');
        setLoading(true);

        try {
            const res = await fetch(API, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: input,
                    sessionId: sessionId
                })
            });

            const data = await res.json();

            // Add assistant response to messages
            setMessages([...newMessages, { sender: 'assistant', text: data.response }]);

        } catch (err) {
            setMessages([...newMessages, { sender: 'assistant', text: '❌ Error connecting to backend.' }]);
        }

        setLoading(false);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const clearHistory = async () => {
        try {
            // Clear history on backend
            await fetch(`${API}/clear-history`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId: sessionId })
            });

            // Reset frontend messages
            setMessages([
                { sender: 'assistant', text: '💰 Welcome to your Personal Finance Assistant! How can I help you today?' }
            ]);

        } catch (err) {
            console.error('Error clearing history:', err);
            // Still clear frontend even if backend fails
            setMessages([
                { sender: 'assistant', text: '💰 Welcome to your Personal Finance Assistant! How can I help you today?' }
            ]);
        }
    };

    const getHistory = async () => {
        try {
            const res = await fetch(`${API}/get-history`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ sessionId })
            });

            const data = await res.json();
            if (data.history && data.history.length > 0) {
                setHistoryMessages(data.history);
                setShowHistory(true); // Show the history tab
            } else {
                setHistoryMessages([]);
                setShowHistory(true);
            }
        } catch (err) {
            console.error('Error getting history:', err);
        }
    };


    const quickAction = (message) => {
        setInput(message);
    };

    return (
        <div style={{
            maxWidth: '800px',
            margin: '0 auto',
            padding: '20px',
            fontFamily: 'Arial, sans-serif'
        }}>
            {/* Header with controls */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px',
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                border: '1px solid #e9ecef'
            }}>
                <h2 style={{ margin: 0, color: '#2c3e50' }}>
                    💰 Finance Assistant
                </h2>
                <div>
                    <button
                        onClick={getHistory}
                        style={{
                            padding: '8px 16px',
                            marginRight: '10px',
                            backgroundColor: '#17a2b8',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#138496'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#17a2b8'}
                    >
                        📋 View History
                    </button>
                    <button
                        onClick={clearHistory}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#dc3545',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '14px'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#c82333'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#dc3545'}
                    >
                        🗑️ Clear History
                    </button>
                </div>
            </div>

            {/* Session Info */}
            {!showHistory && (
                <>
                    <div style={{
                        fontSize: '12px',
                        color: '#6c757d',
                        marginBottom: '15px',
                        padding: '8px 12px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '4px'
                    }}>
                        Session ID: {sessionId}
                    </div>

                    {/* Chat Container */}
                    <div style={{
                        border: '1px solid #e9ecef',
                        borderRadius: '8px',
                        height: '500px',
                        display: 'flex',
                        flexDirection: 'column',
                        backgroundColor: 'white'
                    }}>
                        {/* Chat History */}
                        <div style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '20px',
                            backgroundColor: '#f8f9fa'
                        }}>
                            {messages.map((msg, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        marginBottom: '15px',
                                        display: 'flex',
                                        justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start'
                                    }}
                                >
                                    <div style={{
                                        maxWidth: '70%',
                                        padding: '12px 16px',
                                        borderRadius: '18px',
                                        backgroundColor: msg.sender === 'user' ? '#007bff' : '#ffffff',
                                        color: msg.sender === 'user' ? 'white' : '#333',
                                        border: msg.sender === 'assistant' ? '1px solid #e9ecef' : 'none',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                        whiteSpace: 'pre-wrap'
                                    }}>
                                        {msg.typing ? (
                                            <span style={{ fontStyle: 'italic', color: '#6c757d' }}>
                                                Assistant is typing{'.'.repeat(dots)}
                                            </span>
                                        ) : (
                                            msg.text
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input Area */}
                        <div style={{
                            padding: '20px',
                            borderTop: '1px solid #e9ecef',
                            backgroundColor: 'white'
                        }}>
                            <div style={{
                                display: 'flex',
                                gap: '10px'
                            }}>
                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Type your message..."
                                    disabled={loading}
                                    style={{
                                        flex: 1,
                                        padding: '12px 16px',
                                        border: '1px solid #e9ecef',
                                        borderRadius: '25px',
                                        fontSize: '14px',
                                        outline: 'none',
                                        backgroundColor: loading ? '#f8f9fa' : 'white'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#007bff'}
                                    onBlur={(e) => e.target.style.borderColor = '#e9ecef'}
                                />
                                <button
                                    onClick={sendMessage}
                                    disabled={loading || !input.trim()}
                                    style={{
                                        padding: '12px 24px',
                                        backgroundColor: loading || !input.trim() ? '#6c757d' : '#007bff',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '25px',
                                        cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                                        fontSize: '14px',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div style={{
                        marginTop: '20px',
                        display: 'flex',
                        gap: '10px',
                        flexWrap: 'wrap'
                    }}>
                        <button
                            onClick={() => quickAction("What's my balance?")}
                            style={{
                                padding: '8px 12px',
                                backgroundColor: '#28a745',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            💰 Check Balance
                        </button>
                        <button
                            onClick={() => quickAction("Show my expenses by category")}
                            style={{
                                padding: '8px 12px',
                                backgroundColor: '#ffc107',
                                color: '#212529',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            📊 View Categories
                        </button>
                        <button
                            onClick={() => quickAction("Show recent transactions")}
                            style={{
                                padding: '8px 12px',
                                backgroundColor: '#17a2b8',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            📋 Recent Transactions
                        </button>
                        <button
                            onClick={() => quickAction("I spent 500 on groceries")}
                            style={{
                                padding: '8px 12px',
                                backgroundColor: '#fd7e14',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            💸 Add Expense
                        </button>
                        <button
                            onClick={() => quickAction("I earned 50000 from salary")}
                            style={{
                                padding: '8px 12px',
                                backgroundColor: '#20c997',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            💰 Add Income
                        </button>
                    </div>
                </>
            )}

            {showHistory && (
                <div style={{
                    marginTop: '20px',
                    padding: '20px',
                    backgroundColor: '#fff3cd',
                    border: '1px solid #ffeeba',
                    borderRadius: '8px'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h4 style={{ margin: 0 }}>🕘 Conversation History</h4>
                        <button
                            onClick={() => setShowHistory(false)}
                            style={{
                                backgroundColor: '#ffc107',
                                border: 'none',
                                color: '#212529',
                                borderRadius: '4px',
                                padding: '4px 10px',
                                cursor: 'pointer',
                                fontSize: '12px'
                            }}
                        >
                            ✖ Close
                        </button>
                    </div>
                    <div style={{ marginTop: '10px', maxHeight: '300px', overflowY: 'auto' }}>
                        {historyMessages.length > 0 ? (
                            historyMessages.map((msg, idx) => (
                                <div key={idx} style={{ marginBottom: '10px' }}>
                                    <strong>{msg.role === 'user' ? '🧑‍💼 You' : '🤖 Assistant'}:</strong>
                                    <div style={{ whiteSpace: 'pre-wrap', marginLeft: '10px' }}>{msg.content}</div>
                                </div>
                            ))
                        ) : (
                            <div>No conversation history found.</div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
}

export default page