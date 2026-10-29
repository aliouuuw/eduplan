'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { authClient } from '@/lib/auth-client';

const forgotPasswordSchema = z.object({
  email: z.string().email('Saisissez une adresse e-mail valide.'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const form = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  async function onSubmit(data: ForgotPasswordForm) {
    setIsSubmitting(true);
    setError(null);
    // Neon Auth emails the link (D49) and answers the same whether or not the email has an account.
    // The link leaves from the Neon Auth host, so the way back must be an absolute URL to this app.
    const { error } = await authClient.requestPasswordReset({
      email: data.email,
      redirectTo: new URL('/reset-password', window.location.origin).href,
    });
    setIsSubmitting(false);
    if (error) setError("L'e-mail n'a pas pu partir. Réessayez dans un instant.");
    else setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-5 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="font-display text-2xl">Mot de passe oublié</CardTitle>
          <CardDescription>
            {sent ? 'Si un compte utilise cette adresse, un lien est en route.' : 'Nous vous envoyons un lien pour en choisir un nouveau.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!sent && (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse e-mail</FormLabel>
                      <FormControl>
                        <Input type="email" autoComplete="email" {...field} disabled={isSubmitting} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" loading={isSubmitting}>
                  Envoyer le lien
                </Button>
              </form>
            </Form>
          )}
          <p className="mt-6 text-sm text-muted-foreground">
            <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
              Retour à la connexion
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
