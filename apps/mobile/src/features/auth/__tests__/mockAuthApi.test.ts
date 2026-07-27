import { mockChangePassword, mockDeleteAccount, mockUpdateProfile } from '../mockAuthApi';

describe('mockChangePassword', () => {
  it('rejects a new password shorter than 4 characters', async () => {
    await expect(mockChangePassword('current', 'abc')).rejects.toThrow('invalid-password');
  });

  it('resolves successfully for a valid new password', async () => {
    await expect(mockChangePassword('current', 'longenough')).resolves.toEqual({ success: true });
  });
});

describe('mockUpdateProfile / mockDeleteAccount', () => {
  it('echoes back the profile patch', async () => {
    await expect(mockUpdateProfile({ pseudo: 'Renamed' })).resolves.toEqual({ pseudo: 'Renamed' });
  });

  it('resolves successfully on account deletion', async () => {
    await expect(mockDeleteAccount()).resolves.toEqual({ success: true });
  });
});
