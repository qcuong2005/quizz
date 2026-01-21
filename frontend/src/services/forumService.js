import axios from 'axios';

const API_URL = 'http://localhost:8080/api/forum';

const getAuthHeaders = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.token ? { Authorization: `Bearer ${user.token}` } : {};
};

// --- CATEGORIES ---
export const getCategories = async () => {
    const response = await axios.get(`${API_URL}/categories`, { headers: getAuthHeaders() });
    return response.data;
};

// --- POSTS ---
export const getPosts = async (params = {}) => {
    // params: { categoryId, search, page, size, sortBy }
    const response = await axios.get(`${API_URL}/posts`, {
        headers: getAuthHeaders(),
        params
    });
    return response.data;
};

export const getPostById = async (id) => {
    const response = await axios.get(`${API_URL}/posts/${id}`, { headers: getAuthHeaders() });
    return response.data;
};

export const createPost = async (postData) => {
    // postData: { title, content, imageUrl, categoryId }
    const response = await axios.post(`${API_URL}/posts`, postData, { headers: getAuthHeaders() });
    return response.data;
};

export const deletePost = async (id) => {
    const response = await axios.delete(`${API_URL}/posts/${id}`, { headers: getAuthHeaders() });
    return response.data;
};

// --- COMMENTS ---
export const getComments = async (postId) => {
    const response = await axios.get(`${API_URL}/posts/${postId}/comments`, { headers: getAuthHeaders() });
    return response.data;
};

export const addComment = async (postId, content, parentId = null) => {
    const payload = { content };
    if (parentId) payload.parentId = parentId;
    const response = await axios.post(`${API_URL}/posts/${postId}/comments`, payload, { headers: getAuthHeaders() });
    return response.data;
};

// --- LIKES ---
export const toggleLike = async (postId) => {
    const response = await axios.post(`${API_URL}/posts/${postId}/like`, {}, { headers: getAuthHeaders() });
    return response.data; // returns { liked: boolean }
};
