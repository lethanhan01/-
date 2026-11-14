# Hướng dẫn Setup, Theme, Forms & Hooks (`v9.8`)

Tài liệu này tóm tắt cấu hình nền tảng trong `client/`, pattern chuẩn Mantine v9 cho **Form (`@mantine/form`)**, **Hooks (`@mantine/hooks`)**, và hướng dẫn cài đặt theo nhu cầu các package mở rộng.

---

## 1. Setup, CSS Import Order & Theme

### Thứ tự import CSS (`client/src/App.tsx`)

`@mantine/core/styles.css` **luôn phải đứng đầu tiên**, trước CSS của package mở rộng và trước toàn bộ `*.module.css` / Router:

```tsx
// Thứ tự chuẩn khi có thêm package mở rộng:
import '@mantine/core/styles.css';
// import '@mantine/dates/styles.css';
// import '@mantine/notifications/styles.css';
// import '@mantine/tiptap/styles.css';

import { MantineProvider } from '@mantine/core';
import { Router } from './Router';
import { theme } from './theme';
```

### Theme tập trung (`client/src/theme.ts`)

Đưa cấu hình lặp lại nhiều nơi (màu chủ đạo, radius mặc định, font, `defaultProps` của component) vào `createTheme` thay vì lặp lại trên từng trang:

```ts
import { Button, createTheme } from '@mantine/core';

export const theme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'md',
  components: {
    Button: Button.extend({
      defaultProps: {
        fw: 600,
      },
    }),
  },
});
```

### Color Scheme (Light / Dark / Auto)

- Sử dụng `useMantineColorScheme()` để đổi chế độ sáng/tối (xem mẫu [ColorSchemeToggle.tsx](../../client/src/components/ColorSchemeToggle/ColorSchemeToggle.tsx)).
- Trong CSS Modules, luôn ưu tiên `light-dark(...)` hoặc biến semantic (`--mantine-color-body`, `--mantine-color-text`).
- Tham khảo thêm về `ColorSchemeScript` (hiện đã gắn trong [client/.storybook/preview.tsx](../../client/.storybook/preview.tsx)) tại [`https://mantine.dev/theming/color-schemes/`](https://mantine.dev/theming/color-schemes/).

---

## 2. Hướng dẫn sử dụng Forms (`@mantine/form`)

> **Lưu ý cài đặt**: `@mantine/form` chưa cài sẵn trong `client/package.json`. Khi bắt đầu xây dựng form, chạy trong `client/`:
> ```powershell
> yarn add @mantine/form
> ```
> Tài liệu gốc đầy đủ: [`https://mantine.dev/form/use-form/`](https://mantine.dev/form/use-form/)

### Chuẩn Mantine v9: `mode: 'uncontrolled'` + `form.key()`

- Ưu tiên `mode: 'uncontrolled'` để tránh re-render toàn form mỗi lần gõ phím.
- Mỗi input gắn `key={form.key('path')}` và `{...form.getInputProps('path')}`.
- Wrapper form luôn dùng `<Box component="form" onSubmit={form.onSubmit(...)}>` (tuân thủ rule không dùng raw HTML `<form>`).

```tsx
import { Box, Button, Checkbox, Group, PasswordInput, Stack, TextInput } from '@mantine/core';
import { isEmail, isNotEmpty, useForm } from '@mantine/form';

interface LoginValues {
  email: string;
  password: string;
  rememberMe: boolean;
}

export function LoginForm({ onSubmit }: { onSubmit: (values: LoginValues) => Promise<void> }) {
  const form = useForm<LoginValues>({
    mode: 'uncontrolled',
    initialValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
    validate: {
      email: isEmail('Email không hợp lệ'),
      password: isNotEmpty('Vui lòng nhập mật khẩu'),
    },
  });

  return (
    <Box component="form" onSubmit={form.onSubmit(onSubmit)} noValidate>
      <Stack gap="md">
        <TextInput
          withAsterisk
          label="Email"
          placeholder="you@example.com"
          key={form.key('email')}
          {...form.getInputProps('email')}
        />

        <PasswordInput
          withAsterisk
          label="Mật khẩu"
          key={form.key('password')}
          {...form.getInputProps('password')}
        />

        <Checkbox
          label="Ghi nhớ đăng nhập"
          key={form.key('rememberMe')}
          {...form.getInputProps('rememberMe', { type: 'checkbox' })}
        />

        <Group justify="flex-end" mt="xs">
          <Button type="submit" loading={form.submitting}>
            Đăng nhập
          </Button>
        </Group>
      </Stack>
    </Box>
  );
}
```

### Các tính năng Form hay dùng & Nơi tra cứu trên `mantine.dev`

| Tính năng | API chính | Tài liệu `mantine.dev` |
|---|---|---|
| Built-in validators | `isNotEmpty`, `isEmail`, `hasLength`, `isInRange`, `matches` | [`/form/validators/`](https://mantine.dev/form/validators/) |
| Schema validation (Zod / Valibot) | `schemaResolver(schema, { sync: true })` | [`/form/schema-validation/`](https://mantine.dev/form/schema-validation/) |
| Lỗi từ API server & trạng thái | `form.setFieldError`, `form.setErrors`, `form.isDirty()`, `form.reset()` | [`/form/errors/`](https://mantine.dev/form/errors/) |
| Dynamic lists / Nested fields | `form.insertListItem`, `form.removeListItem`, `form.reorderListItem` | [`/form/nested/`](https://mantine.dev/form/nested/) |
| Chia nhỏ form nhiều tầng | `createFormContext<Values>()` (`FormProvider`, `useFormContext`) | [`/form/create-form-context/`](https://mantine.dev/form/create-form-context/) |
| Theo dõi giá trị ở uncontrolled mode | `form.watch('field', ({ value }) => ...)` hoặc `form.getValues()` | [`/form/values/`](https://mantine.dev/form/values/) |

---

## 3. Hướng dẫn sử dụng Hooks (`@mantine/hooks` `9.8.0`)

Package `@mantine/hooks` đã cài sẵn. Trước khi tự viết state helper hoặc `useEffect` lắng nghe DOM/window, kiểm tra bảng dưới đây hoặc tra [`https://mantine.dev/hooks/package/`](https://mantine.dev/hooks/package/):

| Nhóm | Hook tiêu biểu | Dùng khi nào |
|---|---|---|
| **State & UI** | `useDisclosure`, `useToggle`, `useListState`, `usePagination`, `useCounter` | Đóng/mở `Modal`/`Drawer`/`Popover`, quản lý mảng item, phân trang |
| **Responsive & DOM** | `useMediaQuery`, `useMatches` *(từ `@mantine/core`)*, `useClickOutside`, `useElementSize`, `useIntersection`, `useFocusTrap` | Kiểm tra breakpoint, click ngoài dropdown, đo kích thước/scroll vào viewport |
| **Timing** | `useDebouncedValue`, `useDebouncedCallback`, `useThrottledValue`, `useInterval` | Search input debounce, throttle scroll/resize |
| **Browser & Storage** | `useLocalStorage`, `useClipboard`, `useHotkeys`, `useDocumentTitle`, `useNetwork` | Lưu preference, nút copy, phím tắt bàn phím |

### 3 Pattern thực chiến hay dùng nhất

```tsx
// 1. Modal / Drawer với useDisclosure
import { Button, Modal, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';

function ModalExample() {
  const [opened, { open, close }] = useDisclosure(false);
  return (
    <>
      <Modal opened={opened} onClose={close} title="Xác nhận">
        <Text size="sm">Nội dung hộp thoại</Text>
      </Modal>
      <Button onClick={open}>Mở hộp thoại</Button>
    </>
  );
}
```

```tsx
// 2. Search input với useDebouncedValue
import { useState } from 'react';
import { TextInput } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';

function SearchBox() {
  const [value, setValue] = useState('');
  const [debounced] = useDebouncedValue(value, 300);
  // Dùng `debounced` để gọi API / lọc danh sách
  return (
    <TextInput
      label="Tìm kiếm"
      value={value}
      onChange={(e) => setValue(e.currentTarget.value)}
    />
  );
}
```

```tsx
// 3. Responsive prop/giá trị theo breakpoint với useMatches
import { useMatches } from '@mantine/core'; // hoặc useMediaQuery từ @mantine/hooks

const columns = useMatches({ base: 1, sm: 2, lg: 4 });
```

---

## 4. Cài đặt Package mở rộng (Install On-Demand)

Chỉ chạy `yarn add` trong `client/` khi tính năng thực sự cần:

| Nhu cầu | Lệnh `yarn add` (trong `client/`) | Tích hợp bắt buộc | Tài liệu |
|---|---|---|---|
| **Icons** | `yarn add @tabler/icons-react` *(hoặc `@phosphor-icons/react`)* | Thống nhất 1 thư viện icon toàn dự án; chỉnh size theo theme/rem | [`/guides/icons/`](https://mantine.dev/guides/icons/) |
| **Toast Notifications** | `yarn add @mantine/notifications` | Import `@mantine/notifications/styles.css` sau core CSS; gắn `<Notifications />` trong `MantineProvider` | [`/x/notifications/`](https://mantine.dev/x/notifications/) |
| **Confirm / Promise Modals** | `yarn add @mantine/modals` | Bọc `<ModalsProvider>` trong `MantineProvider`; gọi `modals.openConfirmModal` | [`/x/modals/`](https://mantine.dev/x/modals/) |
| **Date / Time Pickers** | `yarn add @mantine/dates dayjs` | Import `@mantine/dates/styles.css` sau core CSS; bọc `<DatesProvider>` nếu cấu hình locale | [`/dates/getting-started/`](https://mantine.dev/dates/getting-started/) |
| **Charts** | `yarn add @mantine/charts recharts` | Import `@mantine/charts/styles.css` | [`/charts/getting-started/`](https://mantine.dev/charts/getting-started/) |
| **Command Palette (`Ctrl+K`)** | `yarn add @mantine/spotlight` | Import `@mantine/spotlight/styles.css` | [`/x/spotlight/`](https://mantine.dev/x/spotlight/) |
| **File Dropzone** | `yarn add @mantine/dropzone` | Import `@mantine/dropzone/styles.css` | [`/x/dropzone/`](https://mantine.dev/x/dropzone/) |
