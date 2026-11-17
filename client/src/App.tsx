import '@mantine/core/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/notifications/styles.css';

import '@openmapvn/openmapvn-gl/dist/maplibre-gl.css';
import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { Router } from './Router';
import { UserScopedAppStateProvider } from './state/AppStateContext';
import { AuthMockProvider } from './state/AuthMockContext';
import { cssVariablesResolver, theme } from './theme';
import './styles/global.css';

export default function App() {
  return (
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver}>
      <ModalsProvider>
        <Notifications position="top-right" />
        <AuthMockProvider>
          <UserScopedAppStateProvider>
            <Router />
          </UserScopedAppStateProvider>
        </AuthMockProvider>
      </ModalsProvider>
    </MantineProvider>
  );
}
