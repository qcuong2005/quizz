import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { getCurrentUser } from '../services/authService';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
    const [activeChat, setActiveChat] = useState(null);
    const [isOpen, setIsOpen] = useState(false);
    const [stompClient, setStompClient] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [incomingMessage, setIncomingMessage] = useState(null);
    const [typingStatus, setTypingStatus] = useState(null);
    const clientRef = useRef(null);

    const [unreadCount, setUnreadCount] = useState(0);
    const activeChatRef = useRef(activeChat);
    const isOpenRef = useRef(isOpen);

    useEffect(() => {
        activeChatRef.current = activeChat;
        isOpenRef.current = isOpen;
    }, [activeChat, isOpen]);

    // Global WebSocket Connection
    const connect = useCallback(() => {
        const user = getCurrentUser();
        if (!user || clientRef.current) return;

        const socket = new SockJS('http://localhost:8080/ws-quiz');
        const client = new Client({
            webSocketFactory: () => socket,
            connectHeaders: {
                Authorization: `Bearer ${user.token}`
            },
            onConnect: () => {
                console.log("Global WS Connected");
                setIsConnected(true);

                // Subscribe to messages globally
                client.subscribe(`/user/queue/messages`, (message) => {
                    const receivedMsg = JSON.parse(message.body);
                    setIncomingMessage(receivedMsg);

                    // Logic to count unread messages: 
                    // If chat is NOT open, or open but with a different user, increment count
                    const isChatOpenWithSender = isOpenRef.current && activeChatRef.current?.id === receivedMsg.senderId;

                    if (!isChatOpenWithSender) {
                        setUnreadCount(prev => prev + 1);
                    }
                });

                // Subscribe to typing events globally
                client.subscribe(`/user/queue/typing`, (message) => {
                    const data = JSON.parse(message.body);
                    setTypingStatus(data);
                });
            },
            onDisconnect: () => {
                setIsConnected(false);
            },
            onStompError: (frame) => {
                console.error('Broker reported error: ' + frame.headers['message']);
            }
        });

        client.activate();
        clientRef.current = client;
        setStompClient(client);
    }, []);

    const disconnect = useCallback(() => {
        if (clientRef.current) {
            clientRef.current.deactivate();
            clientRef.current = null;
            setStompClient(null);
            setIsConnected(false);
        }
    }, []);

    useEffect(() => {
        connect();
        return () => disconnect();
    }, [connect, disconnect]);

    const openChat = useCallback((friend) => {
        setActiveChat(friend);
        setIsOpen(true);
        // Reset unread count logic (simple version: reset all on open)
        // Ideally we should track unread per user, but for this task "notification badge"
        // we just reset the global counter for simplicity or when opening the specific chat?
        // Let's assume the badge is "You have new messages". Opening ANY chat clears it? 
        // Or better: user sees the list, clicks a friend, clears global?
        // Let's reset global for now as user requested "hien so 1 nho" (show small 1), implying a global indicator.
        // But if they have messages from 2 people? 
        // Let's just reset 0 when any chat opens for now to satisfy "notification" requirement.
        // A better implementation would require a Map<userId, count>.
        setUnreadCount(0);
    }, []);

    const closeChat = useCallback(() => {
        setIsOpen(false);
        setActiveChat(null);
    }, []);

    return (
        <ChatContext.Provider value={{
            activeChat,
            isOpen,
            openChat,
            closeChat,
            stompClient,
            isConnected,
            incomingMessage,
            typingStatus,
            connect,
            disconnect,
            unreadCount,
            setUnreadCount
        }}>
            {children}
        </ChatContext.Provider>
    );
};
