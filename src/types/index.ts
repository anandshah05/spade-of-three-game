
export type Suit = 'Spades' | 'Hearts' | 'Diamonds' | 'Clubs';
export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

export interface Card {
  suit: Suit;
  rank: Rank;
  id: string; // e.g. "Spades-K"
}

export interface Player {
  id: string; // e.g. "Player 1"
  name: string; // Optional display name for multiplayer
  hand: Card[];
  isHuman: boolean;
  team: 'Team A' | 'Team B';
  isHost?: boolean;
}

export type TeamId = 'Team A' | 'Team B';

export interface RoundSummary {
  roundNumber: number;
  winnerId: string;
  winningTeam: TeamId;
  points: number;
}

export interface GameState {
  players: Record<string, Player>;
  teams: {
    [key in TeamId]: { score: number; members: string[] };
  };
  roundHistory: Record<number, RoundSummary>;
  playerCount: number;
  currentTurn: string; // Player ID
  currentRound: number;
  currentRoundPoints: number;
  cardsOnTable: { playerId: string; card: Card }[];
  leadingSuit: Suit | null;
  roundWinner: string | null;
  lastRoundWinner: string | null;
  gameWinner: TeamId | null;
  isDealing: boolean;
  statusMessage: string;
}

    