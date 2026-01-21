import axios from 'axios';

const API_URL = 'http://localhost:8080/api/files';

const getAuthHeaders = () => {
    const user = JSON.parse(localStorage.getItem('user'));
    return user?.token ? { Authorization: `Bearer ${user.token}` } : {};
};

export const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
            ...getAuthHeaders(),
            'Content-Type': 'multipart/form-data'
        }
    });

    return response.data; // { fileName, fileUrl }
};
