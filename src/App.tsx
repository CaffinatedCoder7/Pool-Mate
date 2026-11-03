import { RouterProvider } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { BookingProvider } from '@/context/BookingContext';
import { NotificationProvider } from '@/context/NotificationContext';
import { router } from '@/routes/router';

export function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <BookingProvider>
          <RouterProvider router={router} future={{ v7_startTransition: true }} />
        </BookingProvider>
      </AuthProvider>
    </NotificationProvider>
  );
}
