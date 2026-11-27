import { ArrowLeft, Check, KeyRound, UserPlus } from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useServices } from '../../application/ServiceContext';
import { AppError } from '../../domain/errors';
import type { FamilyMemberAccount } from '../../domain/models';
import {
  suggestUsernameFromName,
  validateNewMemberDraft,
  validatePasswordReset,
} from '../../domain/validation';
import { Button } from '../../ui/components/Button';
import { NoticeBanner } from '../../ui/components/NoticeBanner';
import { SkeletonList } from '../../ui/components/SkeletonList';
import { StatusBadge } from '../../ui/components/StatusBadge';
import { PasswordField, TextField } from '../../ui/components/TextField';

interface ManageFamilyScreenProps {
  onBack: () => void;
  onMembersChanged: () => Promise<void>;
}

export function ManageFamilyScreen({ onBack, onMembersChanged }: ManageFamilyScreenProps) {
  const { members } = useServices();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [password, setPassword] = useState('');
  const [createFieldErrors, setCreateFieldErrors] = useState<Readonly<Record<string, string>>>({});
  const [createError, setCreateError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const [accounts, setAccounts] = useState<readonly FamilyMemberAccount[] | null>(null);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
  const [accountsError, setAccountsError] = useState<string | null>(null);

  const [resetTargetId, setResetTargetId] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [resetPasswordError, setResetPasswordError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const loadMembers = useCallback(async () => {
    setIsLoadingAccounts(true);
    setAccountsError(null);
    try {
      const list = await members.listMembers();
      setAccounts(list);
    } catch (err) {
      setAccountsError(
        err instanceof AppError
          ? err.message
          : 'Could not load family accounts right now. Check your connection and try again.'
      );
    } finally {
      setIsLoadingAccounts(false);
    }
  }, [members]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  async function handleCreateMember(e: FormEvent) {
    e.preventDefault();
    setCreateFieldErrors({});
    setCreateError(null);
    setStatusMessage(null);

    const validation = validateNewMemberDraft({
      displayName,
      username,
      password,
    });

    if (!validation.ok || !validation.value) {
      setCreateFieldErrors(validation.fieldErrors);
      return;
    }

    setIsCreating(true);
    try {
      const created = await members.createMember(validation.value);
      setDisplayName('');
      setUsername('');
      setUsernameTouched(false);
      setPassword('');
      setStatusMessage(
        `Added ${created.displayName} (username: ${created.username}). They can sign in right away!`
      );
      await Promise.all([loadMembers(), onMembersChanged()]);
    } catch (err) {
      if (err instanceof AppError && err.code === 'USERNAME_TAKEN') {
        setCreateFieldErrors({ username: err.message });
      }
      setCreateError(
        err instanceof AppError
          ? err.message
          : 'Could not add that family member right now. Please try again.'
      );
    } finally {
      setIsCreating(false);
    }
  }

  function startReset(member: FamilyMemberAccount) {
    setResetTargetId(member.memberId);
    setResetPasswordValue('');
    setResetPasswordError(null);
    setCreateError(null);
  }

  function cancelReset() {
    setResetTargetId(null);
    setResetPasswordValue('');
    setResetPasswordError(null);
  }

  async function handleSaveResetPassword(e: FormEvent, member: FamilyMemberAccount) {
    e.preventDefault();
    setResetPasswordError(null);
    setStatusMessage(null);

    const validation = validatePasswordReset(resetPasswordValue);
    if (!validation.ok || !validation.value) {
      setResetPasswordError(validation.fieldErrors.password || 'Enter a valid password.');
      return;
    }

    setIsResetting(true);
    try {
      await members.resetPassword(member.memberId, validation.value);
      setResetTargetId(null);
      setResetPasswordValue('');
      setStatusMessage(
        `Updated the password for ${member.displayName} (@${member.username}).`
      );
    } catch (err) {
      setResetPasswordError(
        err instanceof AppError
          ? err.message
          : 'Could not update the password right now. Please try again.'
      );
    } finally {
      setIsResetting(false);
    }
  }

  return (
    <section className="section-stack" aria-labelledby="manage-family-heading">
      <div>
        <Button variant="secondary" compact onClick={onBack}>
          <ArrowLeft size={16} strokeWidth={2} aria-hidden="true" />
          <span>Back to Family</span>
        </Button>
      </div>

      <div className="surface-card section-stack">
        <div className="section-intro">
          <h2 id="manage-family-heading" className="section-heading">
            Manage family
          </h2>
          <p className="section-lead">
            Add a new family member or reset a password so everyone can sign in smoothly without
            email verification.
          </p>
        </div>

        {statusMessage ? (
          <NoticeBanner
            tone="success"
            message={statusMessage}
            action={
              <Button variant="text" compact onClick={() => setStatusMessage(null)}>
                Dismiss
              </Button>
            }
          />
        ) : null}

        {createError ? <NoticeBanner tone="error" message={createError} /> : null}

        <form className="form-stack" onSubmit={handleCreateMember} noValidate>
          <TextField
            label="Display name"
            type="text"
            required
            maxLength={80}
            placeholder="e.g. Tito Ben"
            value={displayName}
            onChange={(e) => {
              const nextName = e.target.value;
              setDisplayName(nextName);
              if (!usernameTouched) {
                setUsername(suggestUsernameFromName(nextName));
              }
              if (createFieldErrors.displayName) {
                setCreateFieldErrors((prev) => ({ ...prev, displayName: '' }));
              }
            }}
            error={createFieldErrors.displayName || null}
            disabled={isCreating}
          />

          <TextField
            label="Username"
            type="text"
            required
            maxLength={32}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="e.g. tito.ben"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setUsernameTouched(true);
              if (createFieldErrors.username) {
                setCreateFieldErrors((prev) => ({ ...prev, username: '' }));
              }
            }}
            error={createFieldErrors.username || null}
            hint="Not case-sensitive. 2–32 characters using letters, numbers, ., _, or -."
            disabled={isCreating}
          />

          <PasswordField
            label="Initial password"
            required
            maxLength={72}
            autoComplete="new-password"
            placeholder="At least 6 characters"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (createFieldErrors.password) {
                setCreateFieldErrors((prev) => ({ ...prev, password: '' }));
              }
            }}
            error={createFieldErrors.password || null}
            hint="Share this username and password with them so they can sign in right away."
            disabled={isCreating}
          />

          <div>
            <Button type="submit" disabled={isCreating} data-primary-action>
              <UserPlus size={18} strokeWidth={2} aria-hidden="true" />
              <span>{isCreating ? 'Adding member…' : 'Add family member'}</span>
            </Button>
          </div>
        </form>
      </div>

      <div className="surface-card section-stack">
        <div className="section-header-row">
          <h3 className="gift-title">Family accounts</h3>
          {accounts ? (
            <span className="sync-meta tabular-count">
              {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
            </span>
          ) : null}
        </div>

        {accountsError ? (
          <NoticeBanner
            tone="error"
            message={accountsError}
            action={
              <Button variant="secondary" compact onClick={() => void loadMembers()}>
                Try again
              </Button>
            }
          />
        ) : null}

        {isLoadingAccounts && !accounts ? (
          <SkeletonList rows={3} label="Loading family accounts" />
        ) : null}

        {accounts && accounts.length > 0 ? (
          <ul className="member-roster-list">
            {accounts.map((member) => {
              const isResetOpen = resetTargetId === member.memberId;
              return (
                <li key={member.memberId} className="member-roster-row">
                  <div className="member-roster-head">
                    <div className="member-roster-meta">
                      <div className="member-roster-name-row">
                        <span className="gift-title">{member.displayName}</span>
                        {member.isOrganizer ? (
                          <StatusBadge tone="peach">Organizer</StatusBadge>
                        ) : null}
                      </div>
                      <span className="member-roster-handle">@{member.username}</span>
                    </div>

                    {!isResetOpen ? (
                      <Button
                        variant="secondary"
                        compact
                        onClick={() => startReset(member)}
                        aria-label={`Reset password for ${member.displayName}`}
                      >
                        <KeyRound size={15} strokeWidth={2} aria-hidden="true" />
                        <span>Reset password</span>
                      </Button>
                    ) : null}
                  </div>

                  {isResetOpen ? (
                    <form
                      className="inline-reset-box"
                      onSubmit={(e) => handleSaveResetPassword(e, member)}
                      noValidate
                    >
                      <PasswordField
                        label={`New password for ${member.displayName}`}
                        autoComplete="new-password"
                        maxLength={72}
                        placeholder="At least 6 characters"
                        value={resetPasswordValue}
                        onChange={(e) => {
                          setResetPasswordValue(e.target.value);
                          if (resetPasswordError) setResetPasswordError(null);
                        }}
                        error={resetPasswordError}
                        disabled={isResetting}
                      />

                      <div className="gift-button-group">
                        <Button type="submit" compact disabled={isResetting}>
                          <Check size={16} strokeWidth={2} aria-hidden="true" />
                          <span>{isResetting ? 'Saving…' : 'Save password'}</span>
                        </Button>
                        <Button
                          variant="secondary"
                          compact
                          onClick={cancelReset}
                          disabled={isResetting}
                        >
                          Cancel
                        </Button>
                      </div>
                    </form>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </section>
  );
}
