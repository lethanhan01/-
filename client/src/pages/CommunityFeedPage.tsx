import { useEffect, useMemo, useState } from 'react';
import {
  IconBuildingStore,
  IconMessageCircle,
  IconPlus,
  IconSearch,
  IconSend,
  IconShieldCheck,
  IconThumbUp,
} from '@tabler/icons-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  Image,
  Modal,
  Paper,
  Rating,
  SegmentedControl,
  Select,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import { ComposerMode, PostComposerModal } from '../components/Modals/PostComposerModal';
import { PHOTO_FALLBACK } from '../data/seedData';
import { CommunityPost, Company, PostType } from '../domain/types';
import { useAppState } from '../state/AppStateContext';
import classes from './CommunityFeedPage.module.css';

const POST_TYPE_META: Record<PostType, { label: string; color: string }> = {
  review: { label: 'Đánh giá xác thực', color: 'success' },
  question: { label: 'Hỏi đáp kinh nghiệm', color: 'brand' },
  warning: { label: 'Cảnh báo lừa đảo', color: 'danger' },
};

function isComposerMode(value: string | null): value is ComposerMode {
  return value === 'review' || value === 'qa' || value === 'share';
}

function CommunityPostCard({
  post,
  company,
  jobIdForCompany,
  isFocused,
  currentStudentId,
  commentDraft,
  onDraftChange,
  onSendComment,
  onToggleHelpful,
  onMessageAuthor,
  onZoomImage,
}: {
  post: CommunityPost;
  company: Company | undefined;
  jobIdForCompany: string | undefined;
  isFocused: boolean;
  currentStudentId: string;
  commentDraft: string;
  onDraftChange: (value: string) => void;
  onSendComment: () => void;
  onToggleHelpful: () => void;
  onMessageAuthor: () => void;
  onZoomImage: (url: string) => void;
}) {
  return (
    <Card p="md" className={classes.postCard} mod={{ focused: isFocused }}>
      <Stack gap="sm">
        <Group justify="space-between" wrap="wrap" gap="xs">
          <Group gap="sm">
            <Avatar color="brand" radius="xl">
              {post.authorName.slice(0, 1)}
            </Avatar>
            <Stack gap={0}>
              <Group gap="xs">
                <Text size="sm" fw={700}>
                  {post.authorName}
                </Text>
                {post.verifiedWorker ? (
                  <Badge size="xs" color="success" leftSection={<IconShieldCheck size={11} />}>
                    Đã từng làm việc
                  </Badge>
                ) : null}
              </Group>
              <Text size="xs" c="dimmed">
                {post.authorUniversity} • {new Date(post.createdAt).toLocaleDateString('vi-VN')}
              </Text>
            </Stack>
          </Group>

          <Badge color={POST_TYPE_META[post.type].color}>{POST_TYPE_META[post.type].label}</Badge>
        </Group>

        {company ? (
          <Group gap="xs">
            <Button
              component={Link}
              to={jobIdForCompany ? `/jobs/${jobIdForCompany}` : '/'}
              size="xs"
              variant="light"
              color="brand"
              leftSection={<IconBuildingStore size={14} />}
            >
              {company.name} ({company.district})
            </Button>
          </Group>
        ) : null}

        <Title order={2} size="h4">
          {post.title}
        </Title>
        <Text size="sm">{post.content}</Text>

        {post.criteriaRatings ? (
          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="xs">
            <Group gap="xs">
              <Text size="xs" c="dimmed">
                Minh bạch lương:
              </Text>
              <Rating value={post.criteriaRatings.salaryTransparency} readOnly size="xs" />
            </Group>
            <Group gap="xs">
              <Text size="xs" c="dimmed">
                Môi trường:
              </Text>
              <Rating value={post.criteriaRatings.environment} readOnly size="xs" />
            </Group>
            <Group gap="xs">
              <Text size="xs" c="dimmed">
                Linh hoạt lịch:
              </Text>
              <Rating value={post.criteriaRatings.scheduleFlexibility} readOnly size="xs" />
            </Group>
          </SimpleGrid>
        ) : null}

        {post.evidenceImages.length > 0 ? (
          <SimpleGrid cols={{ base: 2, sm: 3 }} spacing="xs">
            {post.evidenceImages.map((imgUrl, idx) => (
              <UnstyledButton
                key={`${imgUrl.slice(0, 48)}-${imgUrl.slice(-16)}`}
                onClick={() => onZoomImage(imgUrl)}
                className={classes.evidenceButton}
                aria-label={`Phóng to ảnh minh chứng ${idx + 1}`}
              >
                <Image
                  src={imgUrl}
                  fallbackSrc={PHOTO_FALLBACK}
                  h={120}
                  radius="sm"
                  fit="cover"
                  alt={`Ảnh minh chứng ${idx + 1}`}
                />
              </UnstyledButton>
            ))}
          </SimpleGrid>
        ) : null}

        <Group justify="space-between" wrap="wrap" gap="xs">
          <Button
            size="xs"
            variant={post.helpfulByMe ? 'filled' : 'light'}
            color="success"
            leftSection={<IconThumbUp size={14} />}
            onClick={onToggleHelpful}
          >
            Hữu ích ({post.helpfulCount})
          </Button>

          {post.authorId !== currentStudentId ? (
            <Button
              size="xs"
              variant="light"
              color="brand"
              leftSection={<IconMessageCircle size={14} />}
              onClick={onMessageAuthor}
            >
              Nhắn tin hỏi kinh nghiệm (MH-05)
            </Button>
          ) : null}
        </Group>

        <Divider />

        <Stack gap="xs">
          <Text size="xs" fw={600} c="dimmed">
            Bình luận & Hỏi đáp ({post.comments.length})
          </Text>

          {post.comments.map((cmt) => (
            <Paper key={cmt.id} withBorder p="xs" radius="sm" bg="var(--app-bg-subtle)">
              <Group justify="space-between" gap="xs">
                <Text size="xs" fw={700}>
                  {cmt.authorName}
                </Text>
                <Text size="xs" c="dimmed">
                  {cmt.authorUniversity}
                </Text>
              </Group>
              <Text size="xs" mt={2}>
                {cmt.content}
              </Text>
            </Paper>
          ))}

          <Group gap="xs" wrap="nowrap">
            <TextInput
              flex={1}
              size="xs"
              placeholder="Viết bình luận hoặc câu hỏi của bạn..."
              value={commentDraft}
              onChange={(e) => onDraftChange(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  onSendComment();
                }
              }}
            />
            <Button
              size="xs"
              variant="light"
              leftSection={<IconSend size={13} />}
              onClick={onSendComment}
            >
              Gửi
            </Button>
          </Group>
        </Stack>
      </Stack>
    </Card>
  );
}

export function CommunityFeedPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { state, derived, actions } = useAppState();

  const rawCompose = searchParams.get('compose');
  const initialCompose = isComposerMode(rawCompose) ? rawCompose : null;
  const initialCompanyId = searchParams.get('companyId') || '';
  const focusedPostId = searchParams.get('postId');

  const [composerOpened, { open: openComposer, close: closeComposer }] = useDisclosure(
    Boolean(initialCompose)
  );
  const [composerMode, setComposerMode] = useState<ComposerMode>(initialCompose ?? 'review');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCompanyId, setFilterCompanyId] = useState<string>(initialCompanyId);
  const [query, setQuery] = useState('');
  const [debouncedQuery] = useDebouncedValue(query, 200);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const cMode = searchParams.get('compose');
    const cId = searchParams.get('companyId');
    if (cId !== null) {
      setFilterCompanyId(cId);
    }
    if (isComposerMode(cMode)) {
      setComposerMode(cMode);
      openComposer();
    }
  }, [searchParams, openComposer]);

  const companyMap = useMemo(
    () => new Map(state.companies.map((c) => [c.id, c])),
    [state.companies]
  );

  const firstJobByCompany = useMemo(() => {
    const map = new Map<string, string>();
    for (const job of derived.canonicalJobs) {
      if (!map.has(job.companyId)) {
        map.set(job.companyId, job.id);
      }
    }
    return map;
  }, [derived.canonicalJobs]);

  const filteredPosts = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    return state.posts.filter((post) => {
      if (filterType !== 'all' && post.type !== filterType) {
        return false;
      }
      if (filterCompanyId && post.companyId !== filterCompanyId) {
        return false;
      }
      if (q) {
        const companyName = post.companyId ? (companyMap.get(post.companyId)?.name ?? '') : '';
        const haystack =
          `${post.title} ${post.content} ${post.authorName} ${companyName}`.toLowerCase();
        if (!haystack.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [state.posts, filterType, filterCompanyId, debouncedQuery, companyMap]);

  const handleOpenComposer = (mode: ComposerMode) => {
    setComposerMode(mode);
    openComposer();
  };

  const handleCloseComposer = () => {
    closeComposer();
    if (searchParams.get('compose')) {
      const next = new URLSearchParams(searchParams);
      next.delete('compose');
      setSearchParams(next, { replace: true });
    }
  };

  const handleMessageAuthor = (postId: string) => {
    const post = state.posts.find((p) => p.id === postId);
    if (!post) {
      return;
    }
    const companyName = post.companyId ? companyMap.get(post.companyId)?.name : undefined;
    const threadId = actions.openOrCreateThread({
      peerId: post.authorId,
      peerName: post.authorName,
      peerRoleLabel: `${post.authorUniversity}${companyName ? ` • ${companyName}` : ''}`,
      peerHasReviewed: post.type === 'review',
      contextPostId: post.id,
      contextCompanyId: post.companyId,
    });
    void navigate(`/messages?threadId=${threadId}`);
  };

  const handleSendComment = (postId: string) => {
    const text = commentDrafts[postId] ?? '';
    if (!text.trim()) {
      return;
    }
    actions.addPostComment(postId, text);
    setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
  };

  return (
    <Stack gap="md">
      <Group justify="space-between" wrap="wrap">
        <Stack gap={2}>
          <Title order={1} size="h2">
            Mạng xã hội, Đánh giá & Hỏi đáp (MH-04)
          </Title>
          <Text size="sm" c="dimmed">
            Tham khảo trải nghiệm thực tế từ sinh viên đi trước, đặt câu hỏi hoặc cảnh báo lừa đảo.
          </Text>
        </Stack>
        <Button leftSection={<IconPlus size={17} />} onClick={() => handleOpenComposer('review')}>
          Đăng bài mới (CS-02)
        </Button>
      </Group>

      <Card p="md">
        <Stack gap="sm">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <TextInput
              placeholder="Tìm theo nội dung, tên công ty, người đăng..."
              leftSection={<IconSearch size={16} />}
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
            />
            <Select
              clearable
              searchable
              placeholder="Lọc theo tên công ty / cơ sở"
              value={filterCompanyId || null}
              onChange={(v) => setFilterCompanyId(v ?? '')}
              data={state.companies.map((c) => ({ value: c.id, label: c.name }))}
            />
          </SimpleGrid>

          <SegmentedControl
            value={filterType}
            onChange={setFilterType}
            data={[
              { value: 'all', label: 'Tất cả bài viết' },
              { value: 'review', label: 'Đánh giá xác thực' },
              { value: 'question', label: 'Hỏi đáp' },
              { value: 'warning', label: 'Cảnh báo lừa đảo' },
            ]}
          />
        </Stack>
      </Card>

      <Stack gap="md">
        {filteredPosts.length === 0 ? (
          <Card p="lg">
            <Text size="sm" c="dimmed" ta="center">
              Chưa có bài viết nào khớp bộ lọc. Hãy thử xóa bộ lọc hoặc đăng bài chia sẻ đầu tiên!
            </Text>
          </Card>
        ) : (
          filteredPosts.map((post) => (
            <CommunityPostCard
              key={post.id}
              post={post}
              company={post.companyId ? companyMap.get(post.companyId) : undefined}
              jobIdForCompany={post.companyId ? firstJobByCompany.get(post.companyId) : undefined}
              isFocused={focusedPostId === post.id}
              currentStudentId={state.profile.id}
              commentDraft={commentDrafts[post.id] ?? ''}
              onDraftChange={(val) => setCommentDrafts((prev) => ({ ...prev, [post.id]: val }))}
              onSendComment={() => handleSendComment(post.id)}
              onToggleHelpful={() => actions.toggleHelpfulPost(post.id)}
              onMessageAuthor={() => handleMessageAuthor(post.id)}
              onZoomImage={setZoomImageUrl}
            />
          ))
        )}
      </Stack>

      <PostComposerModal
        opened={composerOpened}
        onClose={handleCloseComposer}
        defaultMode={composerMode}
        prefillCompanyId={filterCompanyId || undefined}
        onSharedJobCreated={(jobId) => {
          void navigate(`/?highlightJobId=${jobId}`);
        }}
      />

      <Modal
        opened={Boolean(zoomImageUrl)}
        onClose={() => setZoomImageUrl(null)}
        size="lg"
        title="Ảnh minh chứng thực tế"
      >
        {zoomImageUrl ? (
          <Image src={zoomImageUrl} fallbackSrc={PHOTO_FALLBACK} radius="md" alt="Ảnh phóng to" />
        ) : null}
      </Modal>
    </Stack>
  );
}
