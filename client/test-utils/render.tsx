import { render as testingLibraryRender } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { cssVariablesResolver, theme } from '../src/theme';

export function render(ui: React.ReactNode) {
  return testingLibraryRender(ui, {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <MantineProvider theme={theme} cssVariablesResolver={cssVariablesResolver} env="test">
        {children}
      </MantineProvider>
    ),
  });
}
