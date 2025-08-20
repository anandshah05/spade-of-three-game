
'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { GameBoard } from '@/components/game/GameBoard';
import { Skeleton } from '@/components/ui/skeleton';

function GamePageContent() {
  const searchParams = useSearchParams();
  const players = searchParams.get('players');
  const playerCount = players ? parseInt(players, 10) : 4;

  if (![4, 6, 8, 12].includes(playerCount)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <h1 className="text-2xl font-bold">Invalid number of players.</h1>
        <p>Please start a new game with 4, 6, 8, or 12 players.</p>
      </div>
    );
  }

  return <GameBoard playerCount={playerCount} />;
}


export default function GamePage() {
  return (
    <Suspense fallback={<div className="bg-background min-h-screen"><Skeleton className="w-full h-full" /></div>}>
      <GamePageContent />
    </Suspense>
  );
}
