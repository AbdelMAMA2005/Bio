import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { FeedbackModal } from '../FeedbackModal';
import { FeedbackError, sendFeedback } from '../feedbackApi';

jest.mock('../feedbackApi', () => ({
  sendFeedback: jest.fn(),
  FeedbackError: class FeedbackError extends Error {
    code: string;
    constructor(code: string) { super(code); this.code = code; }
  },
}));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn(() => '11111111-1111-4111-8111-111111111111') }));
jest.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
jest.mock('@/theme', () => ({ useAppTheme: () => ({ colors: { screen: '#fff', text: '#111', muted: '#666', active: '#080', surface: '#fff', hairline: '#ddd' } }) }));
jest.mock('@/components/Icon', () => ({ Icon: () => null }));
jest.mock('@/components/CircleIconButton', () => {
  const { Button } = require('react-native');
  return { CircleIconButton: ({ onPress }: any) => <Button title="close" onPress={onPress} /> };
});
jest.mock('@/components/GradientButton', () => {
  const { Button } = require('react-native');
  return { GradientButton: ({ label, onPress, loading, disabled }: any) => <Button title={label} onPress={onPress} disabled={loading || disabled} /> };
});

const send = sendFeedback as jest.Mock;
describe('feedback form', () => {
  beforeEach(() => send.mockReset());
  it('prevents empty submissions and confirms only after a successful send', async () => {
    send.mockResolvedValue(undefined);
    const view = render(<FeedbackModal kind="suggestion" onClose={jest.fn()} />);
    fireEvent.press(view.getByText('feedback.send'));
    expect(send).not.toHaveBeenCalled();
    fireEvent.changeText(view.getByLabelText('feedback.messageLabel'), 'Ajouter un calendrier.');
    fireEvent.press(view.getByText('feedback.send'));
    await waitFor(() => expect(view.getByText('feedback.sentTitle')).toBeTruthy());
    expect(send).toHaveBeenCalledWith('suggestion', 'Ajouter un calendrier.', '11111111-1111-4111-8111-111111111111');
  });
  it('keeps the draft and reuses the request reference after a failed send', async () => {
    send.mockRejectedValueOnce(new FeedbackError('unavailable')).mockResolvedValueOnce(undefined);
    const view = render(<FeedbackModal kind="report" onClose={jest.fn()} />);
    const message = 'Le scan reste bloqué.';
    fireEvent.changeText(view.getByLabelText('feedback.messageLabel'), message);
    fireEvent.press(view.getByText('feedback.send'));
    await waitFor(() => expect(view.getByText('feedback.errors.unavailable')).toBeTruthy());
    expect(view.getByDisplayValue(message)).toBeTruthy();
    expect(view.queryByText('feedback.sentTitle')).toBeNull();
    fireEvent.press(view.getByText('feedback.send'));
    await waitFor(() => expect(view.getByText('feedback.sentTitle')).toBeTruthy());
    expect(send.mock.calls[1]).toEqual(send.mock.calls[0]);
  });
});
