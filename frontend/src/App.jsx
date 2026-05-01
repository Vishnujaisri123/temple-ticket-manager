import { AuthProvider, useAuth } from './context/AuthContext';
import { useToast, ToastContainer } from './components/Toast';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import './index.css';

const AppContent = () => {
  const { isAuth } = useAuth();
  const { toasts } = useToast();
  return (
    <>
      {isAuth ? <Dashboard /> : <Login />}
      <ToastContainer toasts={toasts} />
    </>
  );
};

const App = () => (
  <AuthProvider>
    <AppContent />
  </AuthProvider>
);

export default App;
