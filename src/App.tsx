import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './components/Toast';
import { useRoute } from './services/navigation';
import { LandingPage } from './views/LandingPage';
import { LoginPage } from './views/LoginPage';
import { RegisterPage } from './views/RegisterPage';
import { DashboardContainer } from './views/DashboardContainer';

function AppContent() {
  const route = useRoute();
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-navy-950 flex flex-col items-center justify-center transition-colors duration-300">
        <div className="relative">
          <div className="w-14 h-14 border-4 border-primary-100 dark:border-navy-800 rounded-full"></div>
          <div className="absolute top-0 left-0 w-14 h-14 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <p className="mt-5 text-xs font-bold text-navy-500 dark:text-navy-450 uppercase tracking-widest animate-pulse">
          Loading ERP Portal...
        </p>
      </div>
    );
  }

  switch (route.path) {
    case 'landing':
      return <LandingPage />;
    case 'login':
      return <LoginPage />;
    case 'register':
      return <RegisterPage />;
    case 'dashboard':
      return <DashboardContainer />;
    default:
      return <LandingPage />;
  }
}

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;

