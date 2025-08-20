
'use client';
import { useState, useEffect, useCallback } from 'react';
import type { GameState, Player, Card, Suit, TeamId, RoundSummary } from '@/types';
import { createDeck, dealCards, findStartingPlayer, determineRoundWinner, getCardPointValue } from '@/lib/game-utils';
import { simulateAiOpponent } from '@/ai/flows/ai-opponent-simulation';
import { useToast } from "@/hooks/use-toast";

const createInitialState = (playerCount: number): GameState => ({
  players: {},
  teams: {
    'Team A': { score: 0, members: [] },
    'Team B': { score: 0, members: [] },
  },
  roundHistory: {},
  playerCount,
  currentTurn: '',
  currentRound: 1,
  currentRoundPoints: 0,
  cardsOnTable: [],
  leadingSuit: null,
  roundWinner: null,
  lastRoundWinner: null,
  gameWinner: null,
  isDealing: true,
  statusMessage: 'Starting new game...',
});

export const useGameLogic = (playerCount: number) => {
  const [gameState, setGameState] = useState<GameState>(() => createInitialState(playerCount));
  const { toast } = useToast();

  const setupGame = useCallback(() => {
    setGameState(createInitialState(playerCount));

    setTimeout(() => {
        const deck = createDeck(playerCount);
        // For AI games, assume 'Player 1' is the human.
        const playersArray = dealCards(deck, playerCount, ['Player 1']);
        const playersMap = playersArray.reduce((acc, p) => ({...acc, [p.id]: p }), {});
        
        const startingPlayerId = findStartingPlayer(playersArray, playerCount);
        const startingPlayer = playersMap[startingPlayerId];

        const teams = {
          'Team A': { score: 0, members: playersArray.filter(p => p.team === 'Team A').map(p => p.id) },
          'Team B': { score: 0, members: playersArray.filter(p => p.team === 'Team B').map(p => p.id) },
        }

        setGameState(prev => ({
            ...prev,
            players: playersMap,
            teams,
            currentTurn: startingPlayerId,
            isDealing: false,
            statusMessage: `${startingPlayer?.name || startingPlayerId}'s turn to start.`,
        }));
    }, 1500);
  }, [playerCount]);
  
  useEffect(() => {
    setupGame();
  }, [setupGame]);

  const calculateScores = useCallback((history: Record<number, RoundSummary>): { 'Team A': number, 'Team B': number } => {
    const scores = { 'Team A': 0, 'Team B': 0 };
    for (const round in history) {
      const summary = history[round];
      scores[summary.winningTeam] += summary.points;
    }
    return scores;
  }, []);

  const endRound = useCallback(() => {
    setGameState(prev => {
        if (!prev.players) return prev;
        const winnerId = determineRoundWinner(prev.cardsOnTable, prev.leadingSuit);
        const winner = prev.players[winnerId];
        if (!winner) return prev;
        const winningTeam = winner.team;
        const roundPoints = prev.currentRoundPoints;

        const newRoundSummary: RoundSummary = {
          roundNumber: prev.currentRound,
          winnerId: winnerId,
          winningTeam: winningTeam,
          points: roundPoints,
        };

        const newRoundHistory = {
            ...prev.roundHistory,
            [prev.currentRound]: newRoundSummary
        };

        const newScores = calculateScores(newRoundHistory);
        const updatedTeams = {
            'Team A': { ...prev.teams['Team A'], score: newScores['Team A'] },
            'Team B': { ...prev.teams['Team B'], score: newScores['Team B'] },
        };

        return {
            ...prev,
            roundHistory: newRoundHistory,
            teams: updatedTeams,
            roundWinner: winnerId,
            lastRoundWinner: winnerId,
            statusMessage: `${winner.name || winnerId} won the round!`,
        };
    });
  }, [calculateScores]);

  const startNextRound = useCallback(() => {
    setGameState(prev => {
        if (!prev.lastRoundWinner || !prev.players) return prev;
        
        const totalRounds = { 4: 13, 6: 8, 8: 13, 12: 8 }[prev.playerCount] || 0;
        const isGameOver = prev.currentRound >= totalRounds;

        if (isGameOver) {
          const finalScores = prev.teams;
          let gameWinner: TeamId | null = null;
          if (finalScores['Team A'].score > finalScores['Team B'].score) {
            gameWinner = 'Team A';
          } else if (finalScores['Team B'].score > finalScores['Team A'].score) {
            gameWinner = 'Team B';
          }

          return {
            ...prev,
            gameWinner: gameWinner,
            statusMessage: gameWinner ? `Game Over! ${gameWinner} wins!` : "Game Over! It's a tie!",
          };
        }
        
        const nextTurnPlayer = prev.players[prev.lastRoundWinner];

        return {
            ...prev,
            currentRound: prev.currentRound + 1,
            cardsOnTable: [],
            leadingSuit: null,
            roundWinner: null,
            currentRoundPoints: 0,
            currentTurn: prev.lastRoundWinner,
            statusMessage: `Round ${prev.currentRound + 1}: ${nextTurnPlayer?.name || nextTurnPlayer?.id}'s turn.`
        };
    });
  }, []);

  const playCard = useCallback((playerId: string, card: Card) => {
    setGameState(prev => {
      if (prev.currentTurn !== playerId || prev.roundWinner || !prev.players) return prev;
      
      const player = prev.players[playerId];
      if (!player) return prev;
      
      const cardValue = getCardPointValue(card);
      const newRoundPoints = prev.currentRoundPoints + cardValue;

      const newHand = player.hand.filter(c => c.id !== card.id);
      const newPlayers = {
        ...prev.players,
        [playerId]: { ...player, hand: newHand }
      };
      
      const newCardsOnTable = [...prev.cardsOnTable, { playerId, card }];
      
      let newLeadingSuit = prev.leadingSuit;
      if (!newLeadingSuit) {
        newLeadingSuit = card.suit;
      }

      const playerArray = Object.values(prev.players);
      const nextPlayerIndex = (playerArray.findIndex(p => p.id === prev.currentTurn) + 1) % prev.playerCount;
      const nextPlayerId = playerArray[nextPlayerIndex].id;
      const nextPlayer = prev.players[nextPlayerId];
      
      const isRoundOver = newCardsOnTable.length === prev.playerCount;
      
      return {
        ...prev,
        players: newPlayers,
        cardsOnTable: newCardsOnTable,
        leadingSuit: newLeadingSuit,
        currentRoundPoints: newRoundPoints,
        currentTurn: isRoundOver ? '' : nextPlayerId, // Pause turns if round is over
        statusMessage: isRoundOver ? 'Calculating round winner...' : `${nextPlayer?.name || nextPlayer?.id}'s turn.`
      };
    });
  }, []);
  
  // Effect to handle end-of-round logic
  useEffect(() => {
    const isRoundOver = gameState.cardsOnTable.length === gameState.playerCount;
    if (isRoundOver && !gameState.roundWinner) {
      const timeout = setTimeout(endRound, 1000);
      return () => clearTimeout(timeout);
    }
  }, [gameState.cardsOnTable.length, gameState.playerCount, gameState.roundWinner, endRound]);
  
  // Effect to handle start-of-next-round logic
  useEffect(() => {
    if(gameState.roundWinner) {
      const timeout = setTimeout(startNextRound, 3000);
      return () => clearTimeout(timeout);
    }
  }, [gameState.roundWinner, startNextRound]);

  // Effect to show toast notification for round winner
  useEffect(() => {
    if (gameState.roundWinner && gameState.players) {
        const winner = gameState.players[gameState.roundWinner];
        const roundSummary = gameState.roundHistory?.[gameState.currentRound];
        if (winner && roundSummary) {
            toast({
                title: `Round ${roundSummary.roundNumber} Winner`,
                description: `[${winner.team} | ${winner.name || winner.id}] wins with ${roundSummary.points} points!`,
            });
        }
    }
  }, [gameState.roundWinner, gameState.players, gameState.roundHistory, gameState.currentRound, toast]);


  const runAiTurn = useCallback(async (player: Player) => {
    if (!gameState.players) return;
    setGameState(prev => ({...prev, statusMessage: `${player.name || player.id} is thinking...`}))

    try {
        const gameStateString = JSON.stringify({
            teams: gameState.teams,
            currentRound: gameState.currentRound,
            currentRoundPoints: gameState.currentRoundPoints,
            cardsOnTable: gameState.cardsOnTable,
            leadingSuit: gameState.leadingSuit,
            lastRoundWinner: gameState.lastRoundWinner,
            players: Object.values(gameState.players).map(p => ({ 
              id: p.id, 
              name: p.name || p.id,
              team: p.team, 
              hand: p.id === player.id ? p.hand : `${p.hand.length} cards` 
            })),
        });

        let playableCards = player.hand.filter(card => {
            const hasLeadingSuit = player.hand.some(c => c.suit === gameState.leadingSuit);
            if (!gameState.leadingSuit || !hasLeadingSuit) return true;
            return card.suit === gameState.leadingSuit;
        });
        
        if (playableCards.length === 0 && player.hand.length > 0) { 
             playableCards = player.hand;
        }

        if (playableCards.length === 0) {
            return;
        }

        const aiInput = {
          gameState: gameStateString,
          difficulty: 'medium',
          currentPlayer: player.id,
          playableCards: playableCards,
        }

        const { move } = await simulateAiOpponent(aiInput);

        const cardToPlay = playableCards.find(c => c.id === move);
        
        if (cardToPlay) {
            playCard(player.id, cardToPlay);
        } else {
            console.warn(`AI for ${player.id} returned an invalid move: '${move}'. Playing a random valid card.`);
            playCard(player.id, playableCards[0]);
        }

    } catch (error) {
        console.error(`AI opponent simulation failed: ${error}`);
        if (!player || !player.hand) {
            console.error("AI turn failed because player or hand was undefined.");
            return;
        }
        let playableCards = player.hand.filter(card => {
            const hasLeadingSuit = player.hand.some(c => c.suit === gameState.leadingSuit);
            if (!gameState.leadingSuit || !hasLeadingSuit) return true;
            return card.suit === gameState.leadingSuit;
        });
        if (playableCards.length === 0 && player.hand.length > 0) {
          playableCards = player.hand;
        }
        if (playableCards.length > 0) {
            playCard(player.id, playableCards[0]);
        }
    }
  }, [gameState, playCard]);

  useEffect(() => {
    if (!gameState.players || Object.keys(gameState.players).length === 0) return;
    const currentPlayer = gameState.players[gameState.currentTurn];
    if (currentPlayer && !currentPlayer.isHuman && !gameState.roundWinner && !gameState.isDealing) {
      const timeout = setTimeout(() => runAiTurn(currentPlayer), 1500);
      return () => clearTimeout(timeout);
    }
  }, [gameState.currentTurn, gameState.players, gameState.roundWinner, gameState.isDealing, runAiTurn]);


  return { gameState, playCard, setupGame, localPlayerId: Object.values(gameState.players || {}).find(p => p.isHuman)?.id };
};
