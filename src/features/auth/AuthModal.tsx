import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { useAuth } from './authContext';
import { useI18n } from '@/lib/i18n/i18nContext';
import { useToast } from '@/components/ui/Toast';
import { Mail, Lock, User, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { AppLogo } from '@/components/ui/AppLogo';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'signin' | 'signup';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'signin',
}) => {
  const {
    signInWithPassword,
    signUpWithPassword,
    signInWithMagicLink,
    signInWithGoogle,
    resetPasswordForEmail,
    enableGoogleLogin,
  } = useAuth();
  const { t } = useI18n();
  const { success, error } = useToast();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'magic'>(defaultMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setMessage(null);
    setIsLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      if (mode === 'signin') {
        const res = await signInWithPassword(email.trim(), password);
        if (res.error) throw res.error;
        success('Signed in successfully!');
        handleClose();
      } else if (mode === 'signup') {
        if (password.length < 8) {
          throw new Error('Password must be at least 8 characters long.');
        }
        const res = await signUpWithPassword(email.trim(), password, fullName.trim());
        if (res.error) throw res.error;

        if (res.needsEmailConfirmation) {
          setMessage('Account created! Please check your email to verify your address before logging in.');
        } else {
          success('Welcome! Your account is created.');
          handleClose();
        }
      } else if (mode === 'forgot') {
        const res = await resetPasswordForEmail(email.trim());
        if (res.error) throw res.error;
        setMessage('Password reset instructions have been sent to your email.');
      } else if (mode === 'magic') {
        const res = await signInWithMagicLink(email.trim());
        if (res.error) throw res.error;
        setMessage('Magic sign-in link sent to your email inbox.');
      }
    } catch (err: any) {
      error(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      maxWidth="sm"
      title={
        mode === 'signup'
          ? 'Create Account'
          : mode === 'forgot'
          ? 'Reset Password'
          : mode === 'magic'
          ? 'Magic Link Sign-In'
          : 'Sign In to Staff Manager'
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-left">
        <div className="flex justify-center pb-1">
          <AppLogo size="md" showText={true} />
        </div>
        {message ? (
          <div className="p-4 rounded-xl bg-[var(--surface-2)] border border-[var(--border)] text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-[var(--accent)] mx-auto" />
            <p className="text-xs sm:text-sm text-[var(--text)] leading-relaxed">{message}</p>
            <Button variant="secondary" size="sm" onClick={() => setMode('signin')}>
              Back to Sign In
            </Button>
          </div>
        ) : (
          <>
            {mode === 'signup' && (
              <FormField label="Full Name" required>
                <Input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rajesh Kumar"
                  prefixNode={<User className="w-4 h-4" />}
                />
              </FormField>
            )}

            <FormField label="Email Address" required>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                prefixNode={<Mail className="w-4 h-4" />}
              />
            </FormField>

            {(mode === 'signin' || mode === 'signup') && (
              <FormField
                label="Password"
                required
                helpText={mode === 'signup' ? 'Minimum 8 characters' : undefined}
              >
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  prefixNode={<Lock className="w-4 h-4" />}
                />
              </FormField>
            )}

            {mode === 'signin' && (
              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => setMode('magic')}
                  className="text-[var(--text-muted)] hover:text-[var(--text)]"
                >
                  Sign in with Magic Link
                </button>
                <button
                  type="button"
                  onClick={() => setMode('forgot')}
                  className="text-[var(--accent)] font-semibold hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              fullWidth
              isLoading={isLoading}
              className="mt-2"
            >
              {mode === 'signup' ? 'Sign Up' : mode === 'forgot' ? 'Send Reset Link' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </Button>

            {enableGoogleLogin && (
              <Button
                type="button"
                variant="outline"
                fullWidth
                onClick={() => signInWithGoogle()}
              >
                Continue with Google
              </Button>
            )}

            <div className="pt-2 border-t border-[var(--border)] text-center text-xs text-[var(--text-muted)]">
              {mode === 'signin' ? (
                <span>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="text-[var(--accent)] font-semibold hover:underline cursor-pointer"
                  >
                    Sign up now
                  </button>
                </span>
              ) : (
                <span>
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => setMode('signin')}
                    className="text-[var(--accent)] font-semibold hover:underline cursor-pointer"
                  >
                    Sign in
                  </button>
                </span>
              )}
            </div>
          </>
        )}
      </form>
    </Modal>
  );
};
