export interface MockAuthUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  university: string;
  major: string;
  yearLabel: string;
  verifiedStudent: boolean;
}

export interface StoredMockAccount extends MockAuthUser {
  password: string;
}

export const UNIVERSITY_OPTIONS = [
  'ĐH Bách Khoa TP.HCM',
  'ĐH Khoa học Tự nhiên (ĐHQG-HCM)',
  'ĐH Kinh tế TP.HCM (UEH)',
  'ĐH Công nghệ Thông tin (UIT)',
  'ĐH Sư phạm Kỹ thuật TP.HCM',
  'Khác',
];

export const MOCK_STUDENT_ACCOUNTS: StoredMockAccount[] = [
  {
    id: 'student-1',
    fullName: 'Nguyễn Minh Anh',
    email: 'minhanh@hcmut.edu.vn',
    password: '123456',
    phone: '0901234567',
    university: 'ĐH Bách Khoa TP.HCM',
    major: 'Khoa học Máy tính',
    yearLabel: 'Năm 3',
    verifiedStudent: true,
  },
  {
    id: 'student-2',
    fullName: 'Trần Hoàng Nam',
    email: 'hoangnam@ueh.edu.vn',
    password: '123456',
    phone: '0912345678',
    university: 'ĐH Kinh tế TP.HCM (UEH)',
    major: 'Quản trị Kinh doanh',
    yearLabel: 'Năm 2',
    verifiedStudent: true,
  },
];

export interface AuthActionResult {
  ok: boolean;
  user?: MockAuthUser;
  fieldError?: {
    field: 'email' | 'password' | 'confirmPassword';
    message: string;
  };
  message?: string;
}

function toPublicUser(account: StoredMockAccount): MockAuthUser {
  const { password: _password, ...user } = account;
  return user;
}

export function mockLoginWithCredentials(
  emailInput: string,
  passwordInput: string,
  registeredAccounts: StoredMockAccount[]
): AuthActionResult {
  const normalizedEmail = emailInput.trim().toLowerCase();
  const allAccounts = [...MOCK_STUDENT_ACCOUNTS, ...registeredAccounts];
  const matched = allAccounts.find((acc) => acc.email.toLowerCase() === normalizedEmail);

  if (!matched) {
    return {
      ok: false,
      fieldError: {
        field: 'email',
        message: 'Không tìm thấy tài khoản với email này',
      },
      message: 'Email chưa được đăng ký. Vui lòng kiểm tra hoặc tạo tài khoản mới.',
    };
  }

  if (matched.password !== passwordInput) {
    return {
      ok: false,
      fieldError: {
        field: 'password',
        message: 'Mật khẩu không chính xác',
      },
      message: 'Sai mật khẩu đăng nhập.',
    };
  }

  return {
    ok: true,
    user: toPublicUser(matched),
    message: `Chào mừng ${matched.fullName} quay trở lại!`,
  };
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  phone: string;
  university: string;
  major: string;
  password: string;
  confirmPassword: string;
}

export function mockRegisterAccount(
  payload: RegisterPayload,
  registeredAccounts: StoredMockAccount[]
): AuthActionResult & { createdAccount?: StoredMockAccount } {
  const normalizedEmail = payload.email.trim().toLowerCase();
  const allAccounts = [...MOCK_STUDENT_ACCOUNTS, ...registeredAccounts];

  if (allAccounts.some((acc) => acc.email.toLowerCase() === normalizedEmail)) {
    return {
      ok: false,
      fieldError: {
        field: 'email',
        message: 'Email này đã được sử dụng. Vui lòng chọn email khác hoặc đăng nhập.',
      },
      message: 'Email đã tồn tại trong danh sách tài khoản mẫu.',
    };
  }

  if (payload.password !== payload.confirmPassword) {
    return {
      ok: false,
      fieldError: {
        field: 'confirmPassword',
        message: 'Mật khẩu nhập lại không khớp.',
      },
      message: 'Mật khẩu xác nhận chưa trùng khớp.',
    };
  }

  const createdAccount: StoredMockAccount = {
    id: `student-${Date.now()}`,
    fullName: payload.fullName.trim(),
    email: normalizedEmail,
    password: payload.password,
    phone: payload.phone.trim(),
    university: payload.university,
    major: payload.major.trim() || 'Sinh viên đại học',
    yearLabel: 'Sinh viên mới',
    verifiedStudent: normalizedEmail.endsWith('.edu.vn'),
  };

  return {
    ok: true,
    user: toPublicUser(createdAccount),
    createdAccount,
    message: createdAccount.verifiedStudent
      ? 'Đăng ký thành công! Email .edu.vn đã được gắn nhãn Sinh viên xác thực.'
      : 'Đăng ký tài khoản mô phỏng thành công!',
  };
}
