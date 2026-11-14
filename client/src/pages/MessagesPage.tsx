import { useEffect, useMemo, useState } from 'react';
import { IconBuildingStore, IconIdBadge2, IconSend, IconShieldCheck } from '@tabler/icons-react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Divider,
  Grid,
  Group,
  Paper,
  ScrollArea,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
  Title,
  UnstyledButton,
} from '@mantine/core';
import { ChatMessage, ChatThread } from '../domain/types';
import { useAppState } from '../state/AppStateContext';
import classes from './MessagesPage.module.css';

function ThreadListItem({
  thread,
  isActive,
  onSelect,
}: {
  thread: ChatThread;
  isActive: boolean;
  onSelect: () => void;
}) {
  const lastMsg = thread.messages[thread.messages.length - 1];
  return (
    <UnstyledButton
      onClick={onSelect}
      w="100%"
      className={classes.threadButton}
      mod={{ active: isActive }}
      aria-current={isActive ? 'true' : undefined}
    >
      <Paper withBorder p="xs" radius="md" className={classes.threadCard}>
        <Group justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <Avatar size="sm" radius="xl" color="brand">
              {thread.peerName.slice(0, 1)}
            </Avatar>
            <Stack gap={0}>
              <Text size="sm" fw={700} lineClamp={1}>
                {thread.peerName}
              </Text>
              <Text size="xs" c="dimmed" lineClamp={1}>
                {thread.peerRoleLabel}
              </Text>
            </Stack>
          </Group>
          {thread.unreadCount > 0 ? (
            <Badge size="xs" color="danger" variant="filled">
              {thread.unreadCount}
            </Badge>
          ) : null}
        </Group>
        <Text size="xs" c="dimmed" lineClamp={1} mt={4}>
          {lastMsg ? lastMsg.text : 'Bắt đầu cuộc trò chuyện mới...'}
        </Text>
      </Paper>
    </UnstyledButton>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isMe = msg.sender === 'me';
  return (
    <Group justify={isMe ? 'flex-end' : 'flex-start'}>
      <Paper
        withBorder={!isMe}
        maw={{ base: '88%', sm: '75%' }}
        p="sm"
        radius="md"
        className={classes.bubble}
        mod={{ me: isMe }}
      >
        <Stack gap="xs">
          {msg.text.trim() ? <Text size="sm">{msg.text}</Text> : null}
          {msg.profileCard ? (
            <Card p="xs" className={classes.profileCard}>
              <Stack gap={4}>
                <Group justify="space-between">
                  <Text size="xs" fw={700}>
                    Thẻ hồ sơ: {msg.profileCard.fullName}
                  </Text>
                  <Badge size="xs" color="success">
                    {msg.profileCard.yearLabel}
                  </Badge>
                </Group>
                <Text size="xs" c="dimmed">
                  {msg.profileCard.university} • {msg.profileCard.major}
                </Text>
                <Group gap={4} wrap="wrap">
                  {msg.profileCard.skills.map((s) => (
                    <Badge key={s} size="xs" color="brand">
                      {s}
                    </Badge>
                  ))}
                </Group>
              </Stack>
            </Card>
          ) : null}
        </Stack>
      </Paper>
    </Group>
  );
}

export function MessagesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedThreadId = searchParams.get('threadId');
  const { state, derived, actions } = useAppState();

  const [filterMode, setFilterMode] = useState<'all' | 'unread' | 'reviewers'>('all');
  const [selectedThreadId, setSelectedThreadId] = useState<string>(
    requestedThreadId || state.threads[0]?.id || ''
  );
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (requestedThreadId) {
      setSelectedThreadId(requestedThreadId);
    }
  }, [requestedThreadId]);

  const companyMap = useMemo(
    () => new Map(state.companies.map((c) => [c.id, c])),
    [state.companies]
  );

  const postMap = useMemo(() => new Map(state.posts.map((p) => [p.id, p])), [state.posts]);

  const firstJobByCompany = useMemo(() => {
    const map = new Map<string, string>();
    for (const job of derived.canonicalJobs) {
      if (!map.has(job.companyId)) {
        map.set(job.companyId, job.id);
      }
    }
    return map;
  }, [derived.canonicalJobs]);

  const visibleThreads = useMemo(() => {
    return state.threads.filter((t) => {
      if (filterMode === 'unread') {
        return t.unreadCount > 0;
      }
      if (filterMode === 'reviewers') {
        return t.peerHasReviewed;
      }
      return true;
    });
  }, [state.threads, filterMode]);

  const activeThread =
    state.threads.find((t) => t.id === selectedThreadId) ?? visibleThreads[0] ?? null;

  useEffect(() => {
    if (activeThread && activeThread.unreadCount > 0) {
      actions.markThreadRead(activeThread.id);
    }
  }, [activeThread?.id, activeThread?.unreadCount, actions]);

  const contextCompany = activeThread?.contextCompanyId
    ? companyMap.get(activeThread.contextCompanyId)
    : undefined;
  const contextPost = activeThread?.contextPostId
    ? postMap.get(activeThread.contextPostId)
    : undefined;
  const contextJobId = contextCompany ? firstJobByCompany.get(contextCompany.id) : undefined;

  const handleSelectThread = (threadId: string) => {
    setSelectedThreadId(threadId);
    setSearchParams({ threadId }, { replace: true });
  };

  const handleSend = (includeProfileCard = false) => {
    if (!activeThread) {
      return;
    }
    if (!draft.trim() && !includeProfileCard) {
      return;
    }
    actions.sendChatMessage(activeThread.id, {
      text: draft,
      includeProfileCard,
    });
    setDraft('');
  };

  return (
    <Stack gap="md">
      <Stack gap={2}>
        <Title order={1} size="h2">
          Nhắn tin Cộng đồng giữa Sinh viên (MH-05)
        </Title>
        <Text size="sm" c="dimmed">
          Hỏi trực tiếp người đã từng làm việc về môi trường, lương thực nhận hoặc gửi nhanh thẻ hồ
          sơ kết nối đi làm cùng.
        </Text>
      </Stack>

      <Grid gap="md">
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card p="sm">
            <Stack gap="sm">
              <SegmentedControl
                size="xs"
                fullWidth
                value={filterMode}
                onChange={(v) => setFilterMode(v as 'all' | 'unread' | 'reviewers')}
                data={[
                  { value: 'all', label: 'Tất cả' },
                  { value: 'unread', label: 'Chưa đọc' },
                  { value: 'reviewers', label: 'Đã đánh giá' },
                ]}
              />

              <Stack gap="xs">
                {visibleThreads.length === 0 ? (
                  <Text size="xs" c="dimmed" ta="center" py="md">
                    Không có hội thoại nào khớp bộ lọc.
                  </Text>
                ) : (
                  visibleThreads.map((thread) => (
                    <ThreadListItem
                      key={thread.id}
                      thread={thread}
                      isActive={activeThread?.id === thread.id}
                      onSelect={() => handleSelectThread(thread.id)}
                    />
                  ))
                )}
              </Stack>
            </Stack>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 8 }}>
          {activeThread ? (
            <Card p="md">
              <Stack gap="sm">
                <Group justify="space-between" wrap="wrap">
                  <Group gap="xs">
                    <Avatar color="brand" radius="xl">
                      {activeThread.peerName.slice(0, 1)}
                    </Avatar>
                    <Stack gap={0}>
                      <Group gap="xs">
                        <Text fw={700}>{activeThread.peerName}</Text>
                        {activeThread.peerHasReviewed ? (
                          <Badge
                            size="xs"
                            color="success"
                            leftSection={<IconShieldCheck size={11} />}
                          >
                            Người đã đánh giá
                          </Badge>
                        ) : null}
                      </Group>
                      <Text size="xs" c="dimmed">
                        {activeThread.peerRoleLabel}
                      </Text>
                    </Stack>
                  </Group>
                </Group>

                {contextCompany || contextPost ? (
                  <Card p="xs" bg="var(--app-bg-subtle)">
                    <Group justify="space-between" wrap="wrap" gap="xs">
                      <Stack gap={2} flex={1}>
                        <Text size="xs" fw={700} c="brand">
                          Ngữ cảnh đang thảo luận
                        </Text>
                        {contextPost ? (
                          <Text size="xs" lineClamp={1}>
                            Bài viết: {contextPost.title}
                          </Text>
                        ) : null}
                        {contextCompany ? (
                          <Text size="xs" c="dimmed">
                            Cơ sở: {contextCompany.name} • {contextCompany.trustScore.toFixed(1)} ★
                          </Text>
                        ) : null}
                      </Stack>
                      {contextCompany ? (
                        <Button
                          component={Link}
                          to={contextJobId ? `/jobs/${contextJobId}` : '/'}
                          size="xs"
                          variant="light"
                          leftSection={<IconBuildingStore size={14} />}
                        >
                          Xem công ty (MH-03)
                        </Button>
                      ) : null}
                    </Group>
                  </Card>
                ) : null}

                <Divider />

                <ScrollArea h={320} offsetScrollbars>
                  <Stack gap="sm" pr="xs">
                    {activeThread.messages.length === 0 ? (
                      <Text size="xs" c="dimmed" ta="center" py="xl">
                        Hãy gửi lời chào hoặc đính kèm thẻ hồ sơ cá nhân để hỏi kinh nghiệm đi làm
                        tại cơ sở này.
                      </Text>
                    ) : (
                      activeThread.messages.map((msg) => <MessageBubble key={msg.id} msg={msg} />)
                    )}
                  </Stack>
                </ScrollArea>

                <Divider />

                <Stack gap="xs">
                  <Group justify="space-between" wrap="wrap">
                    <Button
                      size="xs"
                      variant="light"
                      color="success"
                      leftSection={<IconIdBadge2 size={15} />}
                      onClick={() => handleSend(true)}
                    >
                      Gửi nhanh thẻ hồ sơ cá nhân (MH-02)
                    </Button>
                    <Text size="xs" c="dimmed">
                      Đính kèm tự động tên, trường học & kỹ năng
                    </Text>
                  </Group>

                  <Group gap="xs" wrap="nowrap">
                    <TextInput
                      flex={1}
                      placeholder="Nhập tin nhắn trao đổi kinh nghiệm..."
                      value={draft}
                      onChange={(e) => setDraft(e.currentTarget.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleSend(false);
                        }
                      }}
                    />
                    <Button leftSection={<IconSend size={15} />} onClick={() => handleSend(false)}>
                      Gửi
                    </Button>
                  </Group>
                </Stack>
              </Stack>
            </Card>
          ) : (
            <Card p="xl">
              <Text size="sm" c="dimmed" ta="center">
                Chọn một cuộc trò chuyện bên trái để xem nội dung.
              </Text>
            </Card>
          )}
        </Grid.Col>
      </Grid>
    </Stack>
  );
}
