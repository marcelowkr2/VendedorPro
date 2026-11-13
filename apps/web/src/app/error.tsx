'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md text-center">
        <h2 className="text-xl font-bold text-red-600 mb-2">Algo deu errado</h2>
        <p className="text-slate-500 mb-4">{error.message}</p>
        <button onClick={() => reset()} className="btn btn-primary">Tentar novamente</button>
      </div>
    </div>
  );
}