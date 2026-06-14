import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/common/Button';
import Squares from '@/components/common/Squares';
import { useAuthStore } from '@/store/authStore';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { forgotPassword } = useAuthStore();

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await forgotPassword(data.email);
      setSuccessMessage('If an account exists with that email, we have sent a password reset link.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="w-full absolute inset-0">
        <Squares 
          direction="diagonal"
          speed={0.5}
          squareSize={40}
        />
      </div>
      <div className="w-full max-w-md space-y-8 relative z-10">
        <div className="rounded-xl bg-background/50 backdrop-blur-md p-8 shadow-xl border border-border/40">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Forgot Password
            </h2>
            <p className="mt-2 text-sm text-neutral-500">
              Enter your email and we'll send you a link to reset your password.
            </p>
          </div>

          <div>
            {successMessage ? (
              <div className="text-center space-y-4">
                 <div className="p-3 bg-secondary text-success rounded-md text-sm">
                   {successMessage}
                 </div>
                 <Link to="/login" className="block text-center text-sm text-primary hover:underline">
                    Back to Login
                 </Link>
              </div>
            ) : (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div>
                    <label htmlFor="email" className="block text-sm font-medium text-foreground">
                    Email address
                    </label>
                    <div className="relative mt-1">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Mail className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                    </div>
                    <input
                        id="email"
                        type="email"
                        autoComplete="email"
                        className={`block w-full rounded-md border bg-background py-2 pl-10 pr-3 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary sm:text-sm ${
                        errors.email ? 'border-destructive focus:border-destructive focus:ring-destructive' : 'border-input'
                        }`}
                        placeholder="you@example.com"
                        {...register('email')}
                    />
                    </div>
                    {errors.email && (
                    <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>
                    )}
                </div>

                {error && (
                    <div className="p-3 bg-destructive/10 text-destructive rounded-md text-sm">
                    {error}
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    <Button type="submit" className="w-full h-11 flex items-center justify-center gap-2" disabled={isLoading}>
                    {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                    Send Reset Link
                    </Button>
                    <Link to="/login" className="flex items-center justify-center text-sm text-neutral-500 hover:text-primary transition-colors">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Login
                    </Link>
                </div>
                </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
