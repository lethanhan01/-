import { useEffect, useState } from 'react';
import {
  IconAlertCircle,
  IconArrowRight,
  IconLock,
  IconMail,
  IconPhone,
  IconSchool,
  IconUser,
  IconUserPlus,
} from '@tabler/icons-react';
import { useLocation } from 'react-router-dom';
import {
  Alert,
  Anchor,
  Box,
  Button,
  Card,
  Checkbox,
  Group,
  PasswordInput,
  Select,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { isEmail, isNotEmpty, useForm } from '@mantine/form';
import { UNIVERSITY_OPTIONS } from '../data/authMockData';
import { useAuthMock } from '../state/AuthMockContext';
import classes from './AuthPage.module.css';

export type AuthTabMode = 'login' | 'register';

interface LoginFormValues {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface RegisterFormValues {
  fullName: string;
  email: string;
  phone: string;
  university: string;
  major: string;
  password: string;
  confirmPassword: string;
  agreeTerms: boolean;
}

export function AuthPage({ defaultTab }: { defaultTab?: AuthTabMode }) {
  const location = useLocation();
  const { login, register } = useAuthMock();

  const resolvedInitialTab: AuthTabMode =
    defaultTab ?? (location.pathname.includes('register') ? 'register' : 'login');

  const [activeTab, setActiveTab] = useState<AuthTabMode>(resolvedInitialTab);
  const [authBannerError, setAuthBannerError] = useState<string | null>(null);

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
      return;
    }
    if (location.pathname.includes('register')) {
      setActiveTab('register');
    } else if (location.pathname.includes('login')) {
      setActiveTab('login');
    }
  }, [defaultTab, location.pathname]);

  const loginForm = useForm<LoginFormValues>({
    mode: 'uncontrolled',
    initialValues: {
      email: '',
      password: '',
      rememberMe: true,
    },
    validate: {
      email: isEmail('Vui lòng nhập đúng định dạng email'),
      password: (value) => (value.trim().length < 6 ? 'Mật khẩu cần tối thiểu 6 ký tự' : null),
    },
  });

  const registerForm = useForm<RegisterFormValues>({
    mode: 'uncontrolled',
    initialValues: {
      fullName: '',
      email: '',
      phone: '',
      university: UNIVERSITY_OPTIONS[0],
      major: '',
      password: '',
      confirmPassword: '',
      agreeTerms: false,
    },
    validate: {
      fullName: isNotEmpty('Vui lòng nhập họ và tên'),
      email: isEmail('Email sinh viên không đúng định dạng'),
      phone: (value) =>
        /^0\d{9,10}$/.test(value.trim()) ? null : 'Số điện thoại cần 10-11 chữ số bắt đầu bằng 0',
      university: isNotEmpty('Vui lòng chọn trường đại học'),
      password: (value) => (value.length < 6 ? 'Mật khẩu phải có ít nhất 6 ký tự' : null),
      confirmPassword: (value, values) =>
        value !== values.password ? 'Mật khẩu nhập lại không khớp' : null,
      agreeTerms: (value) => (value ? null : 'Bạn cần đồng ý điều khoản cộng đồng sinh viên'),
    },
  });

  const handleTabChange = (value: string | null) => {
    if (value === 'login' || value === 'register') {
      setActiveTab(value);
      setAuthBannerError(null);
    }
  };

  const handleLoginSubmit = (values: LoginFormValues) => {
    setAuthBannerError(null);
    const res = login(values.email, values.password, values.rememberMe);
    if (!res.ok) {
      if (res.fieldError && res.fieldError.field !== 'confirmPassword') {
        loginForm.setFieldError(res.fieldError.field, res.fieldError.message);
      }
      setAuthBannerError(res.message ?? 'Đăng nhập thất bại');
    }
  };

  const handleRegisterSubmit = (values: RegisterFormValues) => {
    setAuthBannerError(null);
    const res = register({
      fullName: values.fullName,
      email: values.email,
      phone: values.phone,
      university: values.university,
      major: values.major,
      password: values.password,
      confirmPassword: values.confirmPassword,
    });
    if (!res.ok) {
      if (res.fieldError) {
        registerForm.setFieldError(res.fieldError.field, res.fieldError.message);
      }
      setAuthBannerError(res.message ?? 'Đăng ký thất bại');
    }
  };

  return (
    <Stack className={classes.pageRoot} gap="md">
      <Stack gap={4} align="center">
        <Title order={1} size="h3">
          PartTime Tin Cậy
        </Title>
        <Text size="sm" c="dimmed" ta="center">
          Đăng nhập hoặc tạo tài khoản để tiếp tục
        </Text>
      </Stack>
      <Card p="lg" radius="lg">
        <Stack gap="md">
          <Tabs value={activeTab} onChange={handleTabChange} keepMounted={false}>
            <Tabs.List grow>
              <Tabs.Tab value="login" leftSection={<IconUser size={16} />}>
                Đăng nhập
              </Tabs.Tab>
              <Tabs.Tab value="register" leftSection={<IconUserPlus size={16} />}>
                Đăng ký tài khoản
              </Tabs.Tab>
            </Tabs.List>

            {authBannerError ? (
              <Alert
                mt="md"
                color="danger"
                icon={<IconAlertCircle size={16} />}
                title="Kiểm tra lại thông tin"
              >
                {authBannerError}
              </Alert>
            ) : null}

            <Tabs.Panel value="login" pt="md">
              <Box component="form" onSubmit={loginForm.onSubmit(handleLoginSubmit)} noValidate>
                <Stack gap="sm">
                  <TextInput
                    withAsterisk
                    label="Email sinh viên"
                    placeholder="email@truong.edu.vn"
                    leftSection={<IconMail size={16} />}
                    key={loginForm.key('email')}
                    {...loginForm.getInputProps('email')}
                  />

                  <PasswordInput
                    withAsterisk
                    label="Mật khẩu"
                    placeholder="Nhập mật khẩu"
                    leftSection={<IconLock size={16} />}
                    key={loginForm.key('password')}
                    {...loginForm.getInputProps('password')}
                  />

                  <Group justify="space-between" wrap="wrap">
                    <Checkbox
                      label="Ghi nhớ phiên đăng nhập"
                      key={loginForm.key('rememberMe')}
                      {...loginForm.getInputProps('rememberMe', { type: 'checkbox' })}
                    />
                    <Anchor
                      component="button"
                      type="button"
                      size="xs"
                      onClick={() => handleTabChange('register')}
                    >
                      Chưa có tài khoản? Đăng ký ngay
                    </Anchor>
                  </Group>

                  <Button
                    type="submit"
                    fullWidth
                    mt="xs"
                    rightSection={<IconArrowRight size={16} />}
                  >
                    Đăng nhập
                  </Button>
                </Stack>
              </Box>
            </Tabs.Panel>

            <Tabs.Panel value="register" pt="md">
              <Box
                component="form"
                onSubmit={registerForm.onSubmit(handleRegisterSubmit)}
                noValidate
              >
                <Stack gap="sm">
                  <TextInput
                    withAsterisk
                    label="Họ và tên"
                    placeholder="VD: Lê Minh Tuấn"
                    leftSection={<IconUser size={16} />}
                    key={registerForm.key('fullName')}
                    {...registerForm.getInputProps('fullName')}
                  />

                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                    <TextInput
                      withAsterisk
                      label="Email"
                      placeholder="tuan@uit.edu.vn"
                      leftSection={<IconMail size={16} />}
                      key={registerForm.key('email')}
                      {...registerForm.getInputProps('email')}
                    />
                    <TextInput
                      withAsterisk
                      label="Số điện thoại"
                      placeholder="0901234567"
                      leftSection={<IconPhone size={16} />}
                      key={registerForm.key('phone')}
                      {...registerForm.getInputProps('phone')}
                    />
                  </SimpleGrid>

                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                    <Select
                      withAsterisk
                      label="Trường đại học"
                      leftSection={<IconSchool size={16} />}
                      data={UNIVERSITY_OPTIONS}
                      key={registerForm.key('university')}
                      {...registerForm.getInputProps('university')}
                    />
                    <TextInput
                      label="Ngành học"
                      placeholder="VD: Công nghệ thông tin"
                      key={registerForm.key('major')}
                      {...registerForm.getInputProps('major')}
                    />
                  </SimpleGrid>

                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                    <PasswordInput
                      withAsterisk
                      label="Mật khẩu"
                      placeholder="Tối thiểu 6 ký tự"
                      leftSection={<IconLock size={16} />}
                      key={registerForm.key('password')}
                      {...registerForm.getInputProps('password')}
                    />
                    <PasswordInput
                      withAsterisk
                      label="Nhập lại mật khẩu"
                      placeholder="Nhập lại mật khẩu"
                      leftSection={<IconLock size={16} />}
                      key={registerForm.key('confirmPassword')}
                      {...registerForm.getInputProps('confirmPassword')}
                    />
                  </SimpleGrid>

                  <Checkbox
                    label="Tôi cam kết đánh giá trung thực và tuân thủ quy định cộng đồng sinh viên"
                    key={registerForm.key('agreeTerms')}
                    {...registerForm.getInputProps('agreeTerms', { type: 'checkbox' })}
                  />

                  <Button
                    type="submit"
                    color="success"
                    fullWidth
                    mt="xs"
                    leftSection={<IconUserPlus size={16} />}
                  >
                    Tạo tài khoản
                  </Button>

                  <Group justify="center">
                    <Anchor
                      component="button"
                      type="button"
                      size="xs"
                      onClick={() => handleTabChange('login')}
                    >
                      Đã có tài khoản? Quay lại Đăng nhập
                    </Anchor>
                  </Group>
                </Stack>
              </Box>
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </Card>
    </Stack>
  );
}
