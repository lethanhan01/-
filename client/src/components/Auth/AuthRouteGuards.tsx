import { Navigate, Outlet, useLocation, type Location } from 'react-router-dom';
import { useAuthMock } from '../../state/AuthMockContext';

interface AuthLocationState {
  from?: Pick<Location, 'pathname' | 'search' | 'hash'>;
}

function getReturnTo(state: unknown): string {
  if (!state || typeof state !== 'object') {
    return '/';
  }

  const from = (state as AuthLocationState).from;
  if (
    !from ||
    typeof from.pathname !== 'string' ||
    !from.pathname.startsWith('/') ||
    from.pathname.startsWith('//')
  ) {
    return '/';
  }

  const search = typeof from.search === 'string' ? from.search : '';
  const hash = typeof from.hash === 'string' ? from.hash : '';
  return `${from.pathname}${search}${hash}`;
}

export function RequireAuth() {
  const { isAuthenticated } = useAuthMock();
  const location = useLocation();

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace state={{ from: location }} />;
}

export function RedirectAuthenticatedUser() {
  const { isAuthenticated } = useAuthMock();
  const location = useLocation();

  return isAuthenticated ? <Navigate to={getReturnTo(location.state)} replace /> : <Outlet />;
}
