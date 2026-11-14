import '@mantine/core/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/notifications/styles.css';

import 'leaflet/dist/leaflet.css';
import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { Router } from './Router';
import { AppStateProvider } from './state/AppStateContext';
import { cssVariablesResolver, theme } from './theme';
import './styles/global.css';

export default function App() {
  return (
    <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver}>
      <ModalsProvider>
        <Notifications position="top-right" />
        <AppStateProvider>
          <Router />
        </AppStateProvider>
      </ModalsProvider>
    </MantineProvider>
  );
}
