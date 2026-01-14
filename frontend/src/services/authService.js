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
    return JSON.parse(localStorage.getItem("user"));
};
