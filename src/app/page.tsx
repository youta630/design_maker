'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to app for testing
    router.push('/landing');
  }, [router]);

  return (
    <div className="min-h-screen text-black flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 text-white mx-auto mb-4"></div>
        <p className="text-white text-lg">Redirecting to app...</p>
      </div>
    </div>
  );
}