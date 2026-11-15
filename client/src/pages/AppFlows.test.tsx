import { render, screen, userEvent, within } from '@test-utils';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { createSeedState } from '../data/seedData';
import { AppStateProvider } from '../state/AppStateContext';
import { CommunityFeedPage } from './CommunityFeedPage';
import { JobApplyPage } from './JobApplyPage';
import { JobDetailPage } from './JobDetailPage';
import { JobsMapPage } from './JobsMapPage';
import { MessagesPage } from './MessagesPage';
import { ProfileSchedulePage } from './ProfileSchedulePage';

function renderAppRoute(initialEntry: string, clearStorage = true) {
  if (clearStorage) {
    window.localStorage.clear();
  }
  return render(
    <ModalsProvider>
      <Notifications />
      <AppStateProvider>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/" element={<JobsMapPage />} />
            <Route path="/profile" element={<ProfileSchedulePage />} />
            <Route path="/jobs/:jobId" element={<JobDetailPage />} />
            <Route path="/jobs/:jobId/apply" element={<JobApplyPage />} />
            <Route path="/community" element={<CommunityFeedPage />} />
            <Route path="/messages" element={<MessagesPage />} />
          </Routes>
        </MemoryRouter>
      </AppStateProvider>
    </ModalsProvider>
  );
}

describe('Student Part-Time App Flows', () => {
  it('opens the map filters and filters matching jobs on MH-01', async () => {
    const user = userEvent.setup();
    renderAppRoute('/');

    expect(screen.queryByText(/Bản đồ Việc làm Thêm \(MH-01\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Đã khử trùng lặp/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Sắp xếp theo độ khớp lịch rảnh/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Mở bộ lọc/i }));
    const switchEl = screen.getByLabelText(/Chỉ hiện việc khớp lịch rảnh/i);
    await user.click(switchEl);
    expect(screen.getByText(/Danh sách việc làm/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /^Chi tiết$/i }).length).toBeGreaterThan(0);
  });

  it('merges new seed jobs, syncs company coordinates, and normalizes legacy anchorZoneId into Hanoi', () => {
    const savedState = createSeedState();
    savedState.companies = savedState.companies
      .filter((company) => !company.id.startsWith('comp-hust-'))
      .map((company) => ({ ...company, lat: 10.875, lng: 106.801 }));
    savedState.rawJobs = savedState.rawJobs.filter((job) => !job.id.startsWith('job-hust-'));
    savedState.profile.anchorZoneId = 'legacy-unknown-zone';
    window.localStorage.setItem('svjob_state_v1', JSON.stringify(savedState));

    renderAppRoute('/', false);

    expect(screen.getByText('Danh sách việc làm (17)')).toBeInTheDocument();
  });

  it('validates scam report modal (CS-01) and submits report on MH-03', async () => {
    const user = userEvent.setup();
    renderAppRoute('/jobs/job-anhduong-1');

    expect(screen.getByText(/Cảnh báo an toàn từ cộng đồng/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Báo cáo lừa đảo/i }));
    await user.click(screen.getByRole('button', { name: /Gửi báo cáo ngay/i }));

    expect(screen.getByText(/Vui lòng chọn ít nhất 1 dấu hiệu vi phạm/i)).toBeInTheDocument();

    await user.click(screen.getByLabelText(/Yêu cầu đóng tiền đặt cọc/i));
    await user.type(
      screen.getByLabelText(/Mô tả chi tiết tình huống/i),
      'Yêu cầu đóng 450.000đ tiền đồng phục ngay khi phỏng vấn'
    );
    await user.click(screen.getByRole('button', { name: /Gửi báo cáo ngay/i }));

    expect(
      screen.queryByText(/Báo cáo dấu hiệu lừa đảo & vi phạm \(CS-01\)/i)
    ).not.toBeInTheDocument();
  });

  it('auto-fills student profile on MH-06 and submits application to MH-02 history', async () => {
    const user = userEvent.setup();
    renderAppRoute('/jobs/job-highlands-1/apply');

    const nameInput = screen.getByLabelText(/Họ và tên/i) as HTMLInputElement;
    expect(nameInput.value).toBe('Nguyễn Minh Anh');

    const confirmCheckbox = screen.getByLabelText(/Tôi đã kiểm tra kỹ mức lương/i);
    await user.click(confirmCheckbox);

    await user.click(screen.getByRole('button', { name: /Gửi hồ sơ ứng tuyển/i }));

    expect(await screen.findByText(/Việc đã ứng tuyển/i)).toBeInTheDocument();
    expect(
      screen.getByText('Barista & Phục vụ Part-time (Linh hoạt theo TKB)')
    ).toBeInTheDocument();
  });

  it('opens CS-02 on MH-04 and posts a new community question', async () => {
    const user = userEvent.setup();
    renderAppRoute('/community');

    await user.click(screen.getByRole('button', { name: /Đăng bài mới/i }));
    await user.click(screen.getByText(/Hỏi đáp \/ Cảnh báo/i));

    await user.type(screen.getByLabelText(/^Tiêu đề/i), 'Hỏi lịch làm cuối tuần tại Thủ Đức');
    await user.type(
      screen.getByLabelText(/Nội dung chi tiết/i),
      'Có bạn nào từng làm ca sáng T7-CN ở khu ĐHQG chia sẻ giúp mình nhé!'
    );
    await user.click(screen.getByRole('button', { name: /Đăng lên bảng tin/i }));

    expect(await screen.findByText(/Hỏi lịch làm cuối tuần tại Thủ Đức/i)).toBeInTheDocument();
  });

  it('shares a trusted job from CS-02 onto MH-01 map list', async () => {
    const user = userEvent.setup();
    renderAppRoute('/community');

    await user.click(screen.getByRole('button', { name: /Đăng bài mới/i }));
    await user.click(screen.getByText(/Chia sẻ tin uy tín lên Bản đồ/i));

    await user.type(screen.getByLabelText(/Tên cơ sở mới/i), 'Phê La Làng ĐHQG');
    await user.type(screen.getByLabelText(/Địa chỉ cụ thể/i), '18 Hàn Thuyên, Linh Trung');
    await user.type(screen.getByLabelText(/Vị trí tuyển dụng/i), 'Nhân viên Pha chế Ca Tối');
    await user.type(
      screen.getByLabelText(/Mô tả công việc/i),
      'Quán mới mở ngay khu ĐHQG, hợp đồng rõ ràng, không thu phí đồng phục.'
    );
    await user.click(screen.getByRole('button', { name: /Chia sẻ lên Bản đồ/i }));

    expect(await screen.findByText(/Danh sách việc làm/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Nhân viên Pha chế Ca Tối/i).length).toBeGreaterThanOrEqual(1);
  }, 15000);

  it('switches threads with aria-current and sends message + profile card on MH-05', async () => {
    const user = userEvent.setup();
    renderAppRoute('/messages');

    expect(screen.getByText(/Nhắn tin Cộng đồng giữa Sinh viên \(MH-05\)/i)).toBeInTheDocument();

    const firstThreadBtn = screen.getByRole('button', { name: /Trần Gia Bảo/i });
    const secondThreadBtn = screen.getByRole('button', { name: /Nguyễn Ngọc Linh/i });

    expect(firstThreadBtn).toHaveAttribute('aria-current', 'true');
    expect(secondThreadBtn).not.toHaveAttribute('aria-current', 'true');

    await user.click(secondThreadBtn);
    expect(secondThreadBtn).toHaveAttribute('aria-current', 'true');
    expect(firstThreadBtn).not.toHaveAttribute('aria-current', 'true');

    await user.type(
      screen.getByPlaceholderText(/Nhập tin nhắn trao đổi kinh nghiệm/i),
      'Ca tối có được hỗ trợ gửi xe không bạn?'
    );
    await user.click(screen.getByRole('button', { name: /^Gửi$/i }));
    expect(
      (await screen.findAllByText('Ca tối có được hỗ trợ gửi xe không bạn?')).length
    ).toBeGreaterThanOrEqual(2);

    await user.click(screen.getByRole('button', { name: /Gửi nhanh thẻ hồ sơ cá nhân/i }));
    expect(
      (await screen.findAllByText(/Thẻ hồ sơ: Nguyễn Minh Anh/i)).length
    ).toBeGreaterThanOrEqual(1);
  });

  it('renders company star rating stats on /jobs/job-coop-1 and updates after submitting a required-star review', async () => {
    const user = userEvent.setup();
    renderAppRoute('/jobs/job-coop-1');

    const ratingSection = screen.getByRole('region', { name: /Đánh giá sao từ cộng đồng/i });
    expect(screen.getByText('4.4 (3 đánh giá)')).toBeInTheDocument();
    expect(within(ratingSection).getByText(/Tổng hợp từ 3 bài đánh giá/i)).toBeInTheDocument();
    expect(
      within(ratingSection).getByText(
        /Trải nghiệm 4 tháng soạn đơn online tại Co\.opXtra Linh Trung/i
      )
    ).toBeInTheDocument();

    await user.click(within(ratingSection).getByRole('button', { name: /4 ★ \(1\)/i }));
    expect(
      within(ratingSection).queryByText(
        /Trải nghiệm 4 tháng soạn đơn online tại Co\.opXtra Linh Trung/i
      )
    ).not.toBeInTheDocument();
    expect(
      within(ratingSection).getByText(/Lương 34k\/h ổn định, giờ cao điểm cuối tuần đơn hơi nhiều/i)
    ).toBeInTheDocument();

    await user.click(within(ratingSection).getByRole('button', { name: /Tất cả \(3\)/i }));
    await user.click(within(ratingSection).getByRole('button', { name: /Viết đánh giá công ty/i }));

    const dialog = await screen.findByRole('dialog');
    await user.type(within(dialog).getByLabelText(/^Tiêu đề/i), 'Đánh giá mới Co.opXtra');
    await user.type(
      within(dialog).getByLabelText(/Nội dung đánh giá/i),
      'Đồng nghiệp hỗ trợ rất nhiệt tình, trả lương đúng thứ 6.'
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

    await selectStar('Minh bạch lương', 5);
    await selectStar('Môi trường', 5);
    await selectStar('Linh hoạt lịch', 5);
    await selectStar('Chế độ & Đãi ngộ', 5);
    await selectStar('Chất lượng công việc', 5);
    await user.click(within(dialog).getByRole('button', { name: /Đăng đánh giá/i }));

    expect(await within(ratingSection).findByText('Đánh giá mới Co.opXtra')).toBeInTheDocument();
    expect(within(ratingSection).getByText(/Tổng hợp từ 4 bài đánh giá/i)).toBeInTheDocument();
  }, 15000);
});
