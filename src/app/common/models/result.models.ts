export class Result {
  public readonly isSuccess: boolean;
  public readonly message: string;
  public readonly queued: boolean;

  private constructor(isSuccess: boolean, message: string, queued = false) {
    this.isSuccess = isSuccess;
    this.message = message;
    this.queued = queued;
  }

  public static success(message?: string, queued = false): Result {
    return new Result(true, message ?? 'Success', queued);
  }

  public static fail(message?: string): Result {
    return new Result(false, message ?? 'Something went wrong');
  }
}

export class DataResult<T> {
  public readonly isSuccess: boolean;
  public readonly message: string;
  public readonly data?: T;

  private constructor(isSuccess: boolean, message: string, data?: T) {
    this.isSuccess = isSuccess;
    this.message = message;
    this.data = data;
  }

  public static success<T>(data: T, message?: string): DataResult<T> {
    return new DataResult<T>(true, message ?? 'Success', data);
  }

  public static fail<T>(message?: string): DataResult<T> {
    return new DataResult<T>(false, message ?? 'Something went wrong');
  }
}
