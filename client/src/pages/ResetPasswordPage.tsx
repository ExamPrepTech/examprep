import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useAuthStore } from '@/store/authStore';

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data: any) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const { resetPassword } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
        setError("Missing reset token. Please check your link.");
        return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await resetPassword(token, data.password);
      navigate('/'); // Go to dashboard
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password. Link may be expired.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
       return (
        <div className="flex min-h-screen items-center justify-center bg-background px-4">
            <div className="text-center">
                 <h2 className="text-2xl font-bold mb-4">Invalid Link</h2>
                 <p className="text-muted-foreground mb-4">This password reset link is invalid or missing a token.</p>
                 <Link to="/forgot-password" className="text-primary hover:underline">Request a new one</Link>
            </div>
        </div>
       )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-foreground">
            Reset Password
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your new password below.
          </p>
        </div>

        <div className="mt-8 space-y-6">
          <div className="rounded-md bg-card p-6 shadow-sm border border-border">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground">
                  New Password
                </label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    className={`block w-full rounded-md border bg-background py-2 pl-10 pr-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm ${
                      errors.password ? 'border-destructive focus:border-destructive focus:ring-destructive' : 'border-input'
                    }`}
                    placeholder="••••••••"
                    {...register('password')}
                  />
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

               <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
                  Confirm Password
                </label>
                <div className="relative mt-1">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Lock className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  </div>
                  <input
                    id="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    className={`block w-full rounded-md border bg-background py-2 pl-10 pr-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm ${
                      errors.confirmPassword ? 'border-destructive focus:border-destructive focus:ring-destructive' : 'border-input'
                    }`}
                    placeholder="••••••••"
                    {...register('confirmPassword')}
                  />
                </div>
                {errors.confirmPassword && (
                    <p className="mt-1 text-sm text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>


              {error && (
                <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                  {error}
                </div>
              )}

              <Button type="submit" className="w-full flex items-center justify-center gap-2" disabled={isLoading}>
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Reset Password 
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
