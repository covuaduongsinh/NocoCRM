import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import SettingsPage from '../../client/pages/settings/index.js';

const state = vi.hoisted(() => ({ mobile: false }));
vi.mock('#hooks/use-mobile', () => ({ useIsMobile: () => state.mobile }));
vi.mock('@nocobase/app-plugin-authorization/client', () => ({
  useCan: () => ({ can: true, isPending: false }),
}));
vi.mock('@nocobase/app-plugin-demo-mode/client', () => ({
  useDemoMode: () => false,
}));
vi.mock('@nocobase/i18n/client', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock('../../client/components/crm/api.js', () => ({
  useCrmText: () => ({ text: (key: string) => key }),
}));
vi.mock('../../client/components/crm/common.js', () => ({
  Loading: () => null,
}));

function Address() {
  return <output>{useLocation().pathname}</output>;
}

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/settings/crm']}>
      <SettingsPage />
      <Address />
    </MemoryRouter>,
  );

beforeEach(() => {
  state.mobile = false;
});

it('shows the pages as tabs above a phone', () => {
  renderPage();
  expect(screen.getAllByRole('tab')).toHaveLength(7);
  expect(screen.queryByRole('combobox')).toBeNull();
});

// A phone chooses from a menu of them all, which replaces the address as the
// tabs do.
it('shows a menu of the pages on a phone', async () => {
  state.mobile = true;
  renderPage();
  expect(screen.queryByRole('tab')).toBeNull();
  const menu = screen.getByRole('combobox', { name: 'navigation.settings' });
  expect(menu.textContent).toContain('navigation.general');
  await userEvent.click(menu);
  await userEvent.click(
    await screen.findByRole('option', { name: 'navigation.users' }),
  );
  await waitFor(() =>
    expect(screen.getByRole('status').textContent).toBe('/settings/users'),
  );
  expect(menu.textContent).toContain('navigation.users');
});
