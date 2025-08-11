export interface UserLoginData {
  email: string;
  password: string;
}

export interface ClubLoginData {
  rfc: string;
  password: string;
}

export interface RecoverPasswordData {
  email: string;
}

export type LoginData = UserLoginData | ClubLoginData | RecoverPasswordData;