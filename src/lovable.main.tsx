import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { LovableAILawyerProvider } from './lovable.AILawyerContext';
import { useLovableEventHooks } from './lovable.hooks';
import './index.css';

// Main Lovable-enabled component
function LovableApp() {
  // Initialize Lovable event hooks
  const { isInitialized } = useLovableEventHooks();
  
  // Log when Lovable is initialized
  React.useEffect(() => {
    if (isInitialized) {
      console.log('Lovable Tagger has been initialized');
    }
  }, [isInitialized]);

  return (
    <React.StrictMode>
      <BrowserRouter>
        <LovableAILawyerProvider>
          <App />
        </LovableAILawyerProvider>
      </BrowserRouter>
    </React.StrictMode>
  );
}

// Mount the app
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <LovableApp />
);

// Debug log for developers
console.log('Running AI Law with Lovable integration'); 