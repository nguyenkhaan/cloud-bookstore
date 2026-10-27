import './App.css';
import '@/features/auth/auth.css';
import { AuthProvider } from '@/tmp/context/AuthProvider';
import AppRoutes from '@/routes/AppRoutes';

export function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
