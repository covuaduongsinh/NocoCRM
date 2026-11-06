import { fireEvent, render, screen, within } from '@testing-library/react';
import { useState, type ReactElement } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { TabRow } from '../../client/components/crm/tab-row.js';
import { tabClass } from '../../client/components/crm/tab-class.js';

const NAMES = ['One', 'Two', 'Three'];

function Row(): ReactElement {
  const [open, setOpen] = useState('One');
  return (
    <TabRow label='Row' selected={open} tabCount={NAMES.length}>
      {NAMES.map((name) => (
        <button
          key={name}
          type='button'
          role='tab'
          aria-selected={name === open}
          className={tabClass(name === open)}
          onClick={() => setOpen(name)}
        >
          {name}
        </button>
      ))}
    </TabRow>
  );
}

const openTab = () =>
  within(screen.getByRole('tablist', { name: 'Row' })).getByRole('tab', {
    selected: true,
  }).textContent;

afterEach(() => vi.restoreAllMocks());

it('stays on one line and scrolls sideways rather than wrapping', () => {
  render(<Row />);
  const row = screen.getByRole('tablist', { name: 'Row' });
  expect(row.className).toContain('overflow-x-auto');
  expect(row.className).not.toContain('flex-wrap');
  expect(screen.getByRole('tab', { name: 'One' }).className).toContain(
    'whitespace-nowrap',
  );
});

it('moves with the arrow keys, Home and End, opening the tab it lands on', () => {
  render(<Row />);
  const key = (name: string) =>
    fireEvent.keyDown(document.activeElement as Element, { key: name });
  screen.getByRole('tab', { name: 'One' }).focus();
  key('ArrowRight');
  expect(openTab()).toBe('Two');
  expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Two' }));
  key('End');
  expect(openTab()).toBe('Three');
  key('ArrowRight');
  expect(openTab()).toBe('One');
  key('ArrowLeft');
  expect(openTab()).toBe('Three');
  key('Home');
  expect(openTab()).toBe('One');
  // Any other key is left alone.
  key('a');
  expect(openTab()).toBe('One');
});

it('brings the open tab into view when they do not fit', () => {
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(600);
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300);
  vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockReturnValue(400);
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(100);
  const scrollTo = vi.fn();
  HTMLElement.prototype.scrollTo = scrollTo;
  render(<Row />);
  // In the middle: 400 - (300 - 100) / 2, at once on arriving.
  expect(scrollTo).toHaveBeenLastCalledWith({ left: 300, behavior: 'auto' });
  fireEvent.click(screen.getByRole('tab', { name: 'Two' }));
  expect(scrollTo).toHaveBeenLastCalledWith({ left: 300, behavior: 'smooth' });
});
