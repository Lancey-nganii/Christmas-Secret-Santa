export type AppErrorCode =
  | 'ACCESS_DENIED'
  | 'UNAUTHENTICATED'
  | 'INVALID_CREDENTIALS'
  | 'USERNAME_TAKEN'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'GIFT_LOCKED'
  | 'ALREADY_PICKED'
  | 'RECIPIENT_LIMIT'
  | 'NOT_FOUND'
  | 'VALIDATION'
  | 'OFFLINE'
  | 'UNCERTAIN_NETWORK'
  | 'UNKNOWN';

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly recoverable: boolean;

  constructor(code: AppErrorCode, message: string, recoverable = true) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.recoverable = recoverable;
  }
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof AppError) {
    return error.code === 'OFFLINE' || error.code === 'UNCERTAIN_NETWORK';
  }
  if (error instanceof TypeError) {
    return true;
  }
  if (error instanceof Error) {
    return /network|failed to fetch|load failed|timeout|abort/i.test(error.message);
  }
  return false;
}
