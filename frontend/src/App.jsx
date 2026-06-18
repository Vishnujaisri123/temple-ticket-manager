import { AuthProvider, useAuth } from './context/AuthContext';
import { useToast, ToastContainer } from './components/Toast';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import BackgroundEffects from './components/BackgroundEffects';
import './index.css';

const AppContent = () => {
  const { isAuth } = useAuth();
  const { toasts } = useToast();
  return (
    <div className="solo-leveling-theme" style={{ minHeight: '100vh', position: 'relative' }}>
      <BackgroundEffects />
      {isAuth ? <Dashboard /> : <Login />}
      <ToastContainer toasts={toasts} />
    </div>
  );
};

const App = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
