import { render, screen, userEvent } from '@test-utils';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Text } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { UserScopedAppStateProvider } from '../../state/AppStateContext';
import { AuthMockProvider } from '../../state/AuthMockContext';
import { AppLayout } from './AppLayout';

function RouteProbe() {
  const location = useLocation();
  return <Text>{`${location.pathname}${location.search}`}</Text>;
}

function renderLayout(initialEntry = '/') {
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
          <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
              <Route element={<AppLayout />}>
                <Route path="/" element={<RouteProbe />} />
                <Route path="/profile" element={<RouteProbe />} />
                <Route path="/community" element={<RouteProbe />} />
              </Route>
            </Routes>
          </MemoryRouter>
        </UserScopedAppStateProvider>
      </AuthMockProvider>
    </ModalsProvider>
  );
}

describe('AppLayout', () => {
  it('removes the sidebar profile Paper card and keeps navigation links', () => {
    renderLayout('/');

    expect(screen.queryByText('Đã đăng nhập')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Bản đồ việc làm' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mạng xã hội' })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: 'Hồ sơ' }).length).toBeGreaterThanOrEqual(1);
  });

  it('opens topbar user menu with profile, schedule, history and logout actions', async () => {
    const user = userEvent.setup();
    renderLayout('/');

    await user.click(screen.getByRole('button', { name: 'Tài khoản người dùng' }));

    expect(await screen.findByText('Nguyễn Minh Anh')).toBeInTheDocument();
    expect(screen.getByText('ĐH Bách Khoa TP.HCM')).toBeInTheDocument();
    expect(screen.getByText('Đã đăng nhập')).toBeInTheDocument();
    expect(screen.getByText(/125đ uy tín/i)).toBeInTheDocument();

    expect(screen.getByRole('menuitem', { name: 'Hồ sơ' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Lịch rảnh' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Lịch sử hoạt động' })).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Đăng xuất' })).toBeInTheDocument();

    await user.click(screen.getByRole('menuitem', { name: 'Lịch rảnh' }));
    expect(await screen.findByText('/profile?tab=schedule')).toBeInTheDocument();
  });

  it('toggles desktop sidebar mini-rail state and persists to localStorage', async () => {
    const user = userEvent.setup();
    renderLayout('/');

    const collapseBtn = screen.getByRole('button', { name: 'Thu gọn thanh điều hướng' });
    expect(collapseBtn).toHaveAttribute('aria-expanded', 'true');
    expect(collapseBtn.closest('nav')).toBeInTheDocument();

    await user.click(collapseBtn);

    const expandBtn = screen.getByRole('button', { name: 'Mở rộng thanh điều hướng' });
    expect(expandBtn).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('link', { name: 'Bản đồ việc làm' })).toHaveAttribute('data-collapsed');
    expect(window.localStorage.getItem('svjob_sidebar_collapsed_v1')).toBe('true');

    await user.click(expandBtn);
    expect(screen.getByRole('button', { name: 'Thu gọn thanh điều hướng' })).toHaveAttribute(
      'aria-expanded',
      'true'
    );
    expect(window.localStorage.getItem('svjob_sidebar_collapsed_v1')).toBe('false');
  });
});
