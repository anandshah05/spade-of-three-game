
'use client';
import { useGameLogic } from '@/hooks/use-game-logic';
import { useMultiplayerGameLogic } from '@/hooks/use-multiplayer-game-logic';
import { PlayingCard } from './PlayingCard';
import { PlayerAvatar } from './PlayerAvatar';
import { ScoreBoard } from './ScoreBoard';
import { Button } from '@/components/ui/button';
import { AnimatePresence, motion } from 'framer-motion';
import { useSearchParams, useParams, useRouter } from 'next/navigation';
import type { Card as CardType, Player, TeamId } from '@/types';
import { Skeleton } from '../ui/skeleton';
import { Separator } from '../ui/separator';
import { determineRoundWinner } from '@/lib/game-utils';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';


export const GameBoard = ({ playerCount: propPlayerCount }: { playerCount?: number, isMultiplayer?: boolean }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = useParams();
  const isMultiplayer = !!params.gameId;
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const playerCount = isMultiplayer ? (null as any) : (propPlayerCount ?? parseInt(searchParams.get('players') as string, 10));

  const gameStateHook = isMultiplayer
    ? useMultiplayerGameLogic(params.gameId as string)
    : useGameLogic(playerCount);
  
  const { gameState, playCard, localPlayerId, setupGame } = gameStateHook as any;
  
  const { players: playerMap, currentTurn, cardsOnTable, leadingSuit, statusMessage, isDealing, gameWinner, currentRound, currentRoundPoints, roundHistory, teams } = gameState || {};
  
  if (!gameState) {
     return <div className="flex items-center justify-center min-h-screen bg-background"><Skeleton className="w-full h-screen" /></div>;
  }
  
  const players = Object.values(playerMap || {}) as Player[];
  const humanPlayer = players.find(p => p.id === localPlayerId);
  const opponents = players.filter(p => p.id !== localPlayerId);

  const hand = humanPlayer?.hand
      .sort((a,b) => a.suit.localeCompare(b.suit) || a.rank.localeCompare(b.rank)) || [];
  
  const roundStarterPlayer = cardsOnTable?.length > 0 ? players.find(p => p.id === cardsOnTable[0].playerId) : null;
  const currentTurnPlayer = players.find(p => p.id === currentTurn);
  const isMyTurn = currentTurnPlayer?.id === localPlayerId;

  let leadingTeamText: string;
  let scoresAreEven = false;

  if (cardsOnTable && cardsOnTable.length > 0) {
    const currentWinningPlayerId = determineRoundWinner(cardsOnTable, leadingSuit);
    const winningPlayer = players.find(p => p.id === currentWinningPlayerId);
    leadingTeamText = winningPlayer ? `${winningPlayer.team} is winning` : 'Awaiting player';
  } else if (teams && teams['Team A'].score !== teams['Team B'].score) {
    leadingTeamText = `${teams['Team A'].score > teams['Team B'].score ? 'Team A' : 'Team B'} is ahead`;
  } else {
    leadingTeamText = 'Scores are even';
    scoresAreEven = true;
  }
  
  const handleCardClick = (player: Player, card: CardType) => {
    const hasLeadingSuit = player.hand.some((c: any) => c.suit === leadingSuit);
    const canPlayCard = !leadingSuit || !hasLeadingSuit || card.suit === leadingSuit;
    const isPlayable = gameWinner == null && !isDealing && isMyTurn && canPlayCard;

    if (!isPlayable) return;

    if (isMobile) {
      if (selectedCardId === card.id) {
        playCard(player.id, card);
        setSelectedCardId(null);
      } else {
        setSelectedCardId(card.id);
      }
    } else {
      playCard(player.id, card);
    }
  };

  const handlePlayedCardClick = (playerDetails: Player | undefined) => {
    if (isMobile && playerDetails) {
      toast({
        description: `This card was played by ${playerDetails.name} | ${playerDetails.team}`,
      });
    }
  };

  const infoIndicators = (
    <div className="flex flex-col items-start gap-1 text-xs md:text-sm bg-secondary/30 p-2 rounded-lg border border-border w-full">
        <div className="grid grid-cols-2 gap-x-2 gap-y-1 w-full">
            <span className="font-bold text-foreground/80">Round No:</span>
            <span className="font-semibold text-accent text-right">{currentRound}</span>
            
            <span className="font-bold text-foreground/80">Lead Suit:</span>
            <span className={`font-semibold text-right ${leadingSuit === 'Spades' ? 'text-accent' : 'text-foreground'}`}>{leadingSuit || '-'}</span>
            
            <span className="font-bold text-foreground/80">Points:</span>
            <span className="font-semibold text-accent text-right">{currentRoundPoints}</span>

            <span className="font-bold text-foreground/80">Started by:</span>
            <span className="font-semibold text-foreground truncate text-right">{roundStarterPlayer?.name ? `${roundStarterPlayer.name} (${roundStarterPlayer.team.charAt(0)})` : '-'}</span>
        </div>
        <Separator className="my-1 bg-border/50" />
        <div className="w-full flex flex-col items-center text-xs md:text-sm font-semibold">
            <span className={cn('text-foreground', { 'text-foreground': scoresAreEven || (teams && teams['Team A'].score !== teams['Team B'].score) })}>{leadingTeamText}</span>
            <span className={cn(
              "truncate rounded-md px-2 py-0.5",
               isMyTurn ? "animate-blink bg-accent text-accent-foreground" : "text-foreground"
            )}>
                {currentTurnPlayer
                    ? isMyTurn
                        ? 'Your Turn'
                        : `${currentTurnPlayer.name}'s Turn`
                    : 'Awaiting player'}
            </span>
        </div>
    </div>
  );

  return (
    <div className="bg-background text-foreground min-h-screen w-full flex flex-col items-center p-2 sm:p-4 pt-4 pb-20 relative overflow-hidden">
      
      <AnimatePresence>
      {gameWinner && (
          <motion.div 
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="absolute inset-0 bg-black/70 z-50 flex flex-col items-center justify-center text-white p-4"
          >
              <h2 className="font-headline text-4xl sm:text-5xl text-accent text-center">Game Over</h2>
              <p className="text-2xl sm:text-3xl mt-4 text-center">{gameWinner} wins with {teams[gameWinner]?.score || 0} points!</p>
              <Button onClick={() => isMultiplayer ? router.push('/') : setupGame()} className="mt-8 text-lg sm:text-xl px-6 sm:px-8 py-5 sm:py-6 bg-accent text-accent-foreground hover:bg-accent/90">
                  {isMultiplayer ? 'Return to Home' : 'Play Again'}
              </Button>
          </motion.div>
      )}
      </AnimatePresence>

      {/* Top bar */}
      <div className="w-full flex justify-between items-start gap-2 p-1 sm:p-2 z-20">
         <div className="flex flex-col gap-2 w-36 sm:w-48 md:w-56">
             <ScoreBoard teams={teams || {}} roundHistory={roundHistory || {}} />
            {infoIndicators}
         </div>
        {/* Opponents Area */}
        <div className="flex flex-wrap items-start justify-end gap-1 md:gap-2 flex-1 py-1 pr-1">
          {opponents.map((player) => (
            <PlayerAvatar key={player.id} player={player} isCurrentTurn={currentTurn === player.id} />
          ))}
        </div>
      </div>
      
      
      {/* Middle Area: Table */}
      <div className="w-full flex-grow flex flex-col items-center justify-center relative my-0 min-h-0">
          <div className="flex items-center justify-center h-auto min-h-28 sm:min-h-36 md:min-h-44 px-4 overflow-x-auto">
              <AnimatePresence>
                  {(cardsOnTable || []).map(({ playerId, card }: any, index: number) => {
                  const playerDetails = players.find((p: any) => p.id === playerId);
                  const teamInitial = playerDetails?.team === 'Team A' ? 'A' : 'B';
                  const fullDisplayName = playerDetails ? `${playerDetails.name} (${teamInitial})` : playerId;

                  return (
                      <motion.div
                        key={`${card.id}-${index}`}
                        initial={{ opacity: 0, scale: 0.5, y: -50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.5 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="flex flex-col items-center -mx-2 sm:-mx-3 md:-mx-4"
                        onClick={() => handlePlayedCardClick(playerDetails)}
                      >
                      <PlayingCard card={card} isCenterCard={true} />
                      <div className="text-center text-xs md:text-sm font-semibold mt-1 truncate w-16 sm:w-24 md:w-32">
                        <span className="sm:hidden">{teamInitial}</span>
                        <span className="hidden sm:inline">{fullDisplayName}</span>
                      </div>
                      </motion.div>
                  );
                  })}
              </AnimatePresence>
          </div>
      </div>


      {/* Bottom Area: Human Player's Hand */}
      {humanPlayer && (
        <div className="flex flex-col items-center justify-end gap-1 w-full">
            <div className="flex justify-center z-10 px-4">
              <AnimatePresence>
                {hand.map((card: any, i: number) => {
                  const hasLeadingSuit = humanPlayer.hand.some((c: any) => c.suit === leadingSuit);
                  const canPlayCard = !leadingSuit || !hasLeadingSuit || card.suit === leadingSuit;
                  const isPlayable = gameWinner == null && !isDealing && isMyTurn && canPlayCard;
                  const isSelected = selectedCardId === card.id;

                  return (
                    <motion.div
                      key={card.id}
                      initial={{ opacity: 0, y: 50 }}
                      animate={{ 
                        opacity: 1, 
                        y: isSelected && isMobile ? -20 : 0, 
                        scale: isSelected && isMobile ? 1.05 : 1,
                        transition: { delay: i * 0.05 + (isDealing ? 0.5 : 0) } 
                      }}
                      exit={{ opacity: 0, y: 50 }}
                      whileHover={!isMobile && isPlayable ? { y: -20, scale: 1.05, zIndex: 50 + i } : {}}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className="ml-[-1rem] sm:ml-[-3.5rem]"
                      style={{ zIndex: i }}
                      onClick={() => handleCardClick(humanPlayer, card)}
                    >
                      <PlayingCard
                        card={card}
                        isPlayable={isPlayable}
                      />
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
            <div className="text-center mt-2 text-foreground/80 flex items-center justify-center gap-x-3 text-xs sm:text-sm md:text-base">
                <span className="font-bold text-sm sm:text-base md:text-lg text-foreground">{humanPlayer.name}</span>
                <Separator orientation="vertical" className="h-4 bg-border" />
                <span className="font-semibold">{humanPlayer.team}</span>
                <Separator orientation="vertical" className="h-4 bg-border" />
                <span className="font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{humanPlayer.hand.length} cards</span>
            </div>
        </div>
      )}
    </div>
  );
};
