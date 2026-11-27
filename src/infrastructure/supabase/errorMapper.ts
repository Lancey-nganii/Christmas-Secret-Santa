import { AppError } from '../../domain/errors';

interface RawSupabaseError {
  message?: string;
  code?: string;
  status?: number;
  details?: string | null;
}

export function mapAuthError(err: unknown, context: 'sign_in' | 'session'): AppError {
  if (err instanceof AppError) return err;

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return new AppError(
      'OFFLINE',
      'You appear to be offline. Reconnect to the internet and try again.'
    );
  }

  const raw = (err ?? {}) as RawSupabaseError;
  const msg = raw.message || '';
  const code = raw.code || '';

  if (/fetch|network|timeout|load failed/i.test(msg)) {
    return new AppError(
      'UNCERTAIN_NETWORK',
      'Could not reach the sign-in service. Check your connection and try again.'
    );
  }

  if (raw.status === 429 || /rate limit|too many/i.test(msg + code)) {
    return new AppError(
      'RATE_LIMITED',
      'Too many sign-in attempts right now. Please wait a minute and try again.'
    );
  }

  if (
    context === 'sign_in' &&
    (/invalid login credentials|invalid credentials|user not found|invalid grant/i.test(msg) ||
      code === 'invalid_credentials' ||
      raw.status === 400)
  ) {
    return new AppError(
      'INVALID_CREDENTIALS',
      'That username or password did not match. Check for typos or ask Lance to reset your password.'
    );
  }

  return new AppError(
    'UNKNOWN',
    msg || 'Something went wrong while signing in. Please try again.'
  );
}

export function mapRpcError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return new AppError(
      'OFFLINE',
      'You are offline. Reconnect to refresh the latest wishlists.'
    );
  }

  const raw = (err ?? {}) as RawSupabaseError;
  const msg = raw.message || '';
  const code = raw.code || '';

  if (/fetch|network|timeout|load failed|abort/i.test(msg)) {
    return new AppError(
      'UNCERTAIN_NETWORK',
      'Connection dropped before we got confirmation. Refresh once reconnected to verify what saved.'
    );
  }

  if (msg.includes('GIFT_LOCKED_BY_PICK')) {
    return new AppError(
      'GIFT_LOCKED',
      'Someone already picked this gift, so it cannot be edited or removed right now.'
    );
  }

  if (msg.includes('CANNOT_PICK_OWN_GIFT')) {
    return new AppError(
      'ACCESS_DENIED',
      'You cannot pick a gift from your own wishlist.'
    );
  }

  if (msg.includes('ACCESS_DENIED') || code === '42501') {
    return new AppError(
      'ACCESS_DENIED',
      'This account is not listed on the family roster yet. Sign out or ask the organizer to check your account.'
    );
  }

  if (
    msg.includes('MEMBER_NOT_FOUND') ||
    msg.includes('GIFT_NOT_FOUND') ||
    code === 'P0002'
  ) {
    return new AppError(
      'NOT_FOUND',
      'That item could not be found—it may have just been updated or removed.'
    );
  }

  if (
    msg.includes('INVALID_GIFT_') ||
    msg.includes('INVALID_STORE_URL') ||
    code === '22023'
  ) {
    return new AppError(
      'VALIDATION',
      msg.replace(/^[A-Z_]+:\s*/, '') || 'Check the gift details and try again.'
    );
  }

  return new AppError(
    'UNKNOWN',
    'Could not complete that request right now. Refresh the list and try again.'
  );
}

export function mapMemberManagementError(
  err: unknown,
  status?: number,
  payload?: { code?: string; message?: string }
): AppError {
  if (err instanceof AppError) return err;

  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return new AppError(
      'OFFLINE',
      'You appear to be offline. Reconnect to update family accounts.'
    );
  }

  const rawMsg = err instanceof Error ? err.message : '';
  const code = payload?.code || '';
  const message = payload?.message || '';

  if (!status && /fetch|network|timeout|load failed|send a request to the edge function/i.test(rawMsg)) {
    return new AppError(
      'UNCERTAIN_NETWORK',
      'Could not reach the family management service. Check your connection and try again.'
    );
  }

  if (status === 401 || code === 'UNAUTHENTICATED') {
    return new AppError(
      'UNAUTHENTICATED',
      message || 'Your session expired. Sign out and sign back in to manage family accounts.'
    );
  }

  if (status === 403 || code === 'FORBIDDEN') {
    return new AppError(
      'FORBIDDEN',
      message || 'Only the family organizer can manage family accounts.',
      false
    );
  }

  if (status === 409 || code === 'USERNAME_TAKEN') {
    return new AppError(
      'USERNAME_TAKEN',
      message || 'That username is already in use. Choose a different one.'
    );
  }

  if (status === 404 || code === 'NOT_FOUND') {
    return new AppError(
      'NOT_FOUND',
      message || 'Family member was not found.'
    );
  }

  if (status === 400 || code === 'VALIDATION') {
    return new AppError(
      'VALIDATION',
      message || 'Check the member details and try again.'
    );
  }

  return new AppError(
    'UNKNOWN',
    message || 'Could not update family accounts right now. Please try again.'
  );
}
