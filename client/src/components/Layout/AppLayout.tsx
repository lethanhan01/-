import {
  IconAward,
  IconLogin,
  IconLogout,
  IconMapPin,
  IconMessageCircle,
  IconMoon,
  IconRefresh,
  IconShieldCheck,
  IconSun,
  IconUser,
  IconUsers,
} from '@tabler/icons-react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import {
  ActionIcon,
  AppShell,
  Badge,
  Box,
  Button,
  Group,
  NavLink,
  Paper,
  Select,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
  useMantineColorScheme,
} from '@mantine/core';
import { modals } from '@mantine/modals';
import { ANCHOR_ZONES } from '../../data/seedData';
import { useAppState } from '../../state/AppStateContext';
import { useAuthMock } from '../../state/AuthMockContext';
import classes from './AppLayout.module.css';

const NAV_ITEMS = [
  { label: 'Bản đồ việc làm', shortLabel: 'Bản đồ', to: '/', icon: IconMapPin },
  { label: 'Mạng xã hội & Đánh giá', shortLabel: 'Cộng đồng', to: '/community', icon: IconUsers },
  { label: 'Nhắn tin Cộng đồng', shortLabel: 'Nhắn tin', to: '/messages', icon: IconMessageCircle },
  { label: 'Hồ sơ & Lịch rảnh', shortLabel: 'Hồ sơ', to: '/profile', icon: IconUser },
  { label: 'Đăng nhập / Đăng ký', shortLabel: 'Tài khoản', to: '/auth', icon: IconLogin },
] as const;

export function AppLayout() {
  const location = useLocation();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const { state, derived, actions } = useAppState();
  const { currentUser, isAuthenticated, logout } = useAuthMock();

  const isRouteActive = (to: string) => {
    if (to === '/') {
      return location.pathname === '/' || location.pathname.startsWith('/jobs');
    }
    if (to === '/auth') {
      return (
        location.pathname.startsWith('/auth') ||
        location.pathname.startsWith('/login') ||
        location.pathname.startsWith('/register')
      );
    }
    return location.pathname.startsWith(to);
  };

  const handleResetDemo = () => {
    modals.openConfirmModal({
      title: 'Khôi phục dữ liệu mẫu?',
      children: (
        <Text size="sm">
          Toàn bộ đơn ứng tuyển, bài viết, tin nhắn và chỉnh sửa lịch rảnh sẽ trở về dữ liệu mẫu ban
          đầu.
        </Text>
      ),
      labels: { confirm: 'Khôi phục ngay', cancel: 'Hủy' },
      confirmProps: { color: 'brand' },
      onConfirm: () => actions.resetDemoData(),
    });
  };

  return (
    <AppShell
      header={{ height: 62 }}
      navbar={{ width: 248, breakpoint: 'sm', collapsed: { mobile: true } }}
      padding="md"
    >
      <AppShell.Header px="md">
        <Group h="100%" justify="space-between" wrap="nowrap">
          <Group gap="xs" wrap="nowrap">
            <Button
              component={Link}
              to="/"
              variant="subtle"
              color="brand"
              px="xs"
              leftSection={<IconShieldCheck size={22} />}
            >
              <Text fw={700} size="md">
                PartTime Tin Cậy
              </Text>
            </Button>
          </Group>

          <Group gap="xs" wrap="nowrap">
            <Select
              aria-label="Khu vực sinh sống"
              size="xs"
              w={{ base: 145, sm: 205 }}
              leftSection={<IconMapPin size={14} />}
              data={ANCHOR_ZONES.map((z) => ({ value: z.id, label: z.label }))}
              value={state.profile.anchorZoneId}
              onChange={(val) => {
                if (val) {
                  actions.setAnchorZone(val);
                }
              }}
              allowDeselect={false}
            />

            <Tooltip label="Điểm uy tín tích lũy của bạn">
              <Badge
                component={Link}
                to="/profile?tab=history"
                color="brand"
                variant="light"
                leftSection={<IconAward size={13} />}
                visibleFrom="sm"
                className="app-tabular"
              >
                {state.profile.reputationPoints} điểm
              </Badge>
            </Tooltip>

            <Tooltip label="Khôi phục dữ liệu mẫu">
              <ActionIcon
                variant="default"
                size="md"
                aria-label="Khôi phục dữ liệu mẫu"
                onClick={handleResetDemo}
              >
                <IconRefresh size={17} />
              </ActionIcon>
            </Tooltip>

            <Tooltip
              label={colorScheme === 'dark' ? 'Chuyển giao diện sáng' : 'Chuyển giao diện tối'}
            >
              <ActionIcon
                variant="default"
                size="md"
                aria-label="Đổi chế độ màu sáng tối"
                onClick={() => toggleColorScheme()}
              >
                {colorScheme === 'dark' ? <IconSun size={17} /> : <IconMoon size={17} />}
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="sm">
        <Stack gap="xs" justify="space-between" h="100%">
          <Stack gap={6}>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isRouteActive(item.to);
              return (
                <NavLink
                  key={item.to}
                  component={Link}
                  to={item.to}
                  active={active}
                  label={item.label}
                  leftSection={<Icon size={18} />}
                  rightSection={
                    item.to === '/messages' && derived.unreadMessagesCount > 0 ? (
                      <Badge size="xs" color="danger" variant="filled">
                        {derived.unreadMessagesCount}
                      </Badge>
                    ) : null
                  }
                />
              );
            })}
          </Stack>

          <Paper withBorder p="sm" radius="md" bg="var(--app-bg-subtle)">
            <Stack gap={4}>
              <Text size="xs" fw={600}>
                {currentUser ? currentUser.fullName : state.profile.fullName}
              </Text>
              <Text size="xs" c="dimmed" lineClamp={1}>
                {currentUser ? currentUser.university : state.profile.university}
              </Text>
              <Group gap="xs" mt={4}>
                <Badge size="xs" color={isAuthenticated ? 'success' : 'neutral'}>
                  {isAuthenticated ? 'Đã đăng nhập' : 'Chế độ xem mẫu'}
                </Badge>
                <Badge size="xs" color="brand">
                  {state.profile.reputationPoints}đ uy tín
                </Badge>
              </Group>
              {isAuthenticated ? (
                <Button
                  size="xs"
                  variant="subtle"
                  color="danger"
                  mt={4}
                  leftSection={<IconLogout size={13} />}
                  onClick={logout}
                >
                  Đăng xuất
                </Button>
              ) : (
                <Button
                  component={Link}
                  to="/auth"
                  size="xs"
                  variant="light"
                  color="brand"
                  mt={4}
                  leftSection={<IconLogin size={13} />}
                >
                  Đăng nhập / Đăng ký
                </Button>
              )}
            </Stack>
          </Paper>
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main className="app-main-content">
        <Outlet />
      </AppShell.Main>

      <Box
        component="nav"
        aria-label="Điều hướng chính"
        hiddenFrom="sm"
        className={classes.mobileBottomNav}
      >
        <Group h="100%" grow gap={0}>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isRouteActive(item.to);
            return (
              <UnstyledButton
                key={item.to}
                component={Link}
                to={item.to}
                h="100%"
                className={classes.mobileNavItem}
                mod={{ active }}
                aria-current={active ? 'page' : undefined}
              >
                <Stack align="center" justify="center" gap={2} h="100%">
                  <Group gap={4} wrap="nowrap">
                    <Icon size={20} />
                    {item.to === '/messages' && derived.unreadMessagesCount > 0 ? (
                      <Badge size="xs" color="danger" variant="filled" px={4}>
                        {derived.unreadMessagesCount}
                      </Badge>
                    ) : null}
                  </Group>
                  <Text size="xs" fw={active ? 700 : 500} c={active ? 'brand' : 'dimmed'}>
                    {item.shortLabel}
                  </Text>
                </Stack>
              </UnstyledButton>
            );
          })}
        </Group>
      </Box>
    </AppShell>
  );
}
