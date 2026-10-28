import Link from 'next/link';
import { Hourglass } from 'lucide-react';

import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';

// A route that exists in the IA but whose screen is not built yet. Says what it will hold; never fakes data.
export function PendingScreen({ title, will, home }: { title: string; will: string; home: string }) {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={title} />
      <Card>
        <EmptyState
          icon={<Hourglass />}
          title="Cet écran arrive bientôt"
          action={
            <Button variant="outline" asChild>
              <Link href={home}>Retour à l&apos;accueil</Link>
            </Button>
          }
        >
          {will}
        </EmptyState>
      </Card>
    </div>
  );
}
