/** Forme de `request.user`, posée par `JwtStrategy#validate` une fois le JWT vérifié. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  nomUtilisateur: string;
  estAdmin: boolean;
  role: 'membre' | 'moderateur' | 'admin';
  estSuspendu: boolean;
}

export interface JwtPayload {
  sub: string;
}
