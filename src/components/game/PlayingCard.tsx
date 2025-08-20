
'use client';
import type { Card, Rank } from '@/types';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface PlayingCardProps {
  card: Card;
  isPlayable?: boolean;
  onClick?: () => void;
  className?: string;
  isCenterCard?: boolean;
}

export const PlayingCard = ({ card, isPlayable, onClick, className, isCenterCard = false }: PlayingCardProps) => {
  const getRankName = (rank: Rank): string => {
    switch (rank) {
      case 'A': return 'ace';
      case 'K': return 'king';
      case 'Q': return 'queen';
      case 'J': return 'jack';
      default: return rank;
    }
  };

  const cardImageSrc = `/cards/${getRankName(card.rank)}_of_${card.suit.toLowerCase()}.png`;

  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-md shadow-md border-2 transition-all duration-200 ease-in-out relative',
        isCenterCard 
          ? 'w-16 h-[88px] sm:w-24 sm:h-36' // Center cards
          : 'w-14 h-20 sm:w-24 sm:h-36', // Hand cards
        isPlayable ? 'cursor-pointer border-accent shadow-accent/50' : 'border-black/50',
        onClick && isPlayable ? 'cursor-pointer' : '',
        onClick && !isPlayable ? 'cursor-not-allowed' : '',
        className
      )}
      aria-disabled={!isPlayable}
      aria-label={`${card.rank} of ${card.suit}`}
    >
      <Image
        src={cardImageSrc}
        alt={`${card.rank} of ${card.suit}`}
        layout="fill"
        objectFit="cover"
        className="rounded-sm md:rounded-md"
        unoptimized // Allows using relative paths in src without loader configuration
      />
    </div>
  );
};
