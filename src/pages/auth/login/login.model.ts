export interface UserLoginData {
  email: string;
  password: string;
  club_rfc: string;
}

export interface ClubLoginData {
  rfc: string;
  password: string;
}

export interface RecoverPasswordData {
  email: string;
}

export type LoginData = UserLoginData | ClubLoginData | RecoverPasswordData;