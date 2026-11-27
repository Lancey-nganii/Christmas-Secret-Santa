import { describe, expect, it } from 'vitest';
import {
  normalizeUsername,
  suggestUsernameFromName,
  usernameToAuthEmail,
  validateGiftDraft,
  validateNewMemberDraft,
  validatePasswordReset,
  validateSignInCredentials,
} from '../src/domain/validation';

describe('username helpers', () => {
  it('normalizes leading @, whitespace, and casing', () => {
    expect(normalizeUsername('  @Reanna  ')).toBe('reanna');
    expect(normalizeUsername('Lance')).toBe('lance');
    expect(normalizeUsername('@@double')).toBe('@double');
  });

  it('suggests valid usernames from display names', () => {
    expect(suggestUsernameFromName('Reanna')).toBe('reanna');
    expect(suggestUsernameFromName('Tito Ben')).toBe('tito.ben');
    expect(suggestUsernameFromName('  Cousin Sofia! ')).toBe('cousin.sofia');
  });

  it('builds synthetic internal auth emails deterministically', () => {
    expect(usernameToAuthEmail('  Reanna ')).toBe('reanna@macorol.wishlist');
  });
});

describe('validateSignInCredentials', () => {
  it('accepts valid usernames and passwords and normalizes username', () => {
    const res = validateSignInCredentials('  Reanna ', '12345678');
    expect(res.ok).toBe(true);
    expect(res.value).toEqual({
      username: 'reanna',
      password: '12345678',
    });
  });

  it('rejects empty username, invalid characters, or blank password', () => {
    expect(validateSignInCredentials('', '12345678').fieldErrors.username).toBeTruthy();
    expect(validateSignInCredentials('bad user!', '12345678').fieldErrors.username).toBeTruthy();
    expect(validateSignInCredentials('reanna', '   ').fieldErrors.password).toBeTruthy();
  });
});

describe('validateNewMemberDraft and validatePasswordReset', () => {
  it('accepts valid new family member details', () => {
    const res = validateNewMemberDraft({
      displayName: '  Tito Ben ',
      username: ' @Tito.Ben ',
      password: '12345678',
    });
    expect(res.ok).toBe(true);
    expect(res.value).toEqual({
      displayName: 'Tito Ben',
      username: 'tito.ben',
      password: '12345678',
    });
  });

  it('rejects missing fields, short usernames, and passwords under 6 characters', () => {
    const res = validateNewMemberDraft({
      displayName: '  ',
      username: 'a',
      password: '123',
    });
    expect(res.ok).toBe(false);
    expect(res.fieldErrors.displayName).toBeTruthy();
    expect(res.fieldErrors.username).toBeTruthy();
    expect(res.fieldErrors.password).toBeTruthy();
    expect(validatePasswordReset('     ').ok).toBe(false);
    expect(validatePasswordReset('123456').ok).toBe(true);
  });
});

describe('validateGiftDraft', () => {
  it('requires a gift name and allows optional note and http(s) store link', () => {
    const res = validateGiftDraft({
      name: '  Wool Scarf  ',
      note: '  Forest green ',
      storeUrl: 'https://example.com/scarf',
    });
    expect(res.ok).toBe(true);
    expect(res.value).toEqual({
      name: 'Wool Scarf',
      note: 'Forest green',
      storeUrl: 'https://example.com/scarf',
    });
  });

  it('converts blank note and store link to null', () => {
    const res = validateGiftDraft({
      name: 'Ceramic Mug',
      note: '   ',
      storeUrl: '',
    });
    expect(res.ok).toBe(true);
    expect(res.value).toEqual({
      name: 'Ceramic Mug',
      note: null,
      storeUrl: null,
    });
  });

  it('rejects javascript: and non-http URLs', () => {
    const res = validateGiftDraft({
      name: 'Book',
      note: '',
      storeUrl: 'javascript:alert(1)',
    });
    expect(res.ok).toBe(false);
    expect(res.fieldErrors.storeUrl).toMatch(/https?:\/\//);
  });

  it('rejects empty gift names', () => {
    const res = validateGiftDraft({
      name: '   ',
      note: 'Nice',
      storeUrl: '',
    });
    expect(res.ok).toBe(false);
    expect(res.fieldErrors.name).toBeTruthy();
  });
});
