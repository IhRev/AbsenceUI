export class UserDetails {
  public constructor(
    public id: number,
    public firstName: string,
    public lastName: string,
    public email: string
  ) {}
}

export class UserCredentials {
  public constructor(public email: string, public password: string) {}
}

export class RegisterDTO {
  public constructor(
    public firstName: string,
    public lastName: string,
    public credentials: UserCredentials
  ) {}
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export class DeleteUserRequest {
  constructor(public password: string) {}
}

export class ChangePasswordRequest {
  public constructor(public oldPassword: string, public newPassword: string) {}
}
