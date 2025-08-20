
'use client';
import { Suspense } from 'react';
import { GameBoard } from '@/components/game/GameBoard';
import { Skeleton } from '@/components/ui/skeleton';

function GamePageContent() {
  return <GameBoard isMultiplayer={true} />;
}

export default function GamePage() {
  return (
    <Suspense fallback={<div className="bg-background min-h-screen"><Skeleton className="w-full h-full" /></div>}>
      <GamePageContent />
    </Suspense>
  );
}
