// API для аутентификации и управления пользователями
import { apiClient } from "./client";

// Получить информацию о текущем пользователе
export const getCurrentUser = async () => {
  try {
    return await apiClient.get("auth/me");
  } catch (error) {
    throw error;
  }
};

// Вход пользователя
export const login = async (username, password) => {
  try {
    return await apiClient.post("auth/login", { username, password });
  } catch (error) {
    throw error;
  }
};

// Аутентификация через Google
export const loginWithGoogle = async (token) => {
  try {
    return await apiClient.post("auth/google", { token });
  } catch (error) {
    throw error;
  }
};

// Регистрация пользователя
export const register = async (username, password, confirmPassword) => {
  try {
    return await apiClient.post("auth/register", {
      username,
      password,
      confirmPassword,
    });
  } catch (error) {
    throw error;
  }
};

// Выход пользователя
export const logout = async () => {
  try {
    return await apiClient.post("auth/logout");
  } catch (error) {
    throw error;
  }
};
