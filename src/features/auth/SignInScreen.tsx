import { LogIn } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { useServices } from '../../application/ServiceContext';
import { AppError } from '../../domain/errors';
import { validateSignInCredentials } from '../../domain/validation';
import { Button } from '../../ui/components/Button';
import { NoticeBanner } from '../../ui/components/NoticeBanner';
import { PasswordField, TextField } from '../../ui/components/TextField';
import { HollyEmblem } from '../../ui/icons/HollyEmblem';

interface SignInScreenProps {
  initialError?: string | null;
}

export function SignInScreen({ initialError = null }: SignInScreenProps) {
  const { auth, isPreviewMode } = useServices();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Readonly<Record<string, string>>>({});
  const [bannerError, setBannerError] = useState<string | null>(initialError);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setBannerError(initialError);
  }, [initialError]);

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    setBannerError(null);

    const validation = validateSignInCredentials(username, password);
    if (!validation.ok || !validation.value) {
      setFieldErrors(validation.fieldErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      await auth.signInWithUsername(validation.value.username, validation.value.password);
    } catch (err) {
      setBannerError(
        err instanceof AppError
          ? err.message
          : 'Could not sign in right now. Check your username and password and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="app-page">
      <div className="app-column">
        {isPreviewMode ? (
          <div className="preview-bar" role="status">
            <span>Sample preview sign-in (username: ana, password: 12345678)</span>
          </div>
        ) : null}

        <section className="auth-card" data-surface-thesis>
          <div className="auth-hero">
            <HollyEmblem size={44} />
            <h1 className="auth-title">Family Christmas Wishlist</h1>
            <p className="auth-lead">
              Sign in with your family username and password to browse wishlists, keep your own
              list up to date, and secretly claim gifts.
            </p>
          </div>

          <div className="auth-body">
            {bannerError ? <NoticeBanner tone="error" message={bannerError} /> : null}

            <form className="form-stack" onSubmit={handleSignIn} noValidate>
              <TextField
                label="Username"
                type="text"
                autoComplete="username"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="e.g. Reanna"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (fieldErrors.username) {
                    setFieldErrors((prev) => ({ ...prev, username: '' }));
                  }
                }}
                error={fieldErrors.username || null}
                hint="Not case-sensitive—use the first name or username Lance gave you."
                disabled={isSubmitting}
              />

              <PasswordField
                label="Password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (fieldErrors.password) {
                    setFieldErrors((prev) => ({ ...prev, password: '' }));
                  }
                }}
                error={fieldErrors.password || null}
                hint="You’ll stay signed in on this browser until you choose Sign out."
                disabled={isSubmitting}
              />

              <Button type="submit" fullWidth disabled={isSubmitting} data-primary-action>
                <LogIn size={18} strokeWidth={2} aria-hidden="true" />
                <span>{isSubmitting ? 'Signing in…' : 'Sign in'}</span>
              </Button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
