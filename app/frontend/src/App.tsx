import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '@/context/auth-provider';
import AppRoutes from '@/routes/AppRoutes';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
