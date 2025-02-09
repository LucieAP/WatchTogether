import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import CreateRoom from "./components/CreateRoom/CreateRoom";
import Header from "./components/Header/Header";
import Footer from "./components/Footer/Footer";
import NotFoundPage from "./components/NotFoundPage/NotFoundPage";
import HomePage from "./components/HomePage/HomePage";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

export default function App() {
  return (
    <Router>
      <div className="layout-container">
        <Header />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route
              path="/api/Rooms/Create"
              element={
                <section>
                  <CreateRoom />
                </section>
              }
            />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}
