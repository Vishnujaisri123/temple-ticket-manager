import { AuthProvider, useAuth } from './context/AuthContext';
import { useToast, ToastContainer } from './components/Toast';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import './index.css';

const AppContent = () => {
  const { isAuth } = useAuth();
  const { toasts } = useToast();
  return (
    <div className="app-wrapper solo-leveling-theme">
      {/* Sri Venkateswara Swamy Solo Leveling Theme Background System */}
      <div className="deity-background-system">
        <div className="deity-watermark"></div>
        <div className="deity-grid"></div>
        <div className="deity-mist"></div>
        <div className="deity-overlay"></div>
        <div className="deity-runes-left">ᛗ ᛞ ᚱ ᛏ ᛒ ᚠ ᚻ ᚾ ᛁ ᛃ ᛇ ᛈ ᛉ ᛊ ᛏ ᛒ ᛖ ᛗ ᛚ ᛜ ᛞ ᛟ</div>
        <div className="deity-runes-right">ᛟ ᛞ ᛜ ᛚ ᛗ ᛖ ᛒ ᛏ ᛊ ᛉ ᛈ ᛇ ᛃ ᛁ ᚾ ᚻ ᚠ ᛒ ᛏ ᚱ ᛞ ᛗ</div>
      </div>
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
