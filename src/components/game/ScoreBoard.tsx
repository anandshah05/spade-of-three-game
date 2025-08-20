
import type { GameState } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';

export interface ScoreBoardProps {
  teams: GameState['teams'];
  roundHistory: GameState['roundHistory'];
}

export const ScoreBoard = ({ teams, roundHistory }: ScoreBoardProps) => {
  const historyArray = Object.values(roundHistory || {}).sort((a,b) => a.roundNumber - b.roundNumber);
  const teamA = teams ? teams['Team A'] : { score: 0 };
  const teamB = teams ? teams['Team B'] : { score: 0 };

  return (
    <div className="z-10">
      <Card className="w-full">
        <CardHeader className="p-2 pb-1">
          <CardTitle className="font-headline text-lg md:text-xl">Scores</CardTitle>
        </CardHeader>
        <CardContent className="p-2 pt-0 pb-1">
          <div className="text-sm">
            <div className="flex justify-between items-center">
              <span className="font-bold">Team A:</span>
              <span className="font-mono text-lg text-accent font-bold">{teamA.score}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold">Team B:</span>
              <span className="font-mono text-lg text-accent font-bold">{teamB.score}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-2 pt-0">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="link" size="sm" className="h-auto p-0 text-xs text-foreground/90 hover:text-foreground">View History</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Round History</AlertDialogTitle>
                <AlertDialogDescription>
                  A breakdown of points scored in each round.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <ScrollArea className="h-60 w-full rounded-md border p-4">
                <div className="space-y-2">
                  {historyArray.length > 0 ? historyArray.map(summary => (
                    <div key={summary.roundNumber} className="flex justify-between text-sm">
                      <span>Round {summary.roundNumber}:</span>
                      <span className="font-semibold">{summary.winningTeam} won with {summary.points} points</span>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground">No rounds completed yet.</p>
                  )}
                </div>
              </ScrollArea>
              <AlertDialogFooter>
                <AlertDialogAction>Close</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  );
};
