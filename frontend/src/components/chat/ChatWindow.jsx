import React, { useState, useEffect, useRef } from 'react';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import { getChatHistory, uploadFile } from '../../services/chatService';
import { useLocation } from 'react-router-dom';
import { Paperclip, Image as ImageIcon, Smile, Mic, Send, X, File as FileIcon, Play, Pause, Minus } from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';
import './ChatWindow.css';

const ChatWindow = () => {
    const { activeChat, isOpen, closeChat, stompClient, isConnected, incomingMessage, typingStatus } = useChat();
    const { user: currentUser } = useAuth();
    const location = useLocation();
    const shouldHide = location.pathname === '/chat';

    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState("");
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState(null);
    const [isMinimized, setIsMinimized] = useState(false);
    const [isTyping, setIsTyping] = useState(false);

    const fileInputRef = useRef(null);
    const imageInputRef = useRef(null);
    const messagesEndRef = useRef(null);
    const typingTimeoutRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load chat history when opening chat
    useEffect(() => {
        if (isOpen && activeChat && currentUser) {
            getChatHistory(activeChat.id)
                .then(data => setMessages(data))
                .catch(err => console.error('Failed to load chat history:', err));
        }
    }, [isOpen, activeChat?.id]);

    // Handle incoming messages from context
    useEffect(() => {
        if (!incomingMessage || !activeChat || !currentUser) return;

        // Check if this message belongs to current chat
        if (incomingMessage.senderId === activeChat.id ||
            (incomingMessage.senderId === currentUser.id && incomingMessage.receiverId === activeChat.id)) {
            setMessages(prev => {
                // Avoid duplicates
                const exists = prev.some(m =>
                    m.id === incomingMessage.id ||
                    (m.timestamp === incomingMessage.timestamp && m.content === incomingMessage.content)
                );
                if (exists) return prev;
                return [...prev, incomingMessage];
            });
        }
    }, [incomingMessage, activeChat?.id, currentUser?.id]);

    // Handle typing status from context
    useEffect(() => {
        if (!typingStatus || !activeChat) return;

        if (typingStatus.senderId === activeChat.id) {
            setIsTyping(typingStatus.isTyping);
        }
    }, [typingStatus, activeChat?.id]);

    // Send typing indicator
    const sendTypingStatus = (typing) => {
        if (stompClient && isConnected && activeChat && currentUser) {
            stompClient.publish({
                destination: "/app/typing",
                body: JSON.stringify({
                    senderId: currentUser.id,
                    receiverId: activeChat.id,
                    isTyping: typing
                })
            });
        }
    };

    const handleInputChange = (e) => {
        setInputText(e.target.value);

        // Send typing indicator
        sendTypingStatus(true);

        // Clear previous timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        // Stop typing after 2 seconds of no input
        typingTimeoutRef.current = setTimeout(() => {
            sendTypingStatus(false);
        }, 2000);
    };

    const sendMessage = (content, type = 'TEXT', fileName = null) => {
        if (!content && !fileName) return;

        // Ensure we are connected
        if (!stompClient || !isConnected) {
            console.warn("Cannot send message: WebSocket not connected");
            return;
        }

        // Stop typing indicator when sending
        sendTypingStatus(false);
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        const chatMessage = {
            senderId: currentUser.id,
            receiverId: activeChat.id,
            content: content,
            status: 'SENT',
            type: type,
            fileName: fileName
        };

        try {
            stompClient.publish({
                destination: "/app/chat",
                body: JSON.stringify(chatMessage)
            });

            setMessages(prev => [...prev, { ...chatMessage, timestamp: new Date().toISOString() }]);
            if (type === 'TEXT') setInputText("");
            setShowEmojiPicker(false);
        } catch (error) {
            console.error("Failed to publish message:", error);
        }
    };

    const handleSendClick = () => {
        if (inputText.trim()) {
            sendMessage(inputText, 'TEXT');
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendClick();
        }
    };

    const handleFileSelect = async (e, type) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            const uploaded = await uploadFile(file);
            sendMessage(uploaded.fileUrl, type.toUpperCase(), uploaded.fileName);
        } catch (error) {
            console.error("Upload failed:", error);
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream);
            const chunks = [];

            recorder.ondataavailable = (e) => chunks.push(e.data);
            recorder.onstop = async () => {
                const blob = new Blob(chunks, { type: 'audio/webm' });
                const file = new File([blob], "voice_message.webm", { type: 'audio/webm' });
                try {
                    const uploaded = await uploadFile(file);
                    sendMessage(uploaded.fileUrl, 'AUDIO');
                } catch (error) {
                    console.error("Voice upload failed:", error);
                }
                stream.getTracks().forEach(track => track.stop());
            };

            recorder.start();
            setMediaRecorder(recorder);
            setIsRecording(true);
        } catch (err) {
            console.error("Recording failed:", err);
        }
    };

    const stopRecording = () => {
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
            setIsRecording(false);
        }
    };

    const handleEmojiClick = (emojiObject) => {
        setInputText(prev => prev + emojiObject.emoji);
    };

    const handlePaste = async (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;

        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const file = items[i].getAsFile();
                if (file) {
                    e.preventDefault();
                    try {
                        const uploaded = await uploadFile(file);
                        sendMessage(uploaded.fileUrl, 'IMAGE', uploaded.fileName);
                    } catch (error) {
                        console.error("Paste upload failed:", error);
                    }
                }
            }
        }
    };

    const getFullUrl = (url) => {
        if (!url) return "";
        if (url.startsWith("http")) return url;
        return `http://localhost:8080${url}`;
    };

    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    if (shouldHide || !isOpen || !activeChat) return null;

    return (
        <div className={`chat-window ${isMinimized ? 'minimized' : ''}`}>
            <div className="chat-header">
                <div className="chat-user-info">
                    <div className="chat-avatar">
                        {(activeChat.fullName || activeChat.username || "?").charAt(0).toUpperCase()}
                        <span className={`status-indicator ${activeChat.online ? 'online' : ''}`} />
                    </div>
                    <div className="chat-user-details">
                        <h3 className="chat-username">{activeChat.fullName || activeChat.username}</h3>
                        <span className="chat-status">
                            {activeChat.online ? 'Đang hoạt động' : 'Không hoạt động'}
                        </span>
                    </div>
                </div>
                <div className="chat-actions">
                    <button className="chat-action-btn" onClick={() => setIsMinimized(!isMinimized)}>
                        <Minus size={16} />
                    </button>
                    <button className="chat-action-btn" onClick={closeChat}>
                        <X size={16} />
                    </button>
                </div>
            </div>

            {!isMinimized && (
                <>
                    <div className="chat-messages">
                        {messages.map((msg, index) => {
                            const isMe = msg.senderId === currentUser?.id;
                            const showTime = !messages[index - 1] ||
                                new Date(msg.timestamp) - new Date(messages[index - 1].timestamp) > 300000;

                            return (
                                <div key={index} className={`message-wrapper ${isMe ? 'sent' : 'received'}`}>
                                    {!isMe && (
                                        <div className="message-avatar">
                                            {(activeChat.fullName || activeChat.username || "?").charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                    <div className="message-content">
                                        <div className={`message-bubble ${isMe ? 'sent' : 'received'}`}>
                                            <MessageContent msg={msg} getFullUrl={getFullUrl} />
                                        </div>
                                        {showTime && (
                                            <span className="message-timestamp">{formatTime(msg.timestamp)}</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {isTyping && (
                            <div className="typing-indicator">
                                <div className="typing-avatar">
                                    {(activeChat.fullName || activeChat.username || "?").charAt(0).toUpperCase()}
                                </div>
                                <div className="typing-bubble">
                                    <span className="typing-dot"></span>
                                    <span className="typing-dot"></span>
                                    <span className="typing-dot"></span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    <div className="chat-input-container">
                        {showEmojiPicker && (
                            <div className="emoji-picker-wrapper">
                                <EmojiPicker
                                    onEmojiClick={handleEmojiClick}
                                    width={300}
                                    height={350}
                                    theme="dark"
                                    searchPlaceHolder="Tìm emoji..."
                                />
                            </div>
                        )}

                        <div className="chat-input-wrapper">
                            <button className="toolbar-btn" onClick={() => imageInputRef.current?.click()}>
                                <ImageIcon size={18} />
                            </button>
                            <button className="toolbar-btn" onClick={() => fileInputRef.current?.click()}>
                                <Paperclip size={18} />
                            </button>
                            <button
                                className={`toolbar-btn ${showEmojiPicker ? 'active' : ''}`}
                                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            >
                                <Smile size={18} />
                            </button>
                            <button
                                className={`toolbar-btn ${isRecording ? 'recording' : ''}`}
                                onClick={isRecording ? stopRecording : startRecording}
                            >
                                {isRecording ? <div className="recording-pulse" /> : <Mic size={18} />}
                            </button>

                            <input
                                type="text"
                                className="chat-input"
                                placeholder="Nhập tin nhắn..."
                                value={inputText}
                                onChange={handleInputChange}
                                onKeyPress={handleKeyPress}
                                onPaste={handlePaste}
                            />

                            <button
                                className="send-btn"
                                onClick={handleSendClick}
                                disabled={!inputText.trim() || !isConnected}
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>

                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={(e) => handleFileSelect(e, 'FILE')}
                    />
                    <input
                        type="file"
                        ref={imageInputRef}
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFileSelect(e, 'IMAGE')}
                    />
                </>
            )}
        </div>
    );
};

const MessageContent = ({ msg, getFullUrl }) => {
    if (msg.type === 'IMAGE') {
        return (
            <img
                src={getFullUrl(msg.content)}
                alt="Sent"
                className="message-image"
                onClick={() => window.open(getFullUrl(msg.content), '_blank')}
            />
        );
    }

    if (msg.type === 'AUDIO') {
        return <AudioPlayer src={getFullUrl(msg.content)} />;
    }

    if (msg.type === 'FILE') {
        return (
            <a href={getFullUrl(msg.content)} target="_blank" rel="noopener noreferrer" className="message-file">
                <FileIcon size={16} />
                <span>{msg.fileName || 'Tải file'}</span>
            </a>
        );
    }

    return <span className="message-text">{msg.content}</span>;
};

const AudioPlayer = ({ src }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef(null);

    const togglePlay = () => {
        if (audioRef.current) {
            isPlaying ? audioRef.current.pause() : audioRef.current.play();
            setIsPlaying(!isPlaying);
        }
    };

    const formatTime = (time) => {
        if (!time || isNaN(time)) return "0:00";
        const min = Math.floor(time / 60);
        const sec = Math.floor(time % 60);
        return `${min}:${sec < 10 ? '0' : ''}${sec}`;
    };

    return (
        <div className="audio-player">
            <audio
                ref={audioRef}
                src={src}
                onTimeUpdate={() => {
                    if (audioRef.current) {
                        setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
                    }
                }}
                onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
                onEnded={() => { setIsPlaying(false); setProgress(0); }}
            />
            <button onClick={togglePlay} className="audio-play-btn">
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <div className="audio-progress">
                <div className="audio-progress-fill" style={{ width: `${progress}%` }} />
            </div>
            <span className="audio-duration">{formatTime(duration)}</span>
        </div>
    );
};

export default ChatWindow;
