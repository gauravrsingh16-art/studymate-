import { useState } from "react";
import { Plus, Clock, X, Trash2, Pencil, Copy, Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format, addDays, startOfWeek } from "date-fns";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStudySessions, useAddSession, useUpdateSession, useDeleteSession } from "@/hooks/useData";
import { useToast } from "@/hooks/use-toast";

const emptyTask = { subject: "", time_start: "09:00", time_end: "10:30", priority: "Medium", notes: "" };

export default function StudyPlanner() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateStr = format(selectedDate, "yyyy-MM-dd");
  const { data: sessions = [], isLoading } = useStudySessions(dateStr);
  const addSession = useAddSession();
  const updateSession = useUpdateSession();
  const deleteSession = useDeleteSession();
  const { toast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTask, setFormTask] = useState(emptyTask);
  const [filterPriority, setFilterPriority] = useState<string>("all");
  const [filterSubject, setFilterSubject] = useState("");

  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const toggleTask = (id: string, currentStatus: string) => {
    updateSession.mutate({ id, status: currentStatus === "completed" ? "pending" : "completed" });
  };

  const openAdd = () => {
    setEditingId(null);
    setFormTask(emptyTask);
    setShowModal(true);
  };

  const openEdit = (task: any) => {
    setEditingId(task.id);
    setFormTask({ subject: task.subject, time_start: task.time_start.slice(0, 5), time_end: task.time_end.slice(0, 5), priority: task.priority, notes: task.notes });
    setShowModal(true);
  };

  const duplicateSession = (task: any) => {
    addSession.mutate({ subject: task.subject, time_start: task.time_start.slice(0, 5), time_end: task.time_end.slice(0, 5), priority: task.priority, notes: task.notes, date: dateStr });
    toast({ title: "Duplicated", description: `"${task.subject}" duplicated.` });
  };

  const handleSubmit = () => {
    if (!formTask.subject) return;
    if (editingId) {
      updateSession.mutate({ id: editingId, ...formTask });
      toast({ title: "Updated", description: "Session updated successfully." });
    } else {
      addSession.mutate({ ...formTask, date: dateStr });
    }
    setFormTask(emptyTask);
    setEditingId(null);
    setShowModal(false);
  };

  // Filtered sessions
  const filtered = sessions.filter((s) => {
    if (filterPriority !== "all" && s.priority !== filterPriority) return false;
    if (filterSubject && !s.subject.toLowerCase().includes(filterSubject.toLowerCase())) return false;
    return true;
  });

  // Get unique subjects for reference
  const subjects = [...new Set(sessions.map((s) => s.subject))];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Study Planner</h1>
            <p className="mt-1 text-muted-foreground">{format(selectedDate, "EEEE, MMMM d, yyyy")}</p>
          </div>
          <Button onClick={openAdd} className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" /> Add Session
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {days.map((d) => {
            const isSelected = format(d, "yyyy-MM-dd") === dateStr;
            return (
              <button key={d.toISOString()} onClick={() => setSelectedDate(d)}
                className={`flex-shrink-0 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                  isSelected ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-muted card-shadow"
                }`}
              >
                {format(d, "EEE d")}
              </button>
            );
          })}
        </div>

        {/* Filters */}
        {sessions.length > 0 && (
          <div className="flex flex-wrap gap-3 items-center">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search subject..." className="w-48 rounded-xl h-9 text-sm" value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)} />
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-32 rounded-xl h-9 text-sm"><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                <SelectItem value="High">High</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl bg-card p-12 card-shadow text-center">
            <Clock className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <h2 className="text-lg font-semibold text-foreground">{sessions.length === 0 ? "No sessions scheduled" : "No matching sessions"}</h2>
            <p className="text-muted-foreground mt-1 text-sm">{sessions.length === 0 ? 'Click "Add Session" to plan your study time.' : "Try adjusting your filters."}</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {filtered.map((task) => (
              <motion.div key={task.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 rounded-2xl bg-card p-5 card-shadow hover:card-shadow-hover transition-shadow"
              >
                <button onClick={() => toggleTask(task.id, task.status)}
                  className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                    task.status === "completed" ? "border-success bg-success" : "border-border hover:border-primary"
                  }`}
                >
                  {task.status === "completed" && (
                    <svg className="h-3 w-3 text-success-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${task.status === "completed" ? "text-muted-foreground line-through" : "text-foreground"}`}>{task.subject}</p>
                  <p className="text-sm text-muted-foreground truncate">{task.notes}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-medium ${
                    task.priority === "High" ? "bg-destructive/10 text-destructive"
                    : task.priority === "Medium" ? "bg-warning/10 text-warning"
                    : "bg-muted text-muted-foreground"
                  }`}>{task.priority}</span>
                  <span className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />{task.time_start.slice(0, 5)} – {task.time_end.slice(0, 5)}
                  </span>
                  <button onClick={() => openEdit(task)} className="text-muted-foreground hover:text-primary transition-colors">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => duplicateSession(task)} className="text-muted-foreground hover:text-primary transition-colors">
                    <Copy className="h-4 w-4" />
                  </button>
                  <button onClick={() => deleteSession.mutate(task.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
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
              onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card p-6 card-shadow-hover space-y-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">{editingId ? "Edit Session" : "New Study Session"}</h2>
                <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <Label>Subject</Label>
                  <Input className="mt-1.5 rounded-xl" value={formTask.subject} onChange={(e) => setFormTask((p) => ({ ...p, subject: e.target.value }))} placeholder="e.g. Mathematics" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Start Time</Label>
                    <Input className="mt-1.5 rounded-xl" type="time" value={formTask.time_start} onChange={(e) => setFormTask((p) => ({ ...p, time_start: e.target.value }))} />
                  </div>
                  <div>
                    <Label>End Time</Label>
                    <Input className="mt-1.5 rounded-xl" type="time" value={formTask.time_end} onChange={(e) => setFormTask((p) => ({ ...p, time_end: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={formTask.priority} onValueChange={(v) => setFormTask((p) => ({ ...p, priority: v }))}>
                    <SelectTrigger className="mt-1.5 rounded-xl"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="High">High</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Input className="mt-1.5 rounded-xl" value={formTask.notes} onChange={(e) => setFormTask((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button className="flex-1 rounded-xl" onClick={handleSubmit} disabled={addSession.isPending || updateSession.isPending}>
                  {editingId ? "Save Changes" : "Add Session"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
