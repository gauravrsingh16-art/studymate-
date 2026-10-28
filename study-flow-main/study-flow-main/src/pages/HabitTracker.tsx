import { useState } from "react";
import { Plus, X, Trash2, Pencil, Tag, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, startOfWeek, addDays, subDays } from "date-fns";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHabits, useAddHabit, useUpdateHabit, useDeleteHabit, useHabitCompletions, useToggleHabitCompletion } from "@/hooks/useData";
import { useToast } from "@/hooks/use-toast";

const weekDayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const CATEGORIES = ["Health", "Learning", "Fitness", "Mindfulness", "Productivity", "Other"];

export default function HabitTracker() {
  const { data: habits = [], isLoading } = useHabits();
  const addHabit = useAddHabit();
  const updateHabit = useUpdateHabit();
  const deleteHabit = useDeleteHabit();
  const toggleCompletion = useToggleHabitCompletion();
  const { toast } = useToast();

  const today = format(new Date(), "yyyy-MM-dd");
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(addDays(weekStart, 6), "yyyy-MM-dd");
  const weekDates = Array.from({ length: 7 }, (_, i) => format(addDays(weekStart, i), "yyyy-MM-dd"));

  const { data: completions = [] } = useHabitCompletions(weekStartStr, weekEndStr);

  const streakStart = format(subDays(new Date(), 30), "yyyy-MM-dd");
  const { data: streakCompletions = [] } = useHabitCompletions(streakStart, today);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", category: "", notes: "" });
  const [filterCategory, setFilterCategory] = useState("all");

  const isCompleted = (habitId: string, date: string) =>
    completions.some((c) => c.habit_id === habitId && c.date === date && c.completed);

  const getStreak = (habitId: string) => {
    let streak = 0;
    for (let i = 0; i <= 30; i++) {
      const d = format(subDays(new Date(), i), "yyyy-MM-dd");
      if (streakCompletions.some((c) => c.habit_id === habitId && c.date === d && c.completed)) {
        streak++;
      } else if (i > 0) break;
    }
    return streak;
  };

  const todayCompleted = habits.filter((h) => isCompleted(h.id, today)).length;

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: "", category: "", notes: "" });
    setShowModal(true);
  };

  const openEdit = (habit: any) => {
    setEditingId(habit.id);
    setForm({ name: habit.name, category: habit.category || "", notes: habit.notes || "" });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    if (editingId) {
      updateHabit.mutate({ id: editingId, name: form.name.trim(), category: form.category, notes: form.notes });
      toast({ title: "Updated", description: "Habit updated successfully." });
    } else {
      addHabit.mutate({ name: form.name.trim(), frequency: "daily", category: form.category, notes: form.notes });
    }
    setForm({ name: "", category: "", notes: "" });
    setEditingId(null);
    setShowModal(false);
  };

  const handleToggle = (habitId: string, date: string) => {
    const completed = !isCompleted(habitId, date);
    toggleCompletion.mutate({ habitId, date, completed });
  };

  const categories = [...new Set(habits.map((h) => h.category).filter(Boolean))];
  const filteredHabits = filterCategory === "all" ? habits : habits.filter((h) => h.category === filterCategory);

  // Group by category
  const grouped = filteredHabits.reduce((acc, h) => {
    const cat = h.category || "Uncategorized";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(h);
    return acc;
  }, {} as Record<string, typeof habits>);

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Habit Tracker</h1>
            <p className="mt-1 text-muted-foreground">{todayCompleted} of {habits.length} habits completed today</p>
          </div>
          <Button onClick={openAdd} className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" /> Add Habit
          </Button>
        </div>

        {/* Category filter */}
        {categories.length > 0 && (
          <div className="flex flex-wrap gap-2 items-center">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <button onClick={() => setFilterCategory("all")} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterCategory === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-border"}`}>All</button>
            {categories.map((cat) => (
              <button key={cat} onClick={() => setFilterCategory(cat)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${filterCategory === cat ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-border"}`}>{cat}</button>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : habits.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl bg-card p-12 card-shadow text-center">
            <h2 className="text-lg font-semibold text-foreground">No habits yet</h2>
            <p className="text-muted-foreground mt-1 text-sm">Create your first habit to start tracking consistency.</p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([category, categoryHabits]) => (
              <div key={category}>
                {categories.length > 0 && <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{category}</h3>}
                <div className="space-y-3">
                  {categoryHabits.map((habit, i) => {
                    const streak = getStreak(habit.id);
                    const weeklyDone = weekDates.filter((d) => isCompleted(habit.id, d)).length;

                    return (
                      <motion.div key={habit.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                        className="rounded-2xl bg-card p-5 card-shadow hover:card-shadow-hover transition-shadow"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <button onClick={() => handleToggle(habit.id, today)}
                              className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-lg border-2 transition-all ${
                                isCompleted(habit.id, today) ? "border-accent bg-accent" : "border-border hover:border-accent"
                              }`}
                            >
                              {isCompleted(habit.id, today) && (
                                <svg className="h-3.5 w-3.5 text-accent-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </button>
                            <div>
                              <span className={`font-medium ${isCompleted(habit.id, today) ? "text-muted-foreground" : "text-foreground"}`}>{habit.name}</span>
                              {habit.notes && <p className="text-xs text-muted-foreground mt-0.5">{habit.notes}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-primary">{streak} day streak</span>
                            <span className="text-xs text-muted-foreground">{weeklyDone}/7 this week</span>
                            <button onClick={() => openEdit(habit)} className="text-muted-foreground hover:text-primary transition-colors">
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button onClick={() => deleteHabit.mutate(habit.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="flex gap-1.5">
                          {weekDates.map((date, di) => (
                            <button key={date} onClick={() => handleToggle(habit.id, date)} className="flex flex-col items-center gap-1 flex-1">
                              <div className={`h-8 w-full rounded-lg transition-colors ${isCompleted(habit.id, date) ? "bg-accent/20" : "bg-muted"}`} />
                              <span className="text-[10px] text-muted-foreground">{weekDayLabels[di]}</span>
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
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
                <h2 className="text-lg font-semibold text-foreground">{editingId ? "Edit Habit" : "New Habit"}</h2>
                <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <Label>Habit Name</Label>
                  <Input className="mt-1.5 rounded-xl" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Read 30 minutes" onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={form.category || "none"} onValueChange={(v) => setForm((p) => ({ ...p, category: v === "none" ? "" : v }))}>
                    <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Category</SelectItem>
                      {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notes (optional)</Label>
                  <Input className="mt-1.5 rounded-xl" value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="e.g. Focus on non-fiction" />
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button className="flex-1 rounded-xl" onClick={handleSubmit} disabled={addHabit.isPending || updateHabit.isPending}>{editingId ? "Save" : "Add"}</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
