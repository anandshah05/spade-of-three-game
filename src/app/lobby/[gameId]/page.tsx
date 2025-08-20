
'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getDatabase, ref, onValue, set, get, update, serverTimestamp } from 'firebase/database';
import { database } from '@/lib/firebase';
import type { Player, TeamId } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { nanoid } from 'nanoid';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { dealCards } from '@/lib/game-utils';
import { createDeck } from '@/lib/game-utils';
import { ClipboardCopy, Loader2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

type LobbyPlayer = Omit<Player, 'hand'> & { name: string, isHost: boolean };
interface LobbyState {
  players: Record<string, LobbyPlayer>;
  playerCount: number;
  hostId: string;
  status: 'waiting' | 'starting' | 'in-progress';
  createdAt: any;
}

export default function LobbyPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { gameId } = params;
  const { toast } = useToast();
  
  const [lobbyState, setLobbyState] = useState<LobbyState | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<TeamId | ''>('');
  const [currentPlayerId, setCurrentPlayerId] = useState('');
  const [isHost, setIsHost] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Effect to manage local session storage for player ID
  useEffect(() => {
    let storedPlayerId = sessionStorage.getItem(`player_id_${gameId}`);
    if (!storedPlayerId) {
      storedPlayerId = nanoid(10);
      sessionStorage.setItem(`player_id_${gameId}`, storedPlayerId);
    }
    setCurrentPlayerId(storedPlayerId);
  }, [gameId]);

  // Combined effect to initialize and subscribe to the lobby
  useEffect(() => {
    if (!gameId || !currentPlayerId) return;

    const lobbyRef = ref(database, `lobbies/${gameId}`);

    const initializeAndSubscribe = async () => {
      // First, check if the lobby exists with a one-time read
      const initialSnapshot = await get(lobbyRef);
      
      if (!initialSnapshot.exists()) {
        // If it doesn't exist, this player is the host and creates it.
        const playerCountFromQuery = searchParams.get('players');
        const playerCount = playerCountFromQuery ? parseInt(playerCountFromQuery, 10) : 4;
        
        const newLobby: LobbyState = {
          players: {},
          playerCount: [4, 6, 8, 12].includes(playerCount) ? playerCount : 4,
          hostId: currentPlayerId,
          status: 'waiting',
          createdAt: serverTimestamp(),
        };
        try {
          await set(lobbyRef, newLobby);
        } catch (error) {
          console.error("Failed to create lobby:", error);
          toast({ title: "Error", description: "Could not create the lobby.", variant: "destructive" });
          router.push('/');
          return;
        }
      }

      // Now, set up the real-time listener for ongoing updates
      const unsubscribe = onValue(lobbyRef, (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val() as LobbyState;
          setLobbyState(data);
          setIsHost(data.hostId === currentPlayerId);

          // If game starts, redirect to the game page
          if (data.status === 'in-progress') {
            router.push(`/game/${gameId}`);
          }
        }
      });

      return unsubscribe;
    };

    let unsubscribe: (() => void) | undefined;
    initializeAndSubscribe().then(unsub => {
      if (unsub) {
        unsubscribe = unsub;
      }
    });

    // Cleanup subscription on component unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [gameId, currentPlayerId, router, toast, searchParams]);


  const handleJoinLobby = async () => {
    if (!playerName || !selectedTeam || !currentPlayerId || !gameId || !lobbyState) return;
    setIsLoading(true);

    const teamPlayers = Object.values(lobbyState.players || {}).filter(p => p.team === selectedTeam).length;
    const teamCapacity = lobbyState.playerCount / 2;

    if (teamPlayers >= teamCapacity) {
        toast({ title: "Team Full", description: `Cannot join ${selectedTeam}, it already has ${teamCapacity} players.`, variant: "destructive" });
        setIsLoading(false);
        return;
    }

    const playerRef = ref(database, `lobbies/${gameId}/players/${currentPlayerId}`);
    
    // Check if player already exists
    const snapshot = await get(playerRef);
    if(snapshot.exists()) {
        toast({ title: "You are already in the lobby.", variant: "destructive" });
        setIsLoading(false);
        return;
    }

    // Check if lobby is full
    if (Object.keys(lobbyState.players || {}).length >= lobbyState.playerCount) {
        toast({ title: "Lobby is full.", description: "This game cannot accept any more players.", variant: "destructive"});
        setIsLoading(false);
        return;
    }

    const newPlayer: LobbyPlayer = {
      id: currentPlayerId,
      name: playerName,
      team: selectedTeam,
      isHost: lobbyState.hostId === currentPlayerId,
      isHuman: true,
    };

    await update(ref(database, `lobbies/${gameId}/players`), {
      [currentPlayerId]: newPlayer,
    });
    setIsLoading(false);
    toast({ title: `Welcome, ${playerName}!`, description: `You have joined ${selectedTeam}.` });
  };
  
  const handleStartGame = async () => {
    if (!isHost || !lobbyState || !gameId) return;
    setIsLoading(true);

    let lobbyPlayers = Object.values(lobbyState.players || {});
    const humanPlayerCount = lobbyPlayers.length;
    
    if (humanPlayerCount < 1) {
        toast({ title: "Cannot start game", description: `You need at least one player to start.`, variant: "destructive" });
        setIsLoading(false);
        return;
    }

    // Add bots if needed, ensuring teams are balanced
    const playersToCreate = lobbyState.playerCount - humanPlayerCount;
    if (playersToCreate > 0) {
        let teamAPlayers = lobbyPlayers.filter(p => p.team === 'Team A').length;
        let teamBPlayers = lobbyPlayers.filter(p => p.team === 'Team B').length;
        const teamCapacity = lobbyState.playerCount / 2;
        let botNumber = 1;

        for (let i = 0; i < playersToCreate; i++) {
            const botId = `bot-${nanoid(8)}`;
            let team: 'Team A' | 'Team B';

            // Assign bot to the team with fewer players
            if (teamAPlayers < teamCapacity) {
                team = 'Team A';
                teamAPlayers++;
            } else {
                team = 'Team B';
                teamBPlayers++;
            }
             
            const botPlayer: LobbyPlayer = {
                id: botId,
                name: `Bot-${botNumber++}`,
                team: team,
                isHost: false,
                isHuman: false,
            };
            lobbyPlayers.push(botPlayer);
        }
    }
    
    // Create and deal cards
    const deck = createDeck(lobbyState.playerCount);
    const dealtPlayers = dealCards(deck, lobbyState.playerCount, []);

    // Ensure players are correctly ordered by team before assigning hands
    lobbyPlayers.sort((a,b) => {
        if (a.team < b.team) return -1;
        if (a.team > b.team) return 1;
        return 0; // Keep original order for players in the same team
    });

    const gamePlayers = lobbyPlayers.map((lobbyPlayer, index) => {
        const dealtPlayer = dealtPlayers[index];
        return {
            ...dealtPlayer,
            id: lobbyPlayer.id,
            name: lobbyPlayer.name,
            team: lobbyPlayer.team,
            isHuman: lobbyPlayer.isHuman,
        }
    });

    const startingPlayerId = gamePlayers.find(p => p.hand.some(c => c.id === 'Spades-A'))?.id || gamePlayers[0].id;
    const startingPlayer = gamePlayers.find(p => p.id === startingPlayerId);

    // Create initial game state in the database
    const gameRef = ref(database, `games/${gameId}`);
    await set(gameRef, {
        players: gamePlayers.reduce((acc, p) => ({...acc, [p.id]: p }), {}),
        teams: {
            'Team A': { score: 0, members: gamePlayers.filter(p => p.team === 'Team A').map(p => p.id) },
            'Team B': { score: 0, members: gamePlayers.filter(p => p.team === 'Team B').map(p => p.id) },
        },
        roundHistory: {},
        playerCount: lobbyState.playerCount,
        currentTurn: startingPlayerId,
        currentRound: 1,
        currentRoundPoints: 0,
        cardsOnTable: [],
        leadingSuit: null,
        roundWinner: null,
        lastRoundWinner: null,
        gameWinner: null,
        isDealing: false, // Game starts immediately
        statusMessage: `${startingPlayer?.name || startingPlayerId}'s turn to start.`,
    });

    // Update lobby status to trigger redirect for all players
    await update(ref(database, `lobbies/${gameId}`), { status: 'in-progress' });
    // setIsLoading(false); // Page will redirect, so no need to set this
  };

  const copyLinkToClipboard = () => {
    const link = `${window.location.origin}/lobby/${gameId}`;
    navigator.clipboard.writeText(link).then(() => {
      toast({
        title: "Link Copied!",
        description: "The invitation link has been copied to your clipboard.",
      });
    }, (err) => {
      toast({
        title: "Failed to Copy",
        description: "Could not copy the link. Please copy it manually.",
        variant: "destructive",
      });
      console.error('Failed to copy: ', err);
    });
  };

  if (!lobbyState || !currentPlayerId) {
    return <div className="flex items-center justify-center min-h-screen">Loading lobby...</div>;
  }
  
  const hasJoined = lobbyState.players && lobbyState.players[currentPlayerId];
  const connectedPlayers = Object.values(lobbyState.players || {});
  const teamAPlayerCount = connectedPlayers.filter(p => p.team === 'Team A').length;
  const teamBPlayerCount = connectedPlayers.filter(p => p.team === 'Team B').length;
  const teamCapacity = lobbyState.playerCount / 2;
  
  const isTeamAFull = teamAPlayerCount >= teamCapacity;
  const isTeamBFull = teamBPlayerCount >= teamCapacity;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-background">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="font-headline text-3xl">Game Lobby</CardTitle>
          <CardDescription>
            Waiting for players to join. The game will start when the lobby is full or the host starts the game with bots.
          </CardDescription>
          <div className="pt-2">
            <Label htmlFor="game-link">Share this link with your friends:</Label>
            <div className="flex items-center gap-2 mt-1">
              <Input id="game-link" readOnly value={`${window.location.origin}/lobby/${gameId}`} />
              <Button variant="outline" size="icon" onClick={copyLinkToClipboard} aria-label="Copy link">
                <ClipboardCopy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
            {!hasJoined ? (
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="player-name">Enter your name</Label>
                        <Input 
                            id="player-name"
                            placeholder="Your display name" 
                            value={playerName} 
                            onChange={e => setPlayerName(e.target.value)} 
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Choose your team</Label>
                        <RadioGroup 
                            value={selectedTeam} 
                            onValueChange={(value) => setSelectedTeam(value as TeamId)}
                            className="flex gap-4"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Team A" id="team-a" disabled={isTeamAFull} />
                                <Label htmlFor="team-a" className={cn(isTeamAFull && "text-muted-foreground")}>
                                    Team A ({teamAPlayerCount}/{teamCapacity}) {isTeamAFull && "- Full"}
                                </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="Team B" id="team-b" disabled={isTeamBFull} />
                                <Label htmlFor="team-b" className={cn(isTeamBFull && "text-muted-foreground")}>
                                    Team B ({teamBPlayerCount}/{teamCapacity}) {isTeamBFull && "- Full"}
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>
                    <Button 
                        onClick={handleJoinLobby} 
                        disabled={!playerName || !selectedTeam || isLoading} 
                        className="w-full font-bold text-lg py-6 bg-accent text-accent-foreground hover:bg-accent/90"
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Join Lobby
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg">Players ({connectedPlayers.length}/{lobbyState.playerCount})</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {connectedPlayers.map(p => (
                            <div key={p.id} className="flex items-center gap-3 p-2 border rounded-lg">
                                <Avatar>
                                    <AvatarFallback>{p.name.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <div className="flex-grow">
                                    <p className="font-semibold">{p.name} {p.id === currentPlayerId && '(You)'}</p>
                                    <p className="text-sm text-muted-foreground">{p.team}</p>
                                </div>
                                {p.isHost && <Badge variant="outline">Host</Badge>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </CardContent>
        <CardFooter>
            {isHost && (
                 <Button 
                    onClick={handleStartGame} 
                    disabled={connectedPlayers.length === 0 || isLoading}
                    className="w-full font-bold text-lg py-6 bg-accent text-accent-foreground hover:bg-accent/90"
                 >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {connectedPlayers.length < lobbyState.playerCount ? 'Start Game with Bots' : 'Start Game'}
                </Button>
            )}
            {!isHost && hasJoined && (
                <p className="text-center w-full text-muted-foreground">Waiting for the host to start the game...</p>
            )}
        </CardFooter>
      </Card>
    </main>
  );
}

    