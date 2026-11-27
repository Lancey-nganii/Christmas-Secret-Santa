import type {
  GiftDraft,
  NewMemberDraft,
  NormalizedGiftInput,
  NormalizedNewMemberInput,
} from './models';

export interface ValidationResult<T> {
  readonly ok: boolean;
  readonly value?: T;
  readonly fieldErrors: Readonly<Record<string, string>>;
}

export interface SignInCredentials {
  readonly username: string;
  readonly password: string;
}

export const INTERNAL_AUTH_DOMAIN = 'macorol.wishlist';

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{1,31}$/;
const HTTP_URL_PATTERN = /^https?:\/\/[^\s]+$/i;

export function normalizeUsername(raw: string): string {
  const trimmed = raw.trim();
  const withoutAt = trimmed.startsWith('@') ? trimmed.slice(1) : trimmed;
  return withoutAt.toLowerCase();
}

export function suggestUsernameFromName(displayName: string): string {
  return displayName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '.')
    .replace(/^[._-]+|[._-]+$/g, '')
    .slice(0, 32);
}

export function usernameToAuthEmail(username: string): string {
  return `${normalizeUsername(username)}@${INTERNAL_AUTH_DOMAIN}`;
}

export function validateUsername(rawUsername: string): ValidationResult<string> {
  const username = normalizeUsername(rawUsername);
  if (!username) {
    return {
      ok: false,
      fieldErrors: { username: 'Enter your family username.' },
    };
  }
  if (!USERNAME_PATTERN.test(username)) {
    return {
      ok: false,
      fieldErrors: {
        username:
          'Use 2 to 32 characters starting with a letter or number (letters, numbers, ., _, or -).',
      },
    };
  }
  return { ok: true, value: username, fieldErrors: {} };
}

export function validateSignInCredentials(
  rawUsername: string,
  rawPassword: string
): ValidationResult<SignInCredentials> {
  const fieldErrors: Record<string, string> = {};
  const usernameResult = validateUsername(rawUsername);

  if (!usernameResult.ok && usernameResult.fieldErrors.username) {
    fieldErrors.username = usernameResult.fieldErrors.username;
  }

  if (!rawPassword || rawPassword.trim().length === 0) {
    fieldErrors.password = 'Enter your password.';
  }

  if (Object.keys(fieldErrors).length > 0 || !usernameResult.value) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    value: {
      username: usernameResult.value,
      password: rawPassword,
    },
    fieldErrors: {},
  };
}

export function validatePasswordReset(rawPassword: string): ValidationResult<string> {
  if (!rawPassword || rawPassword.trim().length === 0) {
    return {
      ok: false,
      fieldErrors: { password: 'Enter a new password.' },
    };
  }
  if (rawPassword.length < 6 || rawPassword.length > 72) {
    return {
      ok: false,
      fieldErrors: { password: 'Password must be between 6 and 72 characters.' },
    };
  }
  return { ok: true, value: rawPassword, fieldErrors: {} };
}

export function validateNewMemberDraft(
  draft: NewMemberDraft
): ValidationResult<NormalizedNewMemberInput> {
  const fieldErrors: Record<string, string> = {};
  const cleanName = draft.displayName.trim();

  if (!cleanName) {
    fieldErrors.displayName = 'Enter the family member’s name.';
  } else if (cleanName.length > 80) {
    fieldErrors.displayName = 'Keep the display name under 80 characters.';
  }

  const usernameResult = validateUsername(draft.username);
  if (!usernameResult.ok) {
    fieldErrors.username =
      draft.username.trim().length === 0
        ? 'Choose a username.'
        : usernameResult.fieldErrors.username || 'Enter a valid username.';
  }

  const passwordResult = validatePasswordReset(draft.password);
  if (!passwordResult.ok) {
    fieldErrors.password =
      draft.password.trim().length === 0
        ? 'Enter an initial password (at least 6 characters).'
        : passwordResult.fieldErrors.password || 'Enter a valid password.';
  }

  if (Object.keys(fieldErrors).length > 0 || !usernameResult.value || !passwordResult.value) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    value: {
      displayName: cleanName,
      username: usernameResult.value,
      password: passwordResult.value,
    },
    fieldErrors: {},
  };
}

export function validateGiftDraft(draft: GiftDraft): ValidationResult<NormalizedGiftInput> {
  const fieldErrors: Record<string, string> = {};
  const cleanName = draft.name.trim();
  const cleanNote = draft.note.trim();
  const cleanUrl = draft.storeUrl.trim();

  if (!cleanName) {
    fieldErrors.name = 'Add a gift name so your family knows what to look for.';
  } else if (cleanName.length > 160) {
    fieldErrors.name = 'Keep the gift name under 160 characters.';
  }

  if (cleanNote.length > 500) {
    fieldErrors.note = 'Keep the note under 500 characters.';
  }

  if (cleanUrl) {
    if (cleanUrl.length > 2048 || !HTTP_URL_PATTERN.test(cleanUrl)) {
      fieldErrors.storeUrl = 'Store link must start with https:// or http://.';
    } else {
      try {
        const parsed = new URL(cleanUrl);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
          fieldErrors.storeUrl = 'Store link must start with https:// or http://.';
        }
      } catch {
        fieldErrors.storeUrl = 'Enter a complete store link starting with https:// or http://.';
      }
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    value: {
      name: cleanName,
      note: cleanNote || null,
      storeUrl: cleanUrl || null,
    },
    fieldErrors: {},
  };
}
