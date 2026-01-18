import axios from 'axios';

const API_URL = 'http://localhost:8080/api/rooms';

// Helper to get and validate token
const getValidToken = () => {
  const userStr = localStorage.getItem('user');
  if (!userStr) {
    throw new Error('Bạn chưa đăng nhập!');
  }

  try {
    const user = JSON.parse(userStr);
    const token = user.token;

    if (!token) {
      throw new Error('Bạn chưa đăng nhập!');
    }

    // Validate JWT format (should have 2 dots)
    const parts = token.split('.');
    if (parts.length !== 3) {
      localStorage.removeItem('user');
      throw new Error('Token không hợp lệ. Vui lòng đăng nhập lại!');
    }

    return token;
  } catch (error) {
    localStorage.removeItem('user');
    throw new Error('Token không hợp lệ. Vui lòng đăng nhập lại!');
  }
};

const roomService = {
  // Tạo phòng mới
  createRoom: async (roomName, capacity) => {
    try {
      const token = getValidToken();
      const response = await axios.post(
        `${API_URL}/create`,
        null,
        {
          params: { roomName, capacity },
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message || 'Không thể tạo phòng';
    }
  },

  // Tham gia phòng
  joinRoom: async (roomId) => {
    try {
      const token = getValidToken();
      const response = await axios.post(
        `${API_URL}/join`,
        null,
        {
          params: { roomId },
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message || 'Không thể vào phòng';
    }
  },

  // Tham gia xem (Spectator) - Có thể không cần login
  joinRoomAsSpectator: async (roomId) => {
    try {
      // Try to get token if logged in, but don't fail if not
      let token = null;
      try {
        token = getValidToken();
      } catch (e) {
        // Not logged in, that's fine for spectator
        console.log("Joined as Guest");
      }

      const config = {
        params: { roomId }
      };

      if (token) {
        config.headers = { 'Authorization': `Bearer ${token}` };
      }

      const response = await axios.post(
        `${API_URL}/join-spectator`,
        null,
        config
      );
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message || 'Không thể vào xem phòng';
    }
  }
};

export default roomService;
