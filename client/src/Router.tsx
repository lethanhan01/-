import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import { RedirectAuthenticatedUser, RequireAuth } from './components/Auth/AuthRouteGuards';
import { AppLayout } from './components/Layout/AppLayout';
import { AuthPage } from './pages/AuthPage';
import { CommunityFeedPage } from './pages/CommunityFeedPage';
import { JobApplyPage } from './pages/JobApplyPage';
import { JobDetailPage } from './pages/JobDetailPage';
import { JobsMapPage } from './pages/JobsMapPage';
import { MessagesPage } from './pages/MessagesPage';
import { ProfileSchedulePage } from './pages/ProfileSchedulePage';

const router = createBrowserRouter([
  {
    element: <RedirectAuthenticatedUser />,
    children: [
      { path: '/auth', element: <AuthPage /> },
      { path: '/login', element: <AuthPage defaultTab="login" /> },
      { path: '/register', element: <AuthPage defaultTab="register" /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <JobsMapPage /> },
          { path: '/profile', element: <ProfileSchedulePage /> },
          { path: '/jobs/:jobId', element: <JobDetailPage /> },
          { path: '/jobs/:jobId/apply', element: <JobApplyPage /> },
          { path: '/community', element: <CommunityFeedPage /> },
          { path: '/messages', element: <MessagesPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/login" replace /> },
]);

export function Router() {
  return <RouterProvider router={router} />;
}
