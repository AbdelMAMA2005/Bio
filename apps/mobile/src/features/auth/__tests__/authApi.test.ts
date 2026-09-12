import { apiClient } from '@/api/client';
import { login, register, loginWithGoogle, updateProfile, deleteAccount, refreshAccessToken, logout } from '../authApi';

jest.mock('@/api/client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const mockedPost = apiClient.post as jest.Mock;
const mockedPatch = apiClient.patch as jest.Mock;
const mockedDelete = apiClient.delete as jest.Mock;

beforeEach(() => {
  mockedPost.mockReset();
  mockedPatch.mockReset();
  mockedDelete.mockReset();
});

describe('login', () => {
  it('posts to /auth/login with motDePasse (not "password") and adapts the response', async () => {
    mockedPost.mockResolvedValueOnce({
      data: {
        accessToken: 'jwt-abc',
        refreshToken: 'refresh-abc',
        user: { id: 'u1', email: 'a@b.com', nomUtilisateur: 'Djawad', experience: 120, niveau: 2, pieces: 15 },
      },
    });

    const result = await login('a@b.com', 'secret123');

    expect(mockedPost).toHaveBeenCalledWith('/auth/login', { email: 'a@b.com', motDePasse: 'secret123' });
    expect(result).toEqual({
      token: 'jwt-abc',
      refreshToken: 'refresh-abc',
      user: { id: 'u1', pseudo: 'Djawad', email: 'a@b.com', niveau: 2, xp: 120, pieces: 15, urlAvatar: null },
    });
  });
});

describe('register', () => {
  it('registers then chains an immediate login, since /auth/register returns no token', async () => {
    mockedPost
      .mockResolvedValueOnce({ data: { id: 'u2', email: 'new@b.com', nomUtilisateur: 'NewUser', experience: 0, niveau: 1 } })
      .mockResolvedValueOnce({
        data: {
          accessToken: 'jwt-xyz',
          refreshToken: 'refresh-xyz',
          user: { id: 'u2', email: 'new@b.com', nomUtilisateur: 'NewUser', experience: 0, niveau: 1 },
        },
      });

    const result = await register('NewUser', 'new@b.com', 'secret123');

    expect(mockedPost).toHaveBeenNthCalledWith(1, '/auth/register', {
      email: 'new@b.com',
      nomUtilisateur: 'NewUser',
      motDePasse: 'secret123',
    });
    expect(mockedPost).toHaveBeenNthCalledWith(2, '/auth/login', { email: 'new@b.com', motDePasse: 'secret123' });
    expect(result.token).toBe('jwt-xyz');
    expect(result.user.pseudo).toBe('NewUser');
  });
});

describe('loginWithGoogle', () => {
  it('posts the Google idToken to /auth/google and adapts the response', async () => {
    mockedPost.mockResolvedValueOnce({
      data: {
        accessToken: 'jwt-google',
        refreshToken: 'refresh-google',
        user: { id: 'u3', email: 'leo@gmail.com', nomUtilisateur: 'Leo', experience: 0, niveau: 1, pieces: 0 },
      },
    });

    const result = await loginWithGoogle('google-id-token');

    expect(mockedPost).toHaveBeenCalledWith('/auth/google', { idToken: 'google-id-token' });
    expect(result).toEqual({
      token: 'jwt-google',
      refreshToken: 'refresh-google',
      user: { id: 'u3', pseudo: 'Leo', email: 'leo@gmail.com', niveau: 1, xp: 0, pieces: 0, urlAvatar: null },
    });
  });
});

describe('refreshAccessToken', () => {
  it('posts the current refresh token to /auth/refresh and returns the new pair', async () => {
    mockedPost.mockResolvedValueOnce({
      data: { accessToken: 'jwt-new', refreshToken: 'refresh-new' },
    });

    const result = await refreshAccessToken('refresh-old');

    expect(mockedPost).toHaveBeenCalledWith('/auth/refresh', { refreshToken: 'refresh-old' });
    expect(result).toEqual({ accessToken: 'jwt-new', refreshToken: 'refresh-new' });
  });
});

describe('logout', () => {
  it('posts the refresh token to /auth/logout to revoke it server-side', async () => {
    mockedPost.mockResolvedValueOnce({ data: undefined });

    await logout('refresh-to-revoke');

    expect(mockedPost).toHaveBeenCalledWith('/auth/logout', { refreshToken: 'refresh-to-revoke' });
  });
});

describe('updateProfile', () => {
  it('sends the pseudo as nomUtilisateur to PATCH /users/me and adapts the response', async () => {
    mockedPatch.mockResolvedValueOnce({
      data: { id: 'u1', email: 'a@b.com', nomUtilisateur: 'NouveauPseudo', experience: 10, niveau: 1 },
    });

    const result = await updateProfile({ pseudo: 'NouveauPseudo' });

    expect(mockedPatch).toHaveBeenCalledWith('/users/me', { nomUtilisateur: 'NouveauPseudo' });
    expect(result.pseudo).toBe('NouveauPseudo');
  });
});

describe('deleteAccount', () => {
  it('sends the password in the DELETE /users/me request body', async () => {
    mockedDelete.mockResolvedValueOnce({ data: { success: true } });

    await deleteAccount('mon-mot-de-passe');

    expect(mockedDelete).toHaveBeenCalledWith('/users/me', { data: { motDePasse: 'mon-mot-de-passe' } });
  });
});
