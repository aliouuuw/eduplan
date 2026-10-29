'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/auth-client';
import { frSpaces } from '@/lib/fr';

const resetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, '8 caractères au minimum.'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Les deux mots de passe diffèrent.',
    path: ['confirmPassword'],
  });

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

const DEAD_LINK = frSpaces('Ce lien ne marche plus : il a déjà servi ou il a expiré.');

// The reset email links here with ?token=…, or ?error=INVALID_TOKEN once the link is used or expired (D49).
export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPassword />
    </Suspense>
  );
}

function ResetPassword() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get('token');
  const [error, setError] = useState<string | null>(params.get('error') || !token ? DEAD_LINK : null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  async function onSubmit(data: ResetPasswordForm) {
    if (!token) return;
    setIsSubmitting(true);
    setError(null);
    const result = await authClient.resetPassword({ newPassword: data.newPassword, token });
    setIsSubmitting(false);
    if (result.error) return setError(DEAD_LINK);
    router.push('/login');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="font-display text-2xl">Nouveau mot de passe</CardTitle>
          <CardDescription>Vous vous connecterez avec lui juste après.</CardDescription>
        </CardHeader>
        <CardContent>
          {token ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nouveau mot de passe</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmez-le</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" loading={isSubmitting}>
                  Enregistrer
                </Button>
              </form>
            </Form>
          ) : (
            <p role="alert" className="text-sm text-destructive">{error}</p>
          )}
          <p className="mt-6 text-sm text-muted-foreground">
            <Link href="/forgot-password" className="font-medium text-foreground underline underline-offset-4">
              Demander un nouveau lien
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
