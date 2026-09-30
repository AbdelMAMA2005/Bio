import { authErrorMessage } from '../authError';

describe('authentication error reporting', () => {
  it('preserves plain Supabase errors and their diagnostic code', () => {
    expect(authErrorMessage({ message: 'Profile access denied', code: '42501' }, 'fallback'))
      .toBe('Profile access denied (42501)');
  });

  it('preserves native Google errors', () => {
    const error = Object.assign(new Error('DEVELOPER_ERROR'), { code: '10' });
    expect(authErrorMessage(error, 'fallback')).toBe('DEVELOPER_ERROR (10)');
  });

  it.each([null, undefined, {}, { message: '' }])('handles missing error details: %p', (error) => {
    expect(authErrorMessage(error, 'fallback')).toBe('fallback');
  });
});
