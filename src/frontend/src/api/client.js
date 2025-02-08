const API_BASE = "/api";

export const apiClient = {
  get: async (url) => {
    const response = await fetch(`${API_BASE}${url}`);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.title || "Ошибка сервера");
    }

    return response.json();
  },
  // post: async (url, data) => {
  //   /* ... */
  // },
};
