// API для аутентификации и управления пользователями
import { apiClient } from "./client";

// Получить информацию о текущем пользователе
export const getCurrentUser = async () => {
  try {
    return await apiClient.get("/auth/me");
  } catch (error) {
    console.error("Error fetching current user:", error);
    throw error;
  }
};

// Вход пользователя
export const login = async (username, password) => {
  try {
    return await apiClient.post("/auth/login", { username, password });
  } catch (error) {
    console.error("Error logging in:", error);
    throw error;
  }
};

// Регистрация пользователя
export const register = async (username, password, confirmPassword) => {
  try {
    return await apiClient.post("/auth/register", { 
      username, 
      password,
      confirmPassword 
    });
  } catch (error) {
    console.error("Error registering user:", error);
    throw error;
  }
};

// Выход пользователя
export const logout = async () => {
  try {
    return await apiClient.post("/auth/logout");
  } catch (error) {
    console.error("Error during logout:", error);
    throw error;
  }
}; 