import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Switch } from './Switch';

describe('Switch', () => {
  it('appelle onChange avec la valeur inversée au clic', async () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} label="Activer" />);

    await userEvent.click(screen.getByRole('switch', { name: 'Activer' }));

    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('reflète son état via aria-checked', () => {
    render(<Switch checked onChange={vi.fn()} label="Activer" />);
    expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
  });

  it('ignore les clics quand désactivé', async () => {
    const onChange = vi.fn();
    render(<Switch checked={false} onChange={onChange} disabled label="Activer" />);

    await userEvent.click(screen.getByRole('switch', { name: 'Activer' }));

    expect(onChange).not.toHaveBeenCalled();
  });
});
