
'use client';
import { useState, useEffect, useCallback } from 'react';
import { ref, onValue, runTransaction, set } from 'firebase/database';
import { database } from '@/lib/firebase';
import type { GameState, Card, TeamId, RoundSummary, Player } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { determineRoundWinner, getCardPointValue } from '@/lib/game-utils';
import { simulateAiOpponent } from '@/ai/flows/ai-opponent-simulation';

export const useMultiplayerGameLogic = (gameId: string) => {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [localPlayerId, setLocalPlayerId] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        let playerId = sessionStorage.getItem(`player_id_${gameId}`);
        if (playerId) {
            setLocalPlayerId(playerId);
        }
    }, [gameId]);
    
    useEffect(() => {
        if (!gameId) return;
        const gameRef = ref(database, `games/${gameId}`);

        const unsubscribe = onValue(gameRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val() as GameState;
                 // Firebase Realtime DB doesn't store empty arrays, so we need to initialize them
                data.cardsOnTable = data.cardsOnTable || [];
                if (data.players) {
                  Object.values(data.players).forEach(p => {
                      p.hand = p.hand || [];
                  });
                }
                setGameState(data);
            } else {
                setGameState(null); // Or handle redirect
            }
        });

        return () => unsubscribe();
    }, [gameId]);

     const playCard = useCallback((playerId: string, card: Card) => {
        if (!gameId) return;

        const gameRef = ref(database, `games/${gameId}`);

        runTransaction(gameRef, (currentState: GameState | null) => {
            if (!currentState || currentState.currentTurn !== playerId || currentState.roundWinner) {
                return currentState;
            }
            
            const playerArray = Object.values(currentState.players || {});
            const player = playerArray.find(p => p.id === playerId);
            if (!player) return currentState;
            
            // Validate move for human players
            if (player.isHuman) {
                const hasLeadingSuit = player.hand.some(c => c.suit === currentState.leadingSuit);
                if (currentState.leadingSuit && hasLeadingSuit && card.suit !== currentState.leadingSuit) {
                    toast({
                        title: "Invalid Move",
                        description: `You must play a card of the leading suit (${currentState.leadingSuit}).`,
                        variant: "destructive",
                    });
                    // Abort transaction by returning undefined
                    return;
                }
            }

            const cardValue = getCardPointValue(card);
            currentState.currentRoundPoints = (currentState.currentRoundPoints || 0) + cardValue;

            player.hand = player.hand.filter(c => c.id !== card.id);
            currentState.players[player.id] = player;
            currentState.cardsOnTable = [...(currentState.cardsOnTable || []), { playerId, card }];

            if (!currentState.leadingSuit) {
                currentState.leadingSuit = card.suit;
            }
            
            const currentPlayerIndex = playerArray.findIndex(p => p.id === currentState.currentTurn);
            const nextPlayerIndex = (currentPlayerIndex + 1) % currentState.playerCount;
            const nextPlayerId = playerArray[nextPlayerIndex].id;
            const nextPlayer = playerArray[nextPlayerIndex];

            const isRoundOver = currentState.cardsOnTable.length === currentState.playerCount;

            if (isRoundOver) {
                currentState.currentTurn = ''; // Pause turns
                currentState.statusMessage = 'Calculating round winner...';
            } else {
                currentState.currentTurn = nextPlayerId;
                currentState.statusMessage = `${nextPlayer?.name || nextPlayer?.id}'s turn.`;
            }

            return currentState;
        }).catch(error => {
            console.error("Transaction failed: ", error)
            toast({
                title: "Error",
                description: "There was a problem playing your card. Please try again.",
                variant: "destructive",
            });
        });

    }, [gameId, toast]);

    const runAiTurn = useCallback(async (player: Player, currentGameState: GameState) => {
        if (!currentGameState.players) return;
        
        const gameRef = ref(database, `games/${gameId}`);
        await runTransaction(gameRef, (state: GameState | null) => {
            if (!state) return null;
            state.statusMessage = `${player.name || player.id} is thinking...`;
            return state;
        });

        try {
            const gameStateString = JSON.stringify({
                teams: currentGameState.teams,
                currentRound: currentGameState.currentRound,
                currentRoundPoints: currentGameState.currentRoundPoints,
                cardsOnTable: currentGameState.cardsOnTable,
                leadingSuit: currentGameState.leadingSuit,
                lastRoundWinner: currentGameState.lastRoundWinner,
                players: Object.values(currentGameState.players).map(p => ({ 
                  id: p.id, 
                  name: p.name || p.id,
                  team: p.team, 
                  hand: p.id === player.id ? p.hand : `${p.hand.length} cards` 
                })),
            });

            let playableCards = player.hand.filter(card => {
                const hasLeadingSuit = player.hand.some(c => c.suit === currentGameState.leadingSuit);
                if (!currentGameState.leadingSuit || !hasLeadingSuit) return true;
                return card.suit === currentGameState.leadingSuit;
            });
            
            if (playableCards.length === 0 && player.hand.length > 0) { 
                 playableCards = player.hand;
            }

            if (playableCards.length === 0) {
                console.warn(`AI Bot ${player.id} has no cards to play.`);
                return;
            }

            const aiInput = {
              gameState: gameStateString,
              difficulty: 'hard', // Bots are experts
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
            console.error(`AI opponent simulation failed for bot ${player.id}: ${error}`);
            let playableCards = player.hand.filter(card => {
                const hasLeadingSuit = player.hand.some(c => c.suit === currentGameState.leadingSuit);
                if (!currentGameState.leadingSuit || !hasLeadingSuit) return true;
                return card.suit === currentGameState.leadingSuit;
            });
            if (playableCards.length === 0 && player.hand.length > 0) {
              playableCards = player.hand;
            }
            if (playableCards.length > 0) {
                playCard(player.id, playableCards[0]);
            }
        }
      }, [gameId, playCard]);


    // Effect to trigger AI turn
    useEffect(() => {
        if (gameState && gameState.currentTurn && gameState.players) {
            const currentPlayer = gameState.players[gameState.currentTurn];
            if (currentPlayer && !currentPlayer.isHuman && !gameState.roundWinner) {
                const timeout = setTimeout(() => runAiTurn(currentPlayer, gameState), 1500);
                return () => clearTimeout(timeout);
            }
        }
    }, [gameState, runAiTurn]);


    const handleRoundEnd = useCallback(() => {
        if (!gameId || !gameState || gameState.cardsOnTable.length !== gameState.playerCount || gameState.roundWinner) {
            return;
        }

        const gameRef = ref(database, `games/${gameId}`);
        
        runTransaction(gameRef, (currentState: GameState | null) => {
            if (!currentState || currentState.roundWinner || !currentState.players) return currentState; // Already processed
            
            const winnerId = determineRoundWinner(currentState.cardsOnTable, currentState.leadingSuit);
            const winner = currentState.players[winnerId];
            if (!winner) return currentState;
            
            const winningTeam = winner.team;
            const roundPoints = currentState.currentRoundPoints;

            const newRoundSummary: RoundSummary = {
                roundNumber: currentState.currentRound,
                winnerId: winnerId,
                winningTeam: winningTeam,
                points: roundPoints,
            };

            currentState.roundHistory = { ...currentState.roundHistory, [currentState.currentRound]: newRoundSummary };

            const calculateScores = (history: Record<number, RoundSummary>): { 'Team A': number, 'Team B': number } => {
                const scores = { 'Team A': 0, 'Team B': 0 };
                for (const round in history) {
                    scores[history[round].winningTeam] += scores[history[round].winningTeam] + history[round].points;
                }
                return scores;
            };
            
            const newScores = calculateScores(currentState.roundHistory);
            currentState.teams['Team A'].score = newScores['Team A'];
            currentState.teams['Team B'].score = newScores['Team B'];

            currentState.roundWinner = winnerId;
            currentState.lastRoundWinner = winnerId;
            currentState.statusMessage = `${winner.name || winnerId} won the round!`;
            
            return currentState;
        });
    }, [gameId, gameState]);

    const handleNextRoundStart = useCallback(() => {
        if (!gameId || !gameState || !gameState.roundWinner) return;

         const gameRef = ref(database, `games/${gameId}`);
         runTransaction(gameRef, (currentState: GameState | null) => {
            if (!currentState || !currentState.roundWinner || !currentState.players) return currentState; // Already processed or not ready

            const totalRounds = { 4: 13, 6: 8, 8: 13, 12: 8 }[currentState.playerCount] || 0;
            const isGameOver = currentState.currentRound >= totalRounds;

            if (isGameOver) {
                let gameWinner: TeamId | null = null;
                const scoreA = currentState.teams['Team A'].score;
                const scoreB = currentState.teams['Team B'].score;
                if (scoreA > scoreB) {
                    gameWinner = 'Team A';
                } else if (scoreB > scoreA) {
                    gameWinner = 'Team B';
                }
                currentState.gameWinner = gameWinner;
                currentState.statusMessage = gameWinner ? `Game Over! ${gameWinner} wins!` : "Game Over! It's a tie!";
                return currentState;
            }
            
            const nextTurnPlayer = currentState.players[currentState.lastRoundWinner!];
            if (!nextTurnPlayer) return currentState;

            currentState.currentRound += 1;
            currentState.cardsOnTable = [];
            currentState.leadingSuit = null;
            currentState.roundWinner = null;
            currentState.currentRoundPoints = 0;
            currentState.currentTurn = currentState.lastRoundWinner!;
            currentState.statusMessage = `Round ${currentState.currentRound}: ${nextTurnPlayer.name || nextTurnPlayer.id}'s turn.`;

            return currentState;
         });
    }, [gameId, gameState]);


    // Effect to trigger end-of-round logic
    useEffect(() => {
        if (gameState && gameState.cardsOnTable?.length === gameState.playerCount && !gameState.roundWinner) {
           const timeout = setTimeout(handleRoundEnd, 1000);
           return () => clearTimeout(timeout);
        }
    }, [gameState, handleRoundEnd]);

    // Effect to trigger start-of-next-round logic
    useEffect(() => {
        if (gameState?.roundWinner) {
            const timeout = setTimeout(handleNextRoundStart, 3000);
            return () => clearTimeout(timeout);
        }
    }, [gameState?.roundWinner, handleNextRoundStart]);

    // Toast notifications for round winners
    useEffect(() => {
        // This effect only runs when gameState.roundWinner changes to a non-null value
        if (gameState?.roundWinner && gameState?.players) {
            const winner = gameState.players[gameState.roundWinner];
            const roundSummary = gameState.roundHistory?.[gameState.currentRound];
            if (winner && roundSummary) {
                 toast({
                  title: `Round ${roundSummary.roundNumber} Winner`,
                  description: `[${winner.team} | ${winner.name || winner.id}] wins with ${roundSummary.points} points!`,
                });
            }
        }
    }, [gameState?.roundWinner, gameState?.players, gameState?.roundHistory, gameState?.currentRound, toast]);


    return { gameState, playCard, localPlayerId };
};
