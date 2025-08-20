
import type { Suit, Rank, Card, Player } from '@/types';

export const SUITS: Suit[] = ['Spades', 'Hearts', 'Diamonds', 'Clubs'];
export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

export const createDeck = (playerCount: number): Card[] => {
  const singleDeck = SUITS.flatMap((suit) =>
    RANKS.map((rank) => ({
      suit,
      rank,
      id: `${suit}-${rank}`,
    }))
  );

  if (playerCount > 6) {
    // For 8 or 12 players, use two decks. Add a suffix to card IDs to keep them unique.
    const deck1 = singleDeck.map(card => ({ ...card, id: `${card.id}-1` }));
    const deck2 = singleDeck.map(card => ({ ...card, id: `${card.id}-2` }));
    return [...deck1, ...deck2];
  }
  
  return singleDeck;
};

export const prepareDeckForGame = (playerCount: number, deck: Card[]): Card[] => {
  if (playerCount === 6) {
    // 48 cards (remove four '2's)
    const twosToRemove = ['Spades-2', 'Hearts-2', 'Diamonds-2', 'Clubs-2'];
    return deck.filter(card => !twosToRemove.includes(`${card.suit}-${card.rank}`));
  }
  if (playerCount === 12) {
    // 96 cards (remove eight '2's from two decks)
     const twosToRemove = [
      'Spades-2-1', 'Hearts-2-1', 'Diamonds-2-1', 'Clubs-2-1',
      'Spades-2-2', 'Hearts-2-2', 'Diamonds-2-2', 'Clubs-2-2'
    ];
    return deck.filter(card => !twosToRemove.includes(card.id));
  }
  // For 4 and 8-player games, the full deck(s) are used.
  return deck;
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export const dealCards = (deck: Card[], playerCount: number, humanPlayerIds: string[]): Player[] => {
  const preparedDeck = prepareDeckForGame(playerCount, deck);
  const shuffledDeck = shuffleDeck(preparedDeck);
  
  const players: Player[] = Array.from({ length: playerCount }, (_, i) => {
    const playerId = `Player ${i + 1}`;
    return {
      id: playerId,
      name: playerId,
      hand: [],
      isHuman: humanPlayerIds.includes(playerId),
      team: i % 2 === 0 ? 'Team A' : 'Team B',
    }
  });

  let cardIndex = 0;
  const cardsPerPlayer = shuffledDeck.length / playerCount;

  for (let i = 0; i < cardsPerPlayer; i++) {
    for (let j = 0; j < playerCount; j++) {
      if(shuffledDeck[cardIndex]) {
        players[j].hand.push(shuffledDeck[cardIndex]);
        cardIndex++;
      }
    }
  }

  return players;
};

export const findStartingPlayer = (players: Player[], playerCount: number): string => {
  if (playerCount === 4 || playerCount === 6) {
    // The player with the Ace of Spades starts the first round.
    // With two decks, we need to find one of the two aces.
    const aceHolder = players.find(p => p.hand.some(c => c.rank === 'A' && c.suit === 'Spades'));
    return aceHolder?.id || players[0].id;
  }
  // For 8 or 12 players, the first player dealt to starts.
  return players[0].id;
};


export const getRankValue = (rank: Rank): number => {
  if (rank === 'A') return 14;
  if (rank === 'K') return 13;
  if (rank === 'Q') return 12;
  if (rank === 'J') return 11;
  return parseInt(rank);
};

export const getCardPointValue = (card: Card): number => {
    if (card.rank === '3' && card.suit === 'Spades') return 30;
    if (['K', 'Q', 'J', '10'].includes(card.rank)) return 10; // Ace is not 10 points
    if (card.rank === '5') return 5;
    return 0;
};

export const determineRoundWinner = (cardsOnTable: { playerId: string; card: Card }[], leadingSuit: Suit | null): string => {
  if (!cardsOnTable || cardsOnTable.length === 0) {
    throw new Error("Cannot determine winner from an empty table.");
  }

  const tableWithPlayOrder = cardsOnTable.map((play, index) => ({...play, playOrder: index}));

  // The 3 of Spades is the highest card.
  const spadeOfThreePlays = tableWithPlayOrder.filter(play => play.card.rank === '3' && play.card.suit === 'Spades');
  if (spadeOfThreePlays.length > 0) {
    // If two 3s of Spades are played, the one played later wins.
    return spadeOfThreePlays.sort((a,b) => b.playOrder - a.playOrder)[0].playerId;
  }

  const spadePlays = tableWithPlayOrder.filter(play => play.card.suit === 'Spades');

  // If any other spades were played, the highest spade wins.
  if (spadePlays.length > 0) {
    const highestSpadeRank = Math.max(...spadePlays.map(p => getRankValue(p.card.rank)));
    const highestSpadePlays = spadePlays.filter(p => getRankValue(p.card.rank) === highestSpadeRank);
    // If two identical highest spades are played, the later one wins.
    return highestSpadePlays.sort((a,b) => b.playOrder - a.playOrder)[0].playerId;
  }

  // If no spades were played, the highest card of the leading suit wins.
  const effectiveLeadingSuit = leadingSuit ?? cardsOnTable[0].card.suit;
  const leadingSuitPlays = tableWithPlayOrder.filter(play => play.card.suit === effectiveLeadingSuit);
  
  if (leadingSuitPlays.length > 0) {
      const highestRank = Math.max(...leadingSuitPlays.map(p => getRankValue(p.card.rank)));
      const highestPlays = leadingSuitPlays.filter(p => getRankValue(p.card.rank) === highestRank);
      // If two identical highest cards of the leading suit are played, the later one wins.
      return highestPlays.sort((a,b) => b.playOrder - a.playOrder)[0].playerId;
  }
  
  // This is a fallback that should not be reached if rules are followed. It implies no one followed suit.
  // The first player of the trick wins.
  return cardsOnTable[0].playerId;
};

    