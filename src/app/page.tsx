
'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { PlayingCard } from '@/components/game/PlayingCard';
import { nanoid } from 'nanoid';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';


export default function Home() {
  const router = useRouter();
  const [playerCount, setPlayerCount] = React.useState('4');
  const [gameMode, setGameMode] = React.useState<'ai' | 'live'>('ai');
  const [gameId, setGameId] = React.useState('');
  const [loadingAction, setLoadingAction] = React.useState<string | null>(null);

  const handleStartAiGame = (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction('ai');
    router.push(`/game?players=${playerCount}`);
  };

  const handleCreateLiveGame = (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAction('create');
    const newGameId = nanoid(8);
    router.push(`/lobby/${newGameId}?players=${playerCount}`);
  };
  
  const handleJoinLiveGame = (e: React.FormEvent) => {
    e.preventDefault();
    if (gameId) {
      setLoadingAction('join');
      router.push(`/lobby/${gameId}`);
    }
  };

  const helpText = {
    ai: 'Challenge yourself against our smart AI opponents.',
    live: 'Create a room and invite friends, or join an existing game.',
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-4 sm:p-8 bg-background">
       <div className="absolute top-4 right-4">
        <Link href="/how-to-play" passHref>
          <Button variant="ghost">How to Play</Button>
        </Link>
      </div>
      <div className="flex flex-col items-center text-center mb-8 md:mb-12">
        <PlayingCard card={{ suit: 'Spades', rank: '3', id: 'Spades-3' }} className="w-24 h-36 md:w-32 md:h-44 shadow-2xl" />
        <h1 className="font-headline text-5xl md:text-6xl font-bold mt-4 text-foreground">3 of Spade</h1>
        <p className="text-lg md:text-xl mt-2 text-muted-foreground hidden sm:block">
          The trick-taking game where teamwork and the right card change everything.
        </p>
      </div>

      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader>
          <CardTitle className="font-headline text-2xl">Create a New Game</CardTitle>
          <CardDescription>
            Select the number of players and choose your game mode below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="player-count">Number of Players</Label>
                <Select value={playerCount} onValueChange={setPlayerCount} disabled={!!loadingAction}>
                <SelectTrigger id="player-count" className="w-full">
                    <SelectValue placeholder="Select number of players" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="4">4 Players</SelectItem>
                    <SelectItem value="6">6 Players</SelectItem>
                    <SelectItem value="8">8 Players</SelectItem>
                    <SelectItem value="12">12 Players</SelectItem>
                </SelectContent>
                </Select>
            </div>
            <Tabs defaultValue="ai" onValueChange={(value) => setGameMode(value as 'ai' | 'live')} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="ai" disabled={!!loadingAction}>Play with Computer</TabsTrigger>
                    <TabsTrigger value="live" disabled={!!loadingAction}>Play with Friends</TabsTrigger>
                </TabsList>
                 <p className="text-sm text-center text-muted-foreground pt-3 px-2">
                  {helpText[gameMode]}
                </p>
                <TabsContent value="ai">
                    <form onSubmit={handleStartAiGame}>
                        <CardFooter className="flex-col items-stretch px-0 pt-4 pb-0">
                            <Button type="submit" className="w-full font-bold text-lg py-6 bg-accent text-accent-foreground hover:bg-accent/90" disabled={!!loadingAction}>
                                {loadingAction === 'ai' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Start AI Game
                            </Button>
                        </CardFooter>
                    </form>
                </TabsContent>
                <TabsContent value="live">
                    <Tabs defaultValue="create" className="w-full pt-2">
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="create" disabled={!!loadingAction}>Create Game</TabsTrigger>
                            <TabsTrigger value="join" disabled={!!loadingAction}>Join Game</TabsTrigger>
                        </TabsList>
                        <TabsContent value="create">
                            <form onSubmit={handleCreateLiveGame}>
                                <CardFooter className="px-0 pb-0 pt-4">
                                    <Button type="submit" className="w-full font-bold text-lg py-6 bg-accent text-accent-foreground hover:bg-accent/90" disabled={!!loadingAction}>
                                        {loadingAction === 'create' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Create New Game
                                    </Button>
                                </CardFooter>
                            </form>
                        </TabsContent>
                        <TabsContent value="join">
                            <form onSubmit={handleJoinLiveGame}>
                                <CardContent className="pt-4 px-0 space-y-2">
                                    <Input 
                                        id="game-id" 
                                        placeholder="Enter the game ID" 
                                        value={gameId}
                                        onChange={(e) => setGameId(e.target.value)}
                                        disabled={!!loadingAction}
                                    />
                                </CardContent>
                                <CardFooter className="px-0 pb-0">
                                    <Button type="submit" disabled={!gameId || !!loadingAction} className="w-full font-bold text-lg py-6 bg-accent text-accent-foreground hover:bg-accent/90">
                                        {loadingAction === 'join' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Join Game
                                    </Button>
                                </CardFooter>
                            </form>
                        </TabsContent>
                    </Tabs>
                </TabsContent>
            </Tabs>
        </CardContent>
      </Card>
    </main>
  );
}
