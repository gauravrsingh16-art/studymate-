import { BookOpen, Clock, CheckSquare, TrendingUp, Flame, Award } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { format, startOfWeek, addDays, subDays } from "date-fns";
import Layout from "@/components/Layout";
import StatCard from "@/components/StatCard";
import ProgressRing from "@/components/ProgressRing";
import PomodoroTimer from "@/components/PomodoroTimer";
import { useStudySessions, useHabits, useHabitCompletions, useProfile } from "@/hooks/useData";

export default function Dashboard() {
  const today = format(new Date(), "yyyy-MM-dd");
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd = format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 6), "yyyy-MM-dd");

  const { data: todaySessions = [] } = useStudySessions(today);
  const { data: habits = [] } = useHabits();
  const { data: completions = [] } = useHabitCompletions(weekStart, weekEnd);
  const { data: profile } = useProfile();

  // Fetch last 60 days for streak calc
  const streakStart = format(subDays(new Date(), 60), "yyyy-MM-dd");
  const { data: allSessions = [] } = useStudySessions();
  const { data: streakCompletions = [] } = useHabitCompletions(streakStart, today);

  const completedSessions = todaySessions.filter((s) => s.status === "completed").length;
  const todayCompletions = completions.filter((c) => c.date === today && c.completed);
  const habitProgress = habits.length > 0 ? Math.round((todayCompletions.length / habits.length) * 100) : 0;

  const studyHours = todaySessions
    .filter((s) => s.status === "completed")
    .reduce((acc, s) => {
      const [sh, sm] = s.time_start.split(":").map(Number);
      const [eh, em] = s.time_end.split(":").map(Number);
      return acc + (eh + em / 60) - (sh + sm / 60);
    }, 0);

  // Study streak: consecutive days with at least 1 completed session
  const calcStudyStreak = () => {
    let streak = 0;
    for (let i = 0; i <= 60; i++) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      const hasCompleted = allSessions.some((s) => s.date === d && s.status === "completed");
      if (hasCompleted) streak++;
      else if (i > 0) break;
    }
    return streak;
  };

  // Longest streak
  const calcLongestStreak = () => {
    const dates = [...new Set(allSessions.filter((s) => s.status === "completed").map((s) => s.date))].sort();
    let longest = 0, current = 1;
    for (let i = 1; i < dates.length; i++) {
      const prev = new Date(dates[i - 1]);
      const curr = new Date(dates[i]);
      const diff = (curr.getTime() - prev.getTime()) / 86400000;
      if (diff === 1) { current++; longest = Math.max(longest, current); }
      else current = 1;
    }
    return Math.max(longest, current, dates.length > 0 ? 1 : 0);
  };

  const studyStreak = calcStudyStreak();
  const longestStreak = calcLongestStreak();

  // This week vs last week comparison
  const lastWeekStart = format(subDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 7), "yyyy-MM-dd");
  const lastWeekEnd = format(subDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 1), "yyyy-MM-dd");
  const thisWeekHours = allSessions
    .filter((s) => s.date >= weekStart && s.date <= weekEnd && s.status === "completed")
    .reduce((acc, s) => {
      const [sh, sm] = s.time_start.split(":").map(Number);
      const [eh, em] = s.time_end.split(":").map(Number);
      return acc + (eh + em / 60) - (sh + sm / 60);
    }, 0);
  const lastWeekHours = allSessions
    .filter((s) => s.date >= lastWeekStart && s.date <= lastWeekEnd && s.status === "completed")
    .reduce((acc, s) => {
      const [sh, sm] = s.time_start.split(":").map(Number);
      const [eh, em] = s.time_end.split(":").map(Number);
      return acc + (eh + em / 60) - (sh + sm / 60);
    }, 0);
  const weekDiff = lastWeekHours > 0 ? Math.round(((thisWeekHours - lastWeekHours) / lastWeekHours) * 100) : 0;

  // Weekly chart data
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), i);
    return { day: format(day, "EEE"), date: format(day, "yyyy-MM-dd") };
  });

  const weeklyData = weekDays.map(({ day, date }) => {
    const daySessions = allSessions.filter((s) => s.date === date && s.status === "completed");
    const hours = daySessions.reduce((acc, s) => {
      const [sh, sm] = s.time_start.split(":").map(Number);
      const [eh, em] = s.time_end.split(":").map(Number);
      return acc + (eh + em / 60) - (sh + sm / 60);
    }, 0);
    return { day, hours: Math.round(hours * 10) / 10 };
  });

  const isEmpty = todaySessions.length === 0 && habits.length === 0;

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Your study overview for {format(new Date(), "EEEE, MMMM d")}</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={BookOpen} title="Today's Sessions" value={todaySessions.length} subtitle={`${todaySessions.length - completedSessions} remaining`} delay={0} />
          <StatCard icon={CheckSquare} title="Completed" value={`${completedSessions}/${todaySessions.length}`} subtitle={todaySessions.length > 0 ? `${Math.round((completedSessions / todaySessions.length) * 100)}% done` : "No sessions"} delay={0.05} />
          <StatCard icon={Flame} title="Study Streak" value={`${studyStreak} days`} subtitle={`Longest: ${longestStreak} days`} delay={0.1} />
          <StatCard icon={TrendingUp} title="This Week" value={`${thisWeekHours.toFixed(1)}h`} subtitle={weekDiff !== 0 ? `${weekDiff > 0 ? "+" : ""}${weekDiff}% vs last week` : "No comparison data"} delay={0.15} />
        </div>

        {isEmpty ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl bg-card p-12 card-shadow text-center">
            <BookOpen className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
            <h2 className="text-lg font-semibold text-foreground">No data yet</h2>
            <p className="text-muted-foreground mt-1">Start by adding study sessions in the Planner or habits in the Tracker.</p>
          </motion.div>
        ) : (
          <>
            <div className="grid gap-6 lg:grid-cols-3">
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="lg:col-span-2 rounded-2xl bg-card p-6 card-shadow">
                <h2 className="text-lg font-semibold text-foreground mb-4">Today's Schedule</h2>
                {todaySessions.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-8 text-center">No sessions scheduled for today.</p>
                ) : (
                  <div className="space-y-3">
                    {todaySessions.map((task) => (
                      <div key={task.id} className={`flex items-center justify-between rounded-xl border p-4 transition-colors ${task.status === "completed" ? "bg-muted/50" : "bg-card"}`}>
                        <div className="flex items-center gap-4">
                          <div className={`h-2.5 w-2.5 rounded-full ${task.status === "completed" ? "bg-success" : task.priority === "High" ? "bg-destructive" : "bg-warning"}`} />
                          <div>
                            <p className={`font-medium ${task.status === "completed" ? "text-muted-foreground line-through" : "text-foreground"}`}>{task.subject}</p>
                            <p className="text-sm text-muted-foreground">{task.notes}</p>
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground whitespace-nowrap">{task.time_start.slice(0, 5)} – {task.time_end.slice(0, 5)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>

              <PomodoroTimer sessionMinutes={profile?.session_duration ?? 25} breakMinutes={profile?.break_duration ?? 5} />
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2 rounded-2xl bg-card p-6 card-shadow">
                <h2 className="text-lg font-semibold text-foreground mb-6">Weekly Study Hours</h2>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={weeklyData} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 13 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 13 }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px" }} />
                    <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="rounded-2xl bg-card p-6 card-shadow flex flex-col items-center justify-center">
                <h2 className="text-lg font-semibold text-foreground mb-6">Habits Today</h2>
                <ProgressRing progress={habitProgress} label="completed" />
                <p className="mt-4 text-sm text-muted-foreground">{todayCompletions.length} of {habits.length} habits done</p>
              </motion.div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
