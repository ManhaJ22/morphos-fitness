'use client';

import { Suspense } from 'react';
import FitnessCoach from '@/components/FitnessCoach';

export default function CoachPage() {
  return (
    <div className="h-screen">
      <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>
        <FitnessCoach />
      </Suspense>
    </div>
  );
}