import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import './index.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';

// Register service worker with auto-update
const updateSW = registerSW({
  onNeedRefresh() {
    // When new content is available, auto-update
    void updateSW(true);
  },
  onOfflineReady() {
    console.log('App is ready for offline use');
  },
});

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
