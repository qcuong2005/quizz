const API_URL = "http://localhost:8080/auth";

export const login = async (username, password) => {
    const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
    });

    if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || "Login failed");
    }

    const data = await response.json();
    if (data.token) {
        localStorage.setItem("user", JSON.stringify(data));
    }
    return data;
};

export const register = async (username, password, fullName) => {
    const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password, fullName }),
    });

    if (!response.ok) {
        const errorData = await response.text();
        throw new Error(errorData || "Registration failed");
    }

    // The backend returns a plain string for success like "Đăng ký thành công!"
    return response.text();
};

export const logout = () => {
    localStorage.removeItem("user");
};

export const getCurrentUser = () => {
    try {
        const userStr = localStorage.getItem("user");
        if (!userStr) return null;

        const user = JSON.parse(userStr);

        // Validate token format (JWT should have 2 dots)
        if (user.token && typeof user.token === 'string') {
            const parts = user.token.split('.');
            if (parts.length !== 3) {
                // Invalid JWT format, clear storage
                console.error('Invalid JWT token format, clearing storage');
                localStorage.removeItem("user");
                return null;
            }
        }

        return user;
    } catch (error) {
        console.error('Error parsing user from localStorage:', error);
        localStorage.removeItem("user");
        return null;
    }
};
