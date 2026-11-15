import '@mantine/core/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/notifications/styles.css';

import '@openmapvn/openmapvn-gl/dist/maplibre-gl.css';
import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { Router } from './Router';
import { AppStateProvider } from './state/AppStateContext';
import { AuthMockProvider } from './state/AuthMockContext';
import { cssVariablesResolver, theme } from './theme';
import './styles/global.css';

export default function App() {
  return (
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver}>
      <ModalsProvider>
        <Notifications position="top-right" />
        <AuthMockProvider>
          <AppStateProvider>
            <Router />
          </AppStateProvider>
        </AuthMockProvider>
      </ModalsProvider>
    </MantineProvider>
  );
}
