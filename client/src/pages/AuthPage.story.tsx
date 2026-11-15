import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthMockProvider } from '../state/AuthMockContext';
import { AuthPage } from './AuthPage';

const meta: Meta<typeof AuthPage> = {
  title: 'Pages/AuthPage',
  component: AuthPage,
  decorators: [
    (Story) => (
      <AuthMockProvider>
        <MemoryRouter>
          <Story />
        </MemoryRouter>
      </AuthMockProvider>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof AuthPage>;

export const LoginView: Story = {
  args: {
    defaultTab: 'login',
  },
};

export const RegisterView: Story = {
  args: {
    defaultTab: 'register',
  },
};
