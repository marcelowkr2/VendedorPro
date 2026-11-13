import { ReactNode } from 'react';
import { Card } from './card';

export function ChartCard({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return <Card title={title} action={action}>{children}</Card>;
}