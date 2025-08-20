
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export default function HowToPlayPage() {
    const router = useRouter();
  return (
    <main className="flex min-h-screen flex-col items-center p-4 sm:p-8 bg-background text-foreground">
        <div className="w-full max-w-4xl">
            <Button variant="ghost" onClick={() => router.push('/')} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
            </Button>
            <h1 className="font-headline text-4xl md:text-5xl font-bold text-center mb-8">
                How to Play 3 of Spade
            </h1>

            <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl">Starting the Game</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-muted-foreground">
                        <p><strong>Teams:</strong> The game is played by 4, 6, 8, or 12 players, split into two competing teams (Team A and Team B). Players are seated so that turns alternate between teams.</p>
                        <p><strong>The Deck:</strong> A standard 52-card deck is used for 4 and 6-player games. Two decks are used for 8 and 12-player games.</p>
                        <p><strong>Dealing:</strong> All cards are dealt out to the players. The number of cards per player depends on the game size.</p>
                        <p><strong>First Player:</strong> In 4 and 6-player games, the player holding the Ace of Spades starts the first round. In 8 and 12-player games, the first player who was dealt cards begins.</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl">The Flow of a Round (A "Trick")</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-muted-foreground">
                        <p>A game consists of several rounds, also known as "tricks".</p>
                        <p><strong>Leading the Trick:</strong> The first player of a trick can play any card from their hand. The suit of this card becomes the "leading suit".</p>
                        <p><strong>Following Suit:</strong> All other players must play a card of the leading suit if they have one. This is called "following suit".</p>
                        <p><strong>Playing Trump:</strong> If a player does not have any cards of the leading suit, they can play any card, including a Spade. Spades are the "trump suit" and will beat any card of any other suit.</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl">Winning a Trick</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-muted-foreground">
                        <p>The trick is won by the player who played the highest-value card according to these rules:</p>
                        <ol className="list-decimal pl-5 space-y-1">
                            <li>The <strong>3 of Spades</strong> is the most powerful card and wins any trick it's played in.</li>
                            <li>If the 3 of Spades was not played, the highest-ranking <strong>Spade</strong> played wins the trick. (Spades are the trump suit).</li>
                            <li>If no Spades were played, the highest-ranking card of the <strong>leading suit</strong> wins.</li>
                        </ol>
                        <p><strong>Tie-breaker:</strong> In games with two decks, if two identical cards are the winning cards (e.g., two Aces of Spades), the card that was played last wins the trick.</p>
                        <p>The player who wins the trick collects all the cards from that round and begins the next trick.</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl">Scoring</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-muted-foreground">
                        <p>Points are awarded to the team that wins the trick, based on the cards collected:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li><strong>3 of Spades:</strong> 30 points</li>
                            <li><strong>10, Jack, Queen, King (any suit):</strong> 10 points each</li>
                            <li><strong>5 (any suit):</strong> 5 points</li>
                            <li>All other cards are worth 0 points.</li>
                        </ul>
                        <p>The points from all cards in a trick are given to the team of the player who won that trick.</p>
                    </CardContent>
                </Card>

                 <Card>
                    <CardHeader>
                        <CardTitle className="font-headline text-2xl">Winning the Game</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-muted-foreground">
                        <p>The game is played for a set number of rounds (e.g., 13 rounds for a 4-player game).</p>
                        <p>At the end of all rounds, the team with the highest total score wins the game!</p>
                    </CardContent>
                </Card>

            </div>
        </div>
    </main>
  );
}
