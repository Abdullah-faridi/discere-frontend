export type User = {
  id: string;
  username?: string;
  fullName: string;
  profileImageURL?: string;
  email?: string;
  role?: string;
  bio?: string;
  isBanned?: boolean;
};

export type AuthResponse = { accessToken: string; user: User };
export type CurrentUserResponse = { user: User };
