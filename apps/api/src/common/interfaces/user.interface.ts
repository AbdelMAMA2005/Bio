export interface IUser {
  id: string;
  email: string;
  fullName?: string;
  username: string;
  experience: number;
  niveau: number;
  insignes: string[];
  pieces: number;
  urlAvatar?: string | null;
}
