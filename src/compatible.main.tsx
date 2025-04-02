
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';

// Try-catch for optional Lovable Tagger import
try {
  // Only attempt to import if the module exists
  if (import.meta.env.DEV) {
    console.log('Development mode detected, checking for Lovable Tagger');
    // Dynamic import to avoid build errors
    import('lovable-tagger/dist/lovable-tagger.js')
      .then(() => console.log('Lovable Tagger loaded'))
      .catch(err => console.log('Lovable Tagger not available:', err.message));
  }
} catch (e) {
  console.log('Lovable Tagger import skipped');
}

// Main application component
function AppWrapper() {
  return (
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}

// Mount the app
const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<AppWrapper />);
}

// Debug log for developers
console.log('Application initialized with compatible configuration');
