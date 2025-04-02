import { useState, useEffect } from 'react'
import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from '@/components/ui/toaster'
import './App.css'

// Pages
import LandingPage from './pages/LandingPage'
import LawyerDashboardPage from './pages/lawyer/LawyerDashboardPage'
import { LoginPage } from '@/pages/Login'
import { RegisterPage } from '@/pages/Register'
import { AppRoutes } from './routes'

function App() {
  return (
    <ThemeProvider defaultTheme="light" storageKey="legal-ai-theme">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/lawyer/dashboard/:id" element={<LawyerDashboardPage />} />
        {/* Use the existing routes for other paths */}
        <Route path="/*" element={<AppRoutes />} />
      </Routes>
      <Toaster />
    </ThemeProvider>
  )
}

export default App
