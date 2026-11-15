import { render, screen, userEvent } from '@test-utils';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Notifications } from '@mantine/notifications';
import { AuthMockProvider } from '../state/AuthMockContext';
import { AuthPage } from './AuthPage';

function renderAuthRoute(initialEntry = '/auth') {
  window.localStorage.clear();
  return render(
    <AuthMockProvider>
      <Notifications />
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/login" element={<AuthPage defaultTab="login" />} />
          <Route path="/register" element={<AuthPage defaultTab="register" />} />
          <Route path="/community" element={<AuthPage />} />
        </Routes>
      </MemoryRouter>
    </AuthMockProvider>
  );
}

describe('AuthPage (Đăng nhập & Đăng ký)', () => {
  it('validates login fields and shows error when password is wrong', async () => {
    const user = userEvent.setup();
    renderAuthRoute('/login');

    await user.click(screen.getByRole('button', { name: /Đăng nhập & Vào Cộng đồng/i }));
    expect(screen.getByText(/Vui lòng nhập đúng định dạng email/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/Email sinh viên/i), 'minhanh@hcmut.edu.vn');
    await user.type(screen.getByLabelText(/Mật khẩu/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /Đăng nhập & Vào Cộng đồng/i }));

    expect(
      screen.getByText(/Mật khẩu không chính xác \(mật khẩu mẫu là 123456\)/i)
    ).toBeInTheDocument();
  });

  it('logs in with valid student credentials successfully', async () => {
    const user = userEvent.setup();
    renderAuthRoute('/auth');

    await user.type(screen.getByLabelText(/Email sinh viên/i), 'minhanh@hcmut.edu.vn');
    await user.type(screen.getByLabelText(/Mật khẩu/i), '123456');
    await user.click(screen.getByRole('button', { name: /Đăng nhập & Vào Cộng đồng/i }));

    expect(await screen.findByText(/Đã đăng nhập phiên mô phỏng/i)).toBeInTheDocument();
    expect(screen.getByText('Sinh viên xác thực')).toBeInTheDocument();
  });

  it('switches to register tab, validates and creates a new student account', async () => {
    const user = userEvent.setup();
    renderAuthRoute('/auth');

    await user.click(screen.getByRole('tab', { name: /Đăng ký tài khoản/i }));

    await user.type(screen.getByLabelText(/Họ và tên/i), 'Lê Minh Tuấn');
    await user.type(screen.getByLabelText(/^Email/i), 'tuan@uit.edu.vn');
    await user.type(screen.getByLabelText(/Số điện thoại/i), '0909888777');
    await user.type(screen.getByLabelText(/^Mật khẩu/i), '123456');
    await user.type(screen.getByLabelText(/Nhập lại mật khẩu/i), '123456');
    await user.click(screen.getByLabelText(/Tôi cam kết đánh giá trung thực/i));

    await user.click(screen.getByRole('button', { name: /Tạo tài khoản & Vào Cộng đồng/i }));

    expect(await screen.findByText(/Đã đăng nhập phiên mô phỏng/i)).toBeInTheDocument();
    expect(screen.getByText('Lê Minh Tuấn')).toBeInTheDocument();
  });
});
