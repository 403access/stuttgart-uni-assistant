import { useParams } from '@tanstack/react-router';
import { PageHeader, Card, EmptyState } from '@ua/ui-react';

export function PlaceholderPage() {
  return (
    <>
      <PageHeader title="Wird portiert" subtitle="Diese Ansicht läuft noch in der bisherigen Verwaltung." />
      <Card>
        <EmptyState title="Noch nicht im React-Admin" detail="Die Seite folgt in einem der nächsten Schritte. Die bisherige Ansicht bleibt unter /admin erreichbar, bis alle Seiten portiert sind." />
      </Card>
    </>
  );
}

export function UserDetailPlaceholder() {
  const params = useParams({ strict: false }) as { userId?: string };
  return (
    <>
      <PageHeader title="Nutzer-Detail" subtitle={params.userId ?? ''} />
      <Card>
        <EmptyState title="Detailansicht folgt" detail="Die Kontodetails, Sitzungen, Geräte, Portaldaten und Plattformen werden als Nächstes portiert." />
      </Card>
    </>
  );
}
