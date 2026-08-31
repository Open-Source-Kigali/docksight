import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { LoaderCircle, ShieldCheck } from 'lucide-react';
import { AuthLayout, FormError, FormField } from '@/features/auth/AuthLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApiError } from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const MIN_PASSWORD_LENGTH = 8;

/**
 * First-run screen. Only reachable while the server reports
 * `setupRequired: true`; the endpoint behind it refuses to run once any user
 * exists, so a stale tab cannot create a second admin.
 */
export function SetupPage() {
  useDocumentTitle('Setup');

  const navigate = useNavigate();
  const status = useAuthStore((state) => state.status);
  const completeSetup = useAuthStore((state) => state.completeSetup);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') {
    return <Navigate to="/dashboard" replace />;
  }
  if (status === 'unauthenticated') {
    return <Navigate to="/login" replace />;
  }

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD_LENGTH;
  const mismatch = confirm.length > 0 && confirm !== password;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      await completeSetup(email, password);
      navigate('/dashboard', { replace: true });
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.status === 0
          ? 'Cannot reach the DockSight server.'
          : caught instanceof Error
            ? caught.message
            : 'Could not create the administrator account',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title="Welcome to DockSight"
      description="Create the administrator account for this instance. This screen appears only once."
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FormError message={error} />

        <FormField label="Email" htmlFor="email">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="username"
            autoFocus
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@example.com"
          />
        </FormField>

        <FormField
          label="Password"
          htmlFor="password"
          hint={
            tooShort ? (
              <span className="text-danger">
                Must be at least {MIN_PASSWORD_LENGTH} characters
              </span>
            ) : (
              `At least ${MIN_PASSWORD_LENGTH} characters.`
            )
          }
        >
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
          />
        </FormField>

        <FormField
          label="Confirm password"
          htmlFor="confirm"
          hint={
            mismatch ? (
              <span className="text-danger">Passwords do not match</span>
            ) : undefined
          }
        >
          <Input
            id="confirm"
            name="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            placeholder="••••••••"
          />
        </FormField>

        <Button
          type="submit"
          className="w-full"
          disabled={
            submitting ||
            !email ||
            password.length < MIN_PASSWORD_LENGTH ||
            password !== confirm
          }
        >
          {submitting ? (
            <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <ShieldCheck className="h-4 w-4" aria-hidden />
          )}
          {submitting ? 'Creating account…' : 'Create administrator'}
        </Button>
      </form>
    </AuthLayout>
  );
}
