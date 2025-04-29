import { createContext, useState, useEffect, useContext } from "react";

// Создаем контекст для темы
const ThemeContext = createContext();

// Провайдер для контекста темы
export const ThemeProvider = ({ children }) => {
  // Получаем сохраненную тему из localStorage или используем светлую тему по умолчанию
  const getInitialTheme = () => {
    const savedTheme = localStorage.getItem("theme");
    // Если тема уже сохранена, используем ее
    if (savedTheme) {
      return savedTheme;
    }
    // Если пользователь предпочитает темную тему в своей системе, используем ее
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }
    // По умолчанию используем светлую тему
    return "light";
  };

  const [theme, setTheme] = useState(getInitialTheme);

  // Функция для переключения темы
  const toggleTheme = () => {
    setTheme((prevTheme) => (prevTheme === "light" ? "dark" : "light"));
  };

  // При изменении темы обновляем атрибут data-theme у body и сохраняем в localStorage
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// Хук для использования контекста темы
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export default ThemeContext;
