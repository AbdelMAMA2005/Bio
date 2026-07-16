import {
  mockChangePassword,
  mockDeleteAccount,
  mockGoogleLogin,
  mockLogin,
  mockRegister,
  mockUpdateProfile,
} from '../mockAuthApi';
import { currentUser } from '@/api/mock/store';

describe('mockLogin', () => {
  it('rejects an email without an "@"', async () => {
    await expect(mockLogin('not-an-email', 'password')).rejects.toThrow('invalid-credentials');
  });

  it('rejects a password shorter than 4 characters', async () => {
    await expect(mockLogin('a@b.com', 'abc')).rejects.toThrow('invalid-credentials');
  });

  it('resolves with a token and the demo profile using the submitted email', async () => {
    const result = await mockLogin('someone@example.com', 'longenough');
    expect(result.token).toMatch(/^mock-token-/);
    expect(result.user).toMatchObject({ ...currentUser, email: 'someone@example.com' });
  });
});

describe('mockRegister', () => {
  it('rejects an empty pseudo', async () => {
    await expect(mockRegister('   ', 'a@b.com', 'longenough')).rejects.toThrow('invalid-fields');
  });

  it('rejects an email without an "@"', async () => {
    await expect(mockRegister('pseudo', 'not-an-email', 'longenough')).rejects.toThrow('invalid-fields');
  });

  it('rejects a password shorter than 4 characters', async () => {
    await expect(mockRegister('pseudo', 'a@b.com', 'abc')).rejects.toThrow('invalid-fields');
  });

  it('resolves with a fresh level-1 user on valid input', async () => {
    const result = await mockRegister('NewUser', 'new@example.com', 'longenough');
    expect(result.user).toMatchObject({ pseudo: 'NewUser', email: 'new@example.com', niveau: 1, xp: 0 });
  });
});

describe('mockGoogleLogin', () => {
  it('resolves with the demo profile and a fixed Google email', async () => {
    const result = await mockGoogleLogin();
    expect(result.user.email).toBe('lea.fontaine@gmail.com');
    expect(result.token).toMatch(/^mock-token-/);
  });
});

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
