import { render, screen, userEvent } from '@test-utils';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { AppStateProvider } from '../state/AppStateContext';
import { AuthMockProvider } from '../state/AuthMockContext';
import { CommunityFeedPage } from './CommunityFeedPage';

function renderCommunityRoute(initialEntry = '/community') {
  window.localStorage.clear();
  return render(
    <ModalsProvider>
      <Notifications />
      <AuthMockProvider>
        <AppStateProvider>
          <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
              <Route path="/community" element={<CommunityFeedPage />} />
              <Route path="/auth" element={<CommunityFeedPage />} />
              <Route path="/messages" element={<CommunityFeedPage />} />
              <Route path="/jobs/:jobId" element={<CommunityFeedPage />} />
              <Route path="/" element={<CommunityFeedPage />} />
            </Routes>
          </MemoryRouter>
        </AppStateProvider>
      </AuthMockProvider>
    </ModalsProvider>
  );
}

describe('CommunityFeedPage (MH-04 & CS-02)', () => {
  it('renders posts and filters by search query', async () => {
    const user = userEvent.setup();
    renderCommunityRoute();

    const searchInput = screen.getByPlaceholderText(/Tìm theo nội dung, tên công ty/i);
    expect(searchInput).toBeInTheDocument();
    await user.type(searchInput, 'Ánh Dương');

    const matches = await screen.findAllByText(/Ánh Dương/i);
    expect(matches.length).toBeGreaterThan(0);
  });

  it('opens CS-02 modal, creates a review post, and adds a comment', async () => {
    const user = userEvent.setup();
    renderCommunityRoute();

    await user.click(screen.getByRole('button', { name: /Đăng bài mới/i }));

    expect(screen.getByText(/Chế độ & Đãi ngộ/i)).toBeInTheDocument();
    expect(screen.getByText(/Chất lượng công việc/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText(/^Tiêu đề/i), 'Review Highlands');
    await user.type(
      screen.getByLabelText(/Nội dung đánh giá/i),
      'Quản lý hỗ trợ lịch thi rất tốt.'
    );
    await user.click(screen.getByRole('button', { name: /Đăng đánh giá/i }));

    expect(await screen.findByText('Review Highlands')).toBeInTheDocument();

    const commentInputs = screen.getAllByPlaceholderText(/Viết bình luận hoặc câu hỏi của bạn/i);
    await user.type(commentInputs[0], 'Cảm ơn bạn!');
    const sendButtons = screen.getAllByRole('button', { name: /^Gửi$/i });
    await user.click(sendButtons[0]);

    expect(await screen.findByText('Cảm ơn bạn!')).toBeInTheDocument();
  }, 15000);

  it('toggles helpful button on a post', async () => {
    const user = userEvent.setup();
    renderCommunityRoute();

    const helpfulButtons = screen.getAllByRole('button', { name: /Hữu ích/i });
    const initialText = helpfulButtons[0].textContent ?? '';
    await user.click(helpfulButtons[0]);

    expect(helpfulButtons[0].textContent).not.toBe(initialText);
  });
});
