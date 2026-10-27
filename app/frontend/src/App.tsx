import './App.css';
import '@/tmp/features/auth/auth.css';
import { AuthProvider } from '@/tmp/context/AuthProvider';
import { AppRoutes } from '@/tmp/routes/AppRoutes';

export function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

export default App;
