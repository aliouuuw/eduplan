'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { signInAction } from './actions';

const loginSchema = z.object({
  email: z.string().email('Saisissez une adresse e-mail valide.'),
  password: z.string().min(1, 'Saisissez votre mot de passe.'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(data: LoginForm) {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signInAction(data);

      if (!result.ok) {
        setError(result.error);
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch (error) {
      setError('Connexion impossible. Réessayez.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-background">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden fill-primary p-12 lg:flex">
        <div className="relative z-10 flex items-center gap-3">
          <span className="text-xl font-bold tracking-tight text-primary-foreground">EduPlan</span>
        </div>
        <div className="relative z-10 max-w-md">
          <h1 className="text-[40px] font-semibold leading-[1.1] tracking-tight text-primary-foreground">
            L'école, au même endroit.
          </h1>
          <p className="mt-4 text-lg font-medium leading-relaxed text-primary-foreground/80">
            Cours, notes, présences et messages pour toute l'équipe.
          </p>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-10 lg:p-16">
        <div className="mb-8 self-start lg:hidden">
          <span className="text-lg font-bold text-foreground">EduPlan</span>
        </div>
        <div className="w-full max-w-md">
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="font-display text-2xl">Connexion</CardTitle>
            <CardDescription>Votre adresse e-mail et votre mot de passe EduPlan.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Adresse e-mail</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          autoComplete="email"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mot de passe</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          autoComplete="current-password"
                          {...field}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {error && (
                  <div role="alert" className="text-sm text-destructive">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" loading={isLoading}>
                  Se connecter
                </Button>
              </form>
            </Form>

            <div className="mt-6">
              <p className="text-sm text-muted-foreground">
                
                <Link href="/forgot-password" className="font-medium text-foreground underline underline-offset-4">
                  Mot de passe oublié ?
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
