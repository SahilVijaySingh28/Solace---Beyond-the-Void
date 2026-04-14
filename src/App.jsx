import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';

const AppContent = () => {
  const { user } = useAuth();

  return (
    <>
      <div className="nebula nebula-1"></div>
      <div className="nebula nebula-2"></div>
      {user ? <Dashboard /> : <Auth />}
    </>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
