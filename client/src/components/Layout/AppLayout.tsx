import {
  IconCalendarTime,
  IconHistory,
  IconLayoutSidebarLeftCollapse,
  IconLayoutSidebarLeftExpand,
  IconLogout,
  IconMapPin,
  IconMoon,
  IconRefresh,
  IconShieldCheck,
  IconSun,
  IconUser,
  IconUsers,
} from '@tabler/icons-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  ActionIcon,
  AppShell,
  Avatar,
  Badge,
  Box,
  Button,
  Group,
  Menu,
  NavLink,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
  useMantineColorScheme,
} from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { useAppState } from '../../state/AppStateContext';
import { useAuthMock } from '../../state/AuthMockContext';
import classes from './AppLayout.module.css';

const NAV_ITEMS = [
  { label: 'Bản đồ việc làm', shortLabel: 'Bản đồ', to: '/', icon: IconMapPin },
  {
    label: 'Mạng xã hội',
    shortLabel: 'Cộng đồng',
    to: '/community',
    icon: IconUsers,
  },
  //{ label: 'Nhắn tin Cộng đồng', shortLabel: 'Nhắn tin', to: '/messages', icon: IconMessageCircle },
  {
    label: 'Hồ sơ',
    shortLabel: 'Hồ sơ',
    to: '/profile',
    icon: IconUser,
  },
] as const;

const PROFILE_MENU_ITEMS = [
  { tab: 'profile', label: 'Hồ sơ', icon: IconUser },
  { tab: 'schedule', label: 'Lịch rảnh', icon: IconCalendarTime },
  { tab: 'history', label: 'Lịch sử hoạt động', icon: IconHistory },
] as const;

function isRouteActive(pathname: string, to: string): boolean {
  if (to === '/') {
    return pathname === '/' || pathname.startsWith('/jobs');
  }
  return pathname.startsWith(to);
}

function resolveProfileTab(pathname: string, search: string): string | null {
  if (!pathname.startsWith('/profile')) {
    return null;
  }
  return new URLSearchParams(search).get('tab') || 'profile';
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const { state, actions } = useAppState();
  const { currentUser, logout } = useAuthMock();
  const [sidebarCollapsed, setSidebarCollapsed] = useLocalStorage<boolean>({
    key: 'svjob_sidebar_collapsed_v1',
    defaultValue: false,
  });

  const activeUser = currentUser ?? state.profile;
  const displayName = activeUser.fullName;
  const displayUniversity = activeUser.university;
  const avatarInitial = displayName.trim().slice(0, 1).toUpperCase() || 'U';
  const currentProfileTab = resolveProfileTab(location.pathname, location.search);
  const isDark = colorScheme === 'dark';

  const handleLogout = () => {
    logout();
    void navigate('/login', { replace: true });
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

  const toggleSidebarLabel = sidebarCollapsed
    ? 'Mở rộng thanh điều hướng'
    : 'Thu gọn thanh điều hướng';

  return (
    <AppShell
      header={{ height: 62 }}
      navbar={{
        width: sidebarCollapsed ? 68 : 248,
        breakpoint: 'sm',
        collapsed: { mobile: true },
      }}
      padding="md"
      transitionDuration={200}
      transitionTimingFunction="ease"
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

            <Tooltip label={isDark ? 'Chuyển giao diện sáng' : 'Chuyển giao diện tối'}>
              <ActionIcon
                variant="default"
                size="md"
                aria-label="Đổi chế độ màu sáng tối"
                onClick={() => toggleColorScheme()}
              >
                {isDark ? <IconSun size={17} /> : <IconMoon size={17} />}
              </ActionIcon>
            </Tooltip>

            <Menu position="bottom-end" width={250} shadow="md">
              <Menu.Target>
                <ActionIcon
                  variant="subtle"
                  color="brand"
                  radius="xl"
                  size="lg"
                  aria-label="Tài khoản người dùng"
                >
                  <Avatar size="sm" radius="xl" color="brand">
                    {avatarInitial}
                  </Avatar>
                </ActionIcon>
              </Menu.Target>

              <Menu.Dropdown>
                <Menu.Label>
                  <Stack gap={4}>
                    <Text size="sm" fw={600} c="bright" lineClamp={1}>
                      {displayName}
                    </Text>
                    <Text size="xs" c="dimmed" lineClamp={1}>
                      {displayUniversity}
                    </Text>
                    <Group gap="xs" mt={2}>
                      <Badge size="xs" color="success">
                        Đã đăng nhập
                      </Badge>
                      <Badge size="xs" color="brand" className="app-tabular">
                        {state.profile.reputationPoints}đ uy tín
                      </Badge>
                    </Group>
                  </Stack>
                </Menu.Label>

                <Menu.Divider />

                {PROFILE_MENU_ITEMS.map(({ tab, label, icon: ItemIcon }) => {
                  const isActiveTab = currentProfileTab === tab;
                  return (
                    <Menu.Item
                      key={tab}
                      component={Link}
                      to={`/profile?tab=${tab}`}
                      leftSection={<ItemIcon size={15} />}
                      c={isActiveTab ? 'brand' : undefined}
                      fw={isActiveTab ? 600 : undefined}
                    >
                      {label}
                    </Menu.Item>
                  );
                })}

                <Menu.Divider />

                <Menu.Item c="danger" leftSection={<IconLogout size={15} />} onClick={handleLogout}>
                  Đăng xuất
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p={sidebarCollapsed ? 'xs' : 'sm'}>
        <Stack gap="xs" justify="space-between" h="100%">
          <Stack gap={6}>
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = isRouteActive(location.pathname, item.to);
              return (
                <Tooltip
                  key={item.to}
                  label={item.label}
                  position="right"
                  withArrow
                  disabled={!sidebarCollapsed}
                >
                  <NavLink
                    component={Link}
                    to={item.to}
                    active={active}
                    label={sidebarCollapsed ? undefined : item.label}
                    aria-label={item.label}
                    leftSection={<Icon size={18} />}
                    mod={{ collapsed: sidebarCollapsed }}
                    classNames={{
                      root: classes.navLinkRoot,
                      section: classes.navLinkSection,
                      body: classes.navLinkBody,
                    }}
                  />
                </Tooltip>
              );
            })}
          </Stack>

          <Tooltip
            label={toggleSidebarLabel}
            position="right"
            withArrow
            disabled={!sidebarCollapsed}
          >
            <NavLink
              component="button"
              type="button"
              label={sidebarCollapsed ? undefined : 'Thu gọn'}
              aria-label={toggleSidebarLabel}
              aria-expanded={!sidebarCollapsed}
              leftSection={
                sidebarCollapsed ? (
                  <IconLayoutSidebarLeftExpand size={18} />
                ) : (
                  <IconLayoutSidebarLeftCollapse size={18} />
                )
              }
              onClick={() => setSidebarCollapsed((prev) => !prev)}
              mod={{ collapsed: sidebarCollapsed }}
              classNames={{
                root: classes.navLinkRoot,
                section: classes.navLinkSection,
                body: classes.navLinkBody,
              }}
            />
          </Tooltip>
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
            const active = isRouteActive(location.pathname, item.to);
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
