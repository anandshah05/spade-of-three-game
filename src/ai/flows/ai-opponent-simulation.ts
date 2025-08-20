// A Genkit Flow for simulating AI opponents in a card game, allowing players to practice against AI with adjustable difficulty levels.

'use server';

import {ai} from '@/ai/genkit';
import {googleAI} from '@genkit-ai/googleai';
import {z} from 'genkit';

const AiOpponentSimulationInputSchema = z.object({
  gameState: z.string().describe('The current state of the game, including player hands, cards on the table, and scores.'),
  difficulty: z.enum(['easy', 'medium', 'hard']).describe('The difficulty level of the AI opponent.'),
  currentPlayer: z.string().describe('The current player who needs to make a move.'),
  playableCards: z.array(z.object({
    suit: z.string(),
    rank: z.string(),
    id: z.string(),
  })).describe('A list of cards the AI can legally play this turn.')
});
export type AiOpponentSimulationInput = z.infer<typeof AiOpponentSimulationInputSchema>;

const AiOpponentSimulationOutputSchema = z.object({
  move: z.string().describe('The AI opponent\'s chosen move, represented as a card ID (e.g., "Spades-A"). This MUST be one of the card IDs from the `playableCards` input.'),
  reasoning: z.string().describe('The AI opponent\'s reasoning for choosing this move.'),
});
export type AiOpponentSimulationOutput = z.infer<typeof AiOpponentSimulationOutputSchema>;

export async function simulateAiOpponent(input: AiOpponentSimulationInput): Promise<AiOpponentSimulationOutput> {
  return aiOpponentSimulationFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiOpponentSimulationPrompt',
  input: {schema: AiOpponentSimulationInputSchema},
  output: {schema: AiOpponentSimulationOutputSchema},
  model: googleAI('gemini-1.5-flash-latest'),
  prompt: `You are an AI opponent in a card game called "3 of Spade". Your goal is to win the game for your team by strategically playing your cards to win rounds and score points.

**Game Rules:**
1.  **Teams:** The game is played in two teams.
2.  **Winning a Round:** The player who plays the highest-value card wins the round for their team.
3.  **Spades are Trump:** Spades are the trump suit. Any spade beats any card from other suits.
4.  **Spade of Three:** The 3 of Spades is the most powerful card in the game. It beats all other cards, including all other Spades.
5.  **Leading Suit:** The first card played in a round sets the "leading suit."
6.  **Following Suit:** You MUST play a card of the leading suit if you have one. If you don't have a card of the leading suit, you can play any card, including a Spade.
7.  **Scoring:**
    - 3 of Spades: 30 points
    - 10, J, Q, K: 10 points each
    - 5: 5 points
    - Other cards: 0 points
    All points from the cards played in a round go to the winner of that round.

**Your Task:**
Based on the current game state, your hand, and the rules, decide which card to play. You MUST choose a valid card from your hand.

**Game State:**
{{{gameState}}}

You are player: **{{{currentPlayer}}}**
Your difficulty level is: **{{{difficulty}}}**

**Here are the cards you are allowed to play this turn:**
{{#each playableCards}}
- {{id}} ({{rank}} of {{suit}})
{{/each}}

**Reasoning Process:**
1.  Analyze the \`cardsOnTable\`. What is the \`leadingSuit\`? What is the current winning card?
2.  Review your list of \`playableCards\`.
3.  Based on the situation, should you try to win the round with a high card or a spade?
4.  If you can't win, which card should you discard? Avoid giving away point cards if possible.
5.  Choose the best card ID from the \`playableCards\` list. Your output 'move' MUST be the ID of one of those cards.

Choose the best move and provide a brief explanation for your choice. Output your decision in the specified JSON format.`,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_ONLY_HIGH',
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_LOW_AND_ABOVE',
      },
    ],
  },
});

const aiOpponentSimulationFlow = ai.defineFlow(
  {
    name: 'aiOpponentSimulationFlow',
    inputSchema: AiOpponentSimulationInputSchema,
    outputSchema: AiOpponentSimulationOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
