import { render, screen, userEvent } from '@test-utils';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Text } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { RedirectAuthenticatedUser, RequireAuth } from '../components/Auth/AuthRouteGuards';
import { AppLayout } from '../components/Layout/AppLayout';
import { useAppState, UserScopedAppStateProvider } from '../state/AppStateContext';
import { AuthMockProvider } from '../state/AuthMockContext';
import { AuthPage } from './AuthPage';

function AccountProfileProbe() {
  const { state } = useAppState();

  return (
    <Text>
      {state.profile.fullName} | {state.profile.email} | {state.profile.university}
    </Text>
  );
}

function renderAuthRoute(initialEntry = '/auth') {
  window.localStorage.clear();
  return render(
    <AuthMockProvider>
      <Notifications />
      <UserScopedAppStateProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route element={<RedirectAuthenticatedUser />}>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/login" element={<AuthPage defaultTab="login" />} />
              <Route path="/register" element={<AuthPage defaultTab="register" />} />
            </Route>
            <Route element={<RequireAuth />}>
              <Route path="/" element={<AccountProfileProbe />} />
              <Route
                path="/community"
                element={
                  <>
                    <Text>Protected community page</Text>
                    <AccountProfileProbe />
                  </>
                }
              />
            </Route>
          </Routes>
        </MemoryRouter>
      </UserScopedAppStateProvider>
    </AuthMockProvider>
  );
}

function renderAuthenticatedApp() {
  window.localStorage.clear();
  window.localStorage.setItem(
    'parttime-student-auth-session-v1',
    JSON.stringify({
      id: 'student-1',
      fullName: 'Nguyễn Minh Anh',
      email: 'minhanh@hcmut.edu.vn',
      phone: '0901234567',
      university: 'ĐH Bách Khoa TP.HCM',
      major: 'Khoa học Máy tính',
      yearLabel: 'Năm 3',
      verifiedStudent: true,
    })
  );

  return render(
    <ModalsProvider>
      <Notifications />
      <AuthMockProvider>
        <UserScopedAppStateProvider>
          <MemoryRouter initialEntries={['/']}>
            <Routes>
              <Route element={<RedirectAuthenticatedUser />}>
                <Route path="/login" element={<AuthPage defaultTab="login" />} />
              </Route>
              <Route element={<RequireAuth />}>
                <Route element={<AppLayout />}>
                  <Route path="/" element={<Text>Protected system page</Text>} />
                </Route>
              </Route>
            </Routes>
          </MemoryRouter>
        </UserScopedAppStateProvider>
      </AuthMockProvider>
    </ModalsProvider>
  );
}

describe('AuthPage (Đăng nhập & Đăng ký)', () => {
  it('blocks direct access to a protected route until login succeeds', async () => {
    const user = userEvent.setup();
    renderAuthRoute('/community');

    expect(await screen.findByLabelText(/Email sinh viên/i)).toBeInTheDocument();
    expect(screen.queryByText('Protected community page')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/Email sinh viên/i), 'minhanh@hcmut.edu.vn');
    await user.type(screen.getByLabelText(/Mật khẩu/i), '123456');
    await user.click(screen.getByRole('button', { name: /^Đăng nhập$/i }));

    expect(await screen.findByText('Protected community page')).toBeInTheDocument();
  });

  it('validates login fields and reports incorrect credentials', async () => {
    const user = userEvent.setup();
    renderAuthRoute('/login');

    await user.click(screen.getByRole('button', { name: /^Đăng nhập$/i }));
    expect(screen.getByText(/Vui lòng nhập đúng định dạng email/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Email sinh viên/i), 'minhanh@hcmut.edu.vn');
    await user.type(screen.getByLabelText(/Mật khẩu/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /^Đăng nhập$/i }));

    expect(screen.getByText('Mật khẩu không chính xác')).toBeInTheDocument();
  });

  it('creates an account and grants access after successful registration', async () => {
    const user = userEvent.setup();
    renderAuthRoute('/auth');

    await user.click(screen.getByRole('tab', { name: /Đăng ký tài khoản/i }));
    await user.type(screen.getByLabelText(/Họ và tên/i), 'Lê Minh Tuấn');
    await user.type(screen.getByLabelText(/^Email/i), 'tuan@uit.edu.vn');
    await user.type(screen.getByLabelText(/Số điện thoại/i), '0909888777');
    await user.type(screen.getByLabelText(/^Mật khẩu/i), '123456');
    await user.type(screen.getByLabelText(/Nhập lại mật khẩu/i), '123456');
    await user.click(screen.getByLabelText(/Tôi cam kết đánh giá trung thực/i));
    await user.click(screen.getByRole('button', { name: /^Tạo tài khoản$/i }));

    expect(
      await screen.findByText('Lê Minh Tuấn | tuan@uit.edu.vn | ĐH Bách Khoa TP.HCM')
    ).toBeInTheDocument();
    const accountStateKey = Object.keys(window.localStorage).find((key) =>
      key.startsWith('svjob_state_v1:student-')
    );
    expect(accountStateKey).toBeDefined();
    expect(JSON.parse(window.localStorage.getItem(accountStateKey!) ?? '').profile.fullName).toBe(
      'Lê Minh Tuấn'
    );
  });

  it('uses the profile belonging to the account that signs in', async () => {
    const user = userEvent.setup();
    renderAuthRoute('/login');

    await user.type(screen.getByLabelText(/Email sinh viên/i), 'hoangnam@ueh.edu.vn');
    await user.type(screen.getByLabelText(/Mật khẩu/i), '123456');
    await user.click(screen.getByRole('button', { name: /^Đăng nhập$/i }));

    expect(
      await screen.findByText('Trần Hoàng Nam | hoangnam@ueh.edu.vn | ĐH Kinh tế TP.HCM (UEH)')
    ).toBeInTheDocument();
  });

  it('logs out and returns to the login screen, blocking system access', async () => {
    const user = userEvent.setup();
    renderAuthenticatedApp();

    expect(screen.getByText('Protected system page')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tài khoản người dùng' }));
    await user.click(await screen.findByRole('menuitem', { name: /Đăng xuất/i }));

    expect(await screen.findByLabelText(/Email sinh viên/i)).toBeInTheDocument();
    expect(screen.queryByText('Protected system page')).not.toBeInTheDocument();
  });
});
