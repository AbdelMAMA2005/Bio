import { isEmailNotConfirmed, register, requestPasswordReset, resendSignupCode, resetPasswordWithCode, verifySignupCode } from '../authApi';
import { normalizeCode } from '../otp';

const mockAuth = {
  signUp: jest.fn(),
  verifyOtp: jest.fn(),
  resend: jest.fn(),
  getUser: jest.fn(),
  resetPasswordForEmail: jest.fn(),
  updateUser: jest.fn(),
  signOut: jest.fn(),
};
const mockProfile = { id: 'user-1', nom_utilisateur: 'camille', experience: 0, niveau: 1, pieces: 0, url_avatar: null };

jest.mock('@/lib/supabase', () => ({
  supabase: {
    get auth() {
      return mockAuth;
    },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: mockProfile, error: null }) }) }) }),
  },
  getStoragePublicUrl: (_bucket: string, path: string) => path,
  uriToBlob: jest.fn(),
}));


const session = { access_token: 'a', refresh_token: 'r', user: { id: 'user-1', email: 'camille@example.com' } };

beforeEach(() => jest.clearAllMocks());

describe('inscription avec code de confirmation', () => {
  it('signale qu’un code est attendu quand Supabase ne renvoie pas de session', async () => {
    mockAuth.signUp.mockResolvedValue({ data: { session: null, user: { id: 'user-1' } }, error: null });
    await expect(register('camille', 'camille@example.com', 'motdepasse')).resolves.toBeNull();
  });

  it('ouvre la session quand la confirmation est désactivée', async () => {
    mockAuth.signUp.mockResolvedValue({ data: { session }, error: null });
    await expect(register('camille', 'camille@example.com', 'motdepasse')).resolves.toMatchObject({ user: { pseudo: 'camille' } });
  });

  it('vérifie le code reçu par e-mail puis ouvre la session', async () => {
    mockAuth.verifyOtp.mockResolvedValue({ data: { session }, error: null });
    await expect(verifySignupCode('camille@example.com', '123456')).resolves.toMatchObject({ user: { id: 'user-1' } });
    expect(mockAuth.verifyOtp).toHaveBeenCalledWith({ email: 'camille@example.com', token: '123456', type: 'email' });
  });

  it('refuse un code incorrect', async () => {
    mockAuth.verifyOtp.mockResolvedValue({ data: { session: null }, error: { message: 'Token has expired or is invalid' } });
    await expect(verifySignupCode('camille@example.com', '000000')).rejects.toMatchObject({ message: 'Token has expired or is invalid' });
  });

  it('renvoie un code d’inscription', async () => {
    mockAuth.resend.mockResolvedValue({ error: null });
    await resendSignupCode('camille@example.com');
    expect(mockAuth.resend).toHaveBeenCalledWith({ type: 'signup', email: 'camille@example.com' });
  });
});

describe('isEmailNotConfirmed', () => {
  it('reconnaît le refus de connexion pour adresse non confirmée', () => {
    expect(isEmailNotConfirmed({ code: 'email_not_confirmed', message: 'Email not confirmed' })).toBe(true);
    expect(isEmailNotConfirmed({ message: 'Email not confirmed' })).toBe(true);
    expect(isEmailNotConfirmed({ code: 'invalid_credentials', message: 'Invalid login credentials' })).toBe(false);
    expect(isEmailNotConfirmed(null)).toBe(false);
  });
});

describe('normalizeCode', () => {
  it('garde uniquement les chiffres d’un code collé', () => {
    expect(normalizeCode(' 123 456 ')).toBe('123456');
    expect(normalizeCode('12-34-56')).toBe('123456');
    expect(normalizeCode('12345678901234')).toBe('1234567890');
  });
});

describe('mot de passe oublié par code', () => {
  it('demande l’envoi d’un code de réinitialisation', async () => {
    mockAuth.resetPasswordForEmail.mockResolvedValue({ error: null });
    await requestPasswordReset('camille@example.com');
    expect(mockAuth.resetPasswordForEmail).toHaveBeenCalledWith('camille@example.com');
  });

  it('valide le code, enregistre le nouveau mot de passe puis ouvre la session', async () => {
    mockAuth.verifyOtp.mockResolvedValue({ data: { session }, error: null });
    mockAuth.updateUser.mockResolvedValue({ error: null });
    await expect(resetPasswordWithCode('camille@example.com', '123456', 'nouveaumdp')).resolves.toMatchObject({ user: { id: 'user-1' } });
    expect(mockAuth.verifyOtp).toHaveBeenCalledWith({ email: 'camille@example.com', token: '123456', type: 'recovery' });
    expect(mockAuth.updateUser).toHaveBeenCalledWith({ password: 'nouveaumdp' });
  });

  it('referme la session si le nouveau mot de passe est refusé', async () => {
    mockAuth.verifyOtp.mockResolvedValue({ data: { session }, error: null });
    mockAuth.updateUser.mockResolvedValue({ error: { message: 'New password should be different from the old password.' } });
    mockAuth.signOut.mockResolvedValue({ error: null });
    await expect(resetPasswordWithCode('camille@example.com', '123456', 'ancienmdp')).rejects.toBeTruthy();
    expect(mockAuth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('ne change rien si le code est faux', async () => {
    mockAuth.verifyOtp.mockResolvedValue({ data: { session: null }, error: { message: 'Token has expired or is invalid' } });
    await expect(resetPasswordWithCode('camille@example.com', '000000', 'nouveaumdp')).rejects.toBeTruthy();
    expect(mockAuth.updateUser).not.toHaveBeenCalled();
  });
});
