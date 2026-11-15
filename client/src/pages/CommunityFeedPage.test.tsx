import { render, screen, userEvent, within } from '@test-utils';
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
  it('renders posts with images and star ratings and filters by search query', async () => {
    const user = userEvent.setup();
    renderCommunityRoute();

    expect(screen.getAllByAltText(/Ảnh minh chứng/i).length).toBeGreaterThanOrEqual(5);
    expect(screen.getAllByText(/\/ 5 sao/i).length).toBeGreaterThanOrEqual(3);

    const searchInput = screen.getByPlaceholderText(/Tìm theo nội dung, tên công ty/i);
    expect(searchInput).toBeInTheDocument();
    await user.type(searchInput, 'Ánh Dương');

    const matches = await screen.findAllByText(/Ánh Dương/i);
    expect(matches.length).toBeGreaterThan(0);
  }, 15000);

  it('requires star ratings in CS-02 review form, creates a review post, and adds a comment', async () => {
    const user = userEvent.setup();
    renderCommunityRoute();

    await user.click(screen.getByRole('button', { name: /Đăng bài mới/i }));
    const dialog = await screen.findByRole('dialog');

    expect(within(dialog).getByText(/Chế độ & Đãi ngộ/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/Chất lượng công việc/i)).toBeInTheDocument();

    await user.type(within(dialog).getByLabelText(/^Tiêu đề/i), 'Review Highlands');
    await user.type(
      within(dialog).getByLabelText(/Nội dung đánh giá/i),
      'Quản lý hỗ trợ lịch thi rất tốt.'
    );
    await user.click(within(dialog).getByRole('button', { name: /Đăng đánh giá/i }));

    expect(await within(dialog).findAllByText(/Vui lòng chọn từ 1 đến 5 sao/i)).toHaveLength(5);

    const selectStar = async (label: string, star: number) => {
      const radio = within(dialog).getByRole('radio', { name: `${label}: ${star} sao` });
      const starLabel = dialog.querySelector(`label[for="${radio.id}"]`);
      if (!starLabel) {
        throw new Error(`Missing label for ${label}: ${star}`);
      }
      await user.click(starLabel);
    };

    await selectStar('Minh bạch lương', 4);
    await selectStar('Môi trường', 4);
    await selectStar('Linh hoạt lịch', 4);
    await selectStar('Chế độ & Đãi ngộ', 3);
    await selectStar('Chất lượng công việc', 4);
    await user.click(within(dialog).getByRole('button', { name: /Đăng đánh giá/i }));

    expect(await screen.findByText('Review Highlands')).toBeInTheDocument();
    expect(screen.getByText('3.8 / 5 sao')).toBeInTheDocument();

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
