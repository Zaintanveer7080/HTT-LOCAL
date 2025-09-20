import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter as Router } from 'react-router-dom';
import App from '@/App';
import '@/index.css';
import { Toaster as DefaultToaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from 'react-hot-toast';
import { AuthProvider } from '@/contexts/SupabaseAuthContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Router>
      <AuthProvider>
        <App />
      </AuthProvider>
      <DefaultToaster />
      <Sonner position="top-right" toastOptions={{ style: { fontSize: 14 } }} />
    </Router>
  </React.StrictMode>
);