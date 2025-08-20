
'use client';
import type { Player } from '@/types';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface PlayerAvatarProps {
  player: Player;
  isCurrentTurn: boolean;
}

export const PlayerAvatar = ({ player, isCurrentTurn }: PlayerAvatarProps) => {
  const teamInitial = player.team === 'Team A' ? 'A' : 'B';
  const displayName = `${player.name || player.id} (${teamInitial})`;
  
  return (
    <motion.div
      className={cn(
        'transition-all duration-300 z-10',
        isCurrentTurn ? 'scale-110 z-20' : 'scale-100'
      )}
      animate={{ scale: isCurrentTurn ? 1.1 : 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 15 }}
    >
      <div className={cn(
          'w-20 h-28 md:w-28 md:h-36 flex flex-col justify-center items-center text-center rounded-lg shadow-lg relative overflow-hidden p-2', 
          isCurrentTurn ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground' : 'ring-0',
          player.team === 'Team A' ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'
      )}>
        <div className="w-12 h-12 md:w-16 md:h-16 bg-background/90 text-foreground rounded-full flex items-center justify-center mb-2">
            <span className="text-2xl md:text-4xl font-bold">{teamInitial}</span>
        </div>
        <div className="font-semibold text-xs md:text-sm truncate w-full">{displayName}</div>
        <div className="text-[10px] md:text-xs font-mono">{player.hand?.length || 0} cards</div>
      </div>
    </motion.div>
  );
};
