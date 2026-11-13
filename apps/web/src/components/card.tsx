import { ReactNode } from 'react';
import { cn } from '../lib/utils';

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  action?: ReactNode;
}

export function Card({ title, children, className, action }: CardProps) {
  return (
    <div className={cn('card', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}