import axios from 'axios';
import { getCurrentUser } from './authService';

const API_URL = "http://localhost:8080/api/messages";

const getAuthHeaders = () => {
    const user = getCurrentUser();
    if (user && user.token) {
        return { Authorization: `Bearer ${user.token}` };
    }
    return {};
};

export const getChatHistory = async (friendId) => {
    try {
        const response = await axios.get(`${API_URL}/${friendId}`, {
            headers: getAuthHeaders()
        });
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(`${API_URL.replace('/messages', '/files')}/upload`, formData, {
        headers: {
            ...getAuthHeaders()
        }
    });
    return response.data;
};
