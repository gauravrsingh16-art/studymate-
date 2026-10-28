import { useState, useEffect, useRef, useCallback } from "react";
import { Play, Pause, RotateCcw, Coffee } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

type Mode = "work" | "break";

export default function PomodoroTimer({ sessionMinutes = 25, breakMinutes = 5 }: { sessionMinutes?: number; breakMinutes?: number }) {
  const [mode, setMode] = useState<Mode>("work");
  const [secondsLeft, setSecondsLeft] = useState(sessionMinutes * 60);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = mode === "work" ? sessionMinutes * 60 : breakMinutes * 60;
  const progress = ((total - secondsLeft) / total) * 100;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  const notify = useCallback((title: string, body: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body });
    }
    // Also play a beep
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  }, []);

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          if (mode === "work") {
            notify("Break Time!", "Great work! Take a short break.");
            setMode("break");
            return breakMinutes * 60;
          } else {
            notify("Back to Work!", "Break's over. Time to focus.");
            setMode("work");
            return sessionMinutes * 60;
          }
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, mode, sessionMinutes, breakMinutes, notify]);

  const reset = () => {
    setRunning(false);
    setMode("work");
    setSecondsLeft(sessionMinutes * 60);
  };

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-card p-6 card-shadow flex flex-col items-center">
      <h2 className="text-lg font-semibold text-foreground mb-2">Pomodoro Timer</h2>
      <p className="text-xs text-muted-foreground mb-4 capitalize">{mode === "work" ? "Focus Session" : "Break Time"}</p>

      <div className="relative w-32 h-32 mb-4">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
          <circle cx="60" cy="60" r={radius} fill="none" stroke={mode === "work" ? "hsl(var(--primary))" : "hsl(var(--accent))"} strokeWidth="8" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-1000" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-foreground tabular-nums">{String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="icon" className="rounded-xl" onClick={() => setRunning(!running)}>
          {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button variant="outline" size="icon" className="rounded-xl" onClick={reset}>
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="icon" className="rounded-xl" onClick={() => { setMode("break"); setSecondsLeft(breakMinutes * 60); setRunning(false); }}>
          <Coffee className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
