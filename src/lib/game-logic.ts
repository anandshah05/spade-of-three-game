import { onCall } from "firebase-functions/v2/https";
import { z } from 'zod';
import { getCardPointValue, 
  createDeck, dealCards, findStartingPlayer, determineRoundWinner
} from './game-utils';
import type { GameState, Card } from './types';
import { insert } from '@firebase/firestore-logic';

// Define input schemas for the callable functions
const createGameSchema = z.object({
  playerCount: z.union([z.literal(4), z.literal(6)]),
});

type Game = GameState; // Using GameState as the Game type for now, adjust if needed

const playCardSchema = z.object({
  gameId: z.string(),
  playerId: z.string(),
  card: z.object({
    suit: z.string(),
    rank: z.string(),
    id: z.string(),
  }),
});

// Main game logic object to be executed by Firebase
export const gameLogic = {
  createGame: onCall({ cors: true }, async (request) => {
    const { playerCount } = createGameSchema.parse(request.data);

    const deck = createDeck();
    const players = dealCards(deck, playerCount);
    const startingPlayerId = findStartingPlayer(players);

    const initialGameState: GameState = {
      players,
      playerCount,
      currentPlayerId: startingPlayerId,
      currentRound: 1,
      cardsOnTable: [],
      scores: { 'Team A': 0, 'Team B': 0 },
      gameStatus: 'in-progress',
      leadingSuit: null,
      roundWinner: null,
      gameWinner: null,
    };

    // Here you would typically save the initialGameState to your database (e.g., Firestore)
    // and return the gameId. For this example, we'll just return the state.
    // const gameRef = await admin.firestore().collection('games').add(initialGameState);
    // return { gameId: gameRef.id, gameState: initialGameState };

    return { gameState: initialGameState };
  }),

  playCard: onCall({ cors: true }, async (request) => {
    // In a real application, you would fetch the current game state from Firestore
    // using the gameId provided in the request.
    // For this example, we'll assume the game state is passed in, which is not secure.
    const { gameId, playerId, card } = playCardSchema.parse(request.data);

    // TODO: Fetch gameState from Firestore using gameId
    let gameState: GameState = {} as any; // Placeholder

    // Basic validation
    if (gameState.currentPlayerId !== playerId) {
      throw new Error('It is not your turn.');
    }

    const player = gameState.players.find((p) => p.id === playerId);
    if (!player) {
      throw new Error('Player not found.');
    }

    // Remove card from player's hand
    const cardIndex = player.hand.findIndex((c) => c.id === card.id);
    if (cardIndex === -1) {
      throw new Error('Card not in hand.');
    }
    player.hand.splice(cardIndex, 1);

    // Add card to table
    gameState.cardsOnTable.push({ playerId, card });

    // Set leading suit if it's the first card of the round
    if (gameState.cardsOnTable.length === 1) {
      gameState.leadingSuit = card.suit;
    }

    // Determine the next player
    const currentPlayerIndex = gameState.players.findIndex((p) => p.id === playerId);
    const nextPlayerIndex = (currentPlayerIndex + 1) % gameState.playerCount;
    gameState.currentPlayerId = gameState.players[nextPlayerIndex].id;

    // Check if the round is over
    if (gameState.cardsOnTable.length === gameState.playerCount) {
      const winnerId = determineRoundWinner(gameState.cardsOnTable, gameState.leadingSuit);
      gameState.roundWinner = winnerId;

      // TODO: Add scoring logic here

      // The winner of the round starts the next round
      gameState.currentPlayerId = winnerId;
      gameState.cardsOnTable = [];
      gameState.leadingSuit = null;
      gameState.currentRound += 1;
    }

    // TODO: Update gameState in Firestore
    // await admin.firestore().collection('games').doc(gameId).set(gameState);

    return { success: true, gameState };
 }),

 determineWinner: onCall({ cors: true }, async (request) => {
    // In a real application, you would fetch the current game state from Firestore
    // using the gameId provided in the request.
    const { gameId } = request.data; // Assuming only gameId is needed

    // TODO: Fetch gameState from Firestore using gameId
    let gameState: GameState = {} as any; // Placeholder

    if (!gameState || gameState.cardsOnTable.length !== gameState.playerCount) {
      throw new Error('Round not over or game state invalid.');
    }

    const winnerId = determineRoundWinner(gameState.cardsOnTable, gameState.leadingSuit);
    gameState.roundWinner = winnerId;

    const points = gameState.cardsOnTable.reduce((total, play) => total + getCardPointValue(play.card), 0);
    const winningPlayer = gameState.players.find(p => p.id === winnerId);
    if (winningPlayer) {
      gameState.scores[winningPlayer.team] += points;
    }

    // TODO: Update gameState in Firestore
    // await admin.firestore().collection('games').doc(gameId).set(gameState);

    return { winnerId, scores: gameState.scores, gameState };
 }),
};