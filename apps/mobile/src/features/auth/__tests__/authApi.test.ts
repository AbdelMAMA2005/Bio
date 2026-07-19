import { apiClient } from '@/api/client';
import { login, register } from '../authApi';

jest.mock('@/api/client', () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

const mockedPost = apiClient.post as jest.Mock;

beforeEach(() => {
  mockedPost.mockReset();
});

describe('login', () => {
  it('posts to /auth/login with motDePasse (not "password") and adapts the response', async () => {
    mockedPost.mockResolvedValueOnce({
      data: {
        accessToken: 'jwt-abc',
        user: { id: 'u1', email: 'a@b.com', nomUtilisateur: 'Djawad', experience: 120, niveau: 2 },
      },
    });

    const result = await login('a@b.com', 'secret123');

    expect(mockedPost).toHaveBeenCalledWith('/auth/login', { email: 'a@b.com', motDePasse: 'secret123' });
    expect(result).toEqual({ token: 'jwt-abc', user: { id: 'u1', pseudo: 'Djawad', email: 'a@b.com', niveau: 2, xp: 120 } });
  });
});

describe('register', () => {
  it('registers then chains an immediate login, since /auth/register returns no token', async () => {
    mockedPost
      .mockResolvedValueOnce({ data: { id: 'u2', email: 'new@b.com', nomUtilisateur: 'NewUser', experience: 0, niveau: 1 } })
      .mockResolvedValueOnce({
        data: {
          accessToken: 'jwt-xyz',
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
