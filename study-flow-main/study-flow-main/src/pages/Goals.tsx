import { useState } from "react";
import { Plus, X, Trash2, ChevronDown, ChevronUp, CheckCircle2, Circle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { format, startOfWeek, addDays } from "date-fns";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGoals, useAddGoal, useUpdateGoal, useDeleteGoal, useStudySessions, useHabits, useHabitCompletions, useMilestones, useAddMilestone, useToggleMilestone, useDeleteMilestone } from "@/hooks/useData";

function MilestonesList({ goalId }: { goalId: string }) {
  const { data: milestones = [] } = useMilestones(goalId);
  const addMilestone = useAddMilestone();
  const toggleMilestone = useToggleMilestone();
  const deleteMilestone = useDeleteMilestone();
  const [newTitle, setNewTitle] = useState("");

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    addMilestone.mutate({ goal_id: goalId, title: newTitle.trim() });
    setNewTitle("");
  };

  return (
    <div className="mt-3 space-y-2 border-t pt-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Milestones</p>
      {milestones.map((m) => (
        <div key={m.id} className="flex items-center gap-2 group">
          <button onClick={() => toggleMilestone.mutate({ id: m.id, completed: !m.completed })} className="flex-shrink-0">
            {m.completed ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4 text-muted-foreground" />}
          </button>
          <span className={`text-sm flex-1 ${m.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{m.title}</span>
          <button onClick={() => deleteMilestone.mutate(m.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <Input className="h-8 text-sm rounded-lg" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Add milestone..." onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
        <Button size="sm" variant="outline" className="h-8 rounded-lg" onClick={handleAdd} disabled={addMilestone.isPending}>+</Button>
      </div>
    </div>
  );
}

function GoalCard({ goal, delay, onUpdate, onDelete }: { goal: any; delay: number; onUpdate: (id: string, current: number) => void; onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const pct = goal.target > 0 ? Math.round((Number(goal.current) / Number(goal.target)) * 100) : 0;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} className="rounded-2xl bg-card p-5 card-shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-foreground">{goal.title}</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-primary">{pct}%</span>
          <button onClick={() => setExpanded(!expanded)} className="text-muted-foreground hover:text-foreground transition-colors">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <button onClick={() => onDelete(goal.id)} className="text-muted-foreground hover:text-destructive transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(pct, 100)}%` }} transition={{ duration: 0.8, delay: delay + 0.2 }}
          className="h-full rounded-full bg-primary" />
      </div>
      <div className="flex items-center justify-between mt-2">
        <p className="text-sm text-muted-foreground">{goal.current} / {goal.target} {goal.unit}</p>
        <div className="flex gap-1">
          <button onClick={() => onUpdate(goal.id, Math.max(0, Number(goal.current) - 1))} className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground hover:bg-border">−</button>
          <button onClick={() => onUpdate(goal.id, Number(goal.current) + 1)} className="text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground hover:bg-border">+</button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <MilestonesList goalId={goal.id} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function Goals() {
  const { data: weeklyGoals = [] } = useGoals("weekly");
  const { data: monthlyGoals = [] } = useGoals("monthly");
  const addGoal = useAddGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const [showModal, setShowModal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: "", target: "", unit: "%", period: "weekly" });

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(addDays(weekStart, 6), "yyyy-MM-dd");
  const { data: sessions = [] } = useStudySessions();
  const { data: habits = [] } = useHabits();
  const { data: completions = [] } = useHabitCompletions(weekStartStr, weekEndStr);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i);
    return { day: format(d, "EEE"), date: format(d, "yyyy-MM-dd") };
  });

  const weeklyStudyData = weekDays.map(({ day, date }) => {
    const daySessions = sessions.filter((s) => s.date === date && s.status === "completed");
    const hours = daySessions.reduce((acc, s) => {
      const [sh, sm] = s.time_start.split(":").map(Number);
      const [eh, em] = s.time_end.split(":").map(Number);
      return acc + (eh + em / 60) - (sh + sm / 60);
    }, 0);
    return { day, hours: Math.round(hours * 10) / 10 };
  });

  const habitAdherenceData = weekDays.map(({ day, date }) => {
    if (habits.length === 0) return { day, adherence: 0 };
    const dayCompletions = completions.filter((c) => c.date === date && c.completed).length;
    return { day, adherence: Math.round((dayCompletions / habits.length) * 100) };
  });

  const handleAdd = () => {
    if (!newGoal.title || !newGoal.target) return;
    addGoal.mutate({ title: newGoal.title, target: Number(newGoal.target), unit: newGoal.unit, period: newGoal.period });
    setNewGoal({ title: "", target: "", unit: "%", period: "weekly" });
    setShowModal(false);
  };

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Goals & Progress</h1>
            <p className="mt-1 text-muted-foreground">Track your weekly and monthly goals</p>
          </div>
          <Button onClick={() => setShowModal(true)} className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" /> Add Goal
          </Button>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Weekly Goals</h2>
          {weeklyGoals.length === 0 ? (
            <p className="text-sm text-muted-foreground bg-card rounded-2xl p-8 text-center card-shadow">No weekly goals set. Add one to start tracking.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {weeklyGoals.map((g, i) => (
                <GoalCard key={g.id} goal={g} delay={i * 0.05}
                  onUpdate={(id, current) => updateGoal.mutate({ id, current })}
                  onDelete={(id) => deleteGoal.mutate(id)} />
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Monthly Goals</h2>
          {monthlyGoals.length === 0 ? (
            <p className="text-sm text-muted-foreground bg-card rounded-2xl p-8 text-center card-shadow">No monthly goals set.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {monthlyGoals.map((g, i) => (
                <GoalCard key={g.id} goal={g} delay={i * 0.05}
                  onUpdate={(id, current) => updateGoal.mutate({ id, current })}
                  onDelete={(id) => deleteGoal.mutate(id)} />
              ))}
            </div>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl bg-card p-6 card-shadow">
            <h2 className="text-lg font-semibold text-foreground mb-6">Study Time This Week</h2>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={weeklyStudyData} barSize={28}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px" }} />
                <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="rounded-2xl bg-card p-6 card-shadow">
            <h2 className="text-lg font-semibold text-foreground mb-6">Habit Adherence This Week</h2>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={habitAdherenceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "12px" }} />
                <Line type="monotone" dataKey="adherence" stroke="hsl(var(--accent))" strokeWidth={2.5} dot={{ r: 4, fill: "hsl(var(--accent))" }} />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-card p-6 card-shadow-hover space-y-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">New Goal</h2>
                <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-4">
                <div><Label>Title</Label><Input className="mt-1.5 rounded-xl" value={newGoal.title} onChange={(e) => setNewGoal(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Study 35 hours" /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>Target</Label><Input className="mt-1.5 rounded-xl" type="number" value={newGoal.target} onChange={(e) => setNewGoal(p => ({ ...p, target: e.target.value }))} placeholder="100" /></div>
                  <div><Label>Unit</Label><Input className="mt-1.5 rounded-xl" value={newGoal.unit} onChange={(e) => setNewGoal(p => ({ ...p, unit: e.target.value }))} placeholder="%" /></div>
                </div>
                <div>
                  <Label>Period</Label>
                  <Select value={newGoal.period} onValueChange={(v) => setNewGoal(p => ({ ...p, period: v }))}>
                    <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button className="flex-1 rounded-xl" onClick={handleAdd} disabled={addGoal.isPending}>Add Goal</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
