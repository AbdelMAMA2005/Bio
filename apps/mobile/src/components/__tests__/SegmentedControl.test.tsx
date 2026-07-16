import { fireEvent, render, screen } from '@testing-library/react-native';

import { SegmentedControl } from '../SegmentedControl';
import { AppThemeProvider } from '@/theme';

function renderControl(onChange: (value: 'quotidien' | 'herbarium') => void) {
  return render(
    <AppThemeProvider>
      <SegmentedControl
        value="quotidien"
        onChange={onChange}
        options={[
          { value: 'quotidien', label: 'Mon Quotidien' },
          { value: 'herbarium', label: 'Mon Herbarium' },
        ]}
      />
    </AppThemeProvider>,
  );
}

describe('SegmentedControl', () => {
  it('renders every option label', async () => {
    renderControl(jest.fn());

    expect(await screen.findByText('Mon Quotidien')).toBeTruthy();
    expect(screen.getByText('Mon Herbarium')).toBeTruthy();
  });

  it('calls onChange with the pressed option value', async () => {
    const onChange = jest.fn();
    renderControl(onChange);

    fireEvent.press(await screen.findByText('Mon Herbarium'));

    expect(onChange).toHaveBeenCalledWith('herbarium');
  });

  it('calls onChange even when pressing the already-active option', async () => {
    const onChange = jest.fn();
    renderControl(onChange);

    fireEvent.press(await screen.findByText('Mon Quotidien'));

    expect(onChange).toHaveBeenCalledWith('quotidien');
  });
});
