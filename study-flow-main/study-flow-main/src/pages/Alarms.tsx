import { useState, useEffect, useRef } from "react";
import { Bell, Plus, X, Trash2, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useAlarms, useAddAlarm, useUpdateAlarm, useDeleteAlarm } from "@/hooks/useData";
import { useToast } from "@/hooks/use-toast";

const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function Alarms() {
  const { data: alarms = [], isLoading } = useAlarms();
  const addAlarm = useAddAlarm();
  const updateAlarm = useUpdateAlarm();
  const deleteAlarm = useDeleteAlarm();
  const { toast } = useToast();

  const [showModal, setShowModal] = useState(false);
  const [newAlarm, setNewAlarm] = useState({ label: "", time: "08:00", days: [] as string[] });
  const activeAlarmsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // Request notification permission
  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Check alarms every 30 seconds
  useEffect(() => {
    const check = () => {
      const now = new Date();
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      const currentDay = ALL_DAYS[now.getDay() === 0 ? 6 : now.getDay() - 1];

      alarms.forEach((alarm) => {
        if (!alarm.enabled) return;
        const alarmTime = alarm.time.slice(0, 5);
        if (alarmTime !== currentTime) return;
        if (alarm.days.length > 0 && !alarm.days.includes(currentDay)) return;

        // Don't re-trigger within the same minute
        const key = `${alarm.id}-${currentTime}`;
        if (activeAlarmsRef.current.has(key)) return;
        activeAlarmsRef.current.set(key, setTimeout(() => activeAlarmsRef.current.delete(key), 60000));

        // Sound alert
        try {
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 880;
          gain.gain.value = 0.4;
          osc.start();
          osc.stop(ctx.currentTime + 1);
        } catch {}

        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("⏰ Alarm", { body: alarm.label || `Alarm at ${alarmTime}` });
        }

        toast({ title: "⏰ Alarm!", description: alarm.label || `It's ${alarmTime}` });
      });
    };

    const interval = setInterval(check, 30000);
    check();
    return () => clearInterval(interval);
  }, [alarms, toast]);

  const toggleDay = (day: string) => {
    setNewAlarm((p) => ({
      ...p,
      days: p.days.includes(day) ? p.days.filter((d) => d !== day) : [...p.days, day],
    }));
  };

  const handleAdd = () => {
    if (!newAlarm.time) return;
    addAlarm.mutate({ label: newAlarm.label, time: newAlarm.time, days: newAlarm.days });
    setNewAlarm({ label: "", time: "08:00", days: [] });
    setShowModal(false);
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Alarms & Reminders</h1>
            <p className="mt-1 text-muted-foreground">{alarms.filter((a) => a.enabled).length} active alarms</p>
          </div>
          <Button onClick={() => setShowModal(true)} className="rounded-xl">
            <Plus className="mr-2 h-4 w-4" /> Add Alarm
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : alarms.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-2xl bg-card p-12 card-shadow text-center">
            <Bell className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <h2 className="text-lg font-semibold text-foreground">No alarms set</h2>
            <p className="text-muted-foreground mt-1 text-sm">Create alarms to get notified at specific times.</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {alarms.map((alarm, i) => (
              <motion.div key={alarm.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                className="flex items-center gap-4 rounded-2xl bg-card p-5 card-shadow hover:card-shadow-hover transition-shadow"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/8">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-2xl font-bold text-foreground tabular-nums">{alarm.time.slice(0, 5)}</p>
                  {alarm.label && <p className="text-sm text-muted-foreground">{alarm.label}</p>}
                  {alarm.days.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {ALL_DAYS.map((d) => (
                        <span key={d} className={`text-[10px] px-1.5 py-0.5 rounded ${alarm.days.includes(d) ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground/40"}`}>{d}</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={alarm.enabled} onCheckedChange={(checked) => updateAlarm.mutate({ id: alarm.id, enabled: checked })} />
                  <button onClick={() => deleteAlarm.mutate(alarm.id)} className="text-muted-foreground hover:text-destructive transition-colors">
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
              onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-card p-6 card-shadow-hover space-y-5"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-foreground">New Alarm</h2>
                <button onClick={() => setShowModal(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-4">
                <div>
                  <Label>Time</Label>
                  <Input className="mt-1.5 rounded-xl text-2xl font-bold text-center" type="time" value={newAlarm.time} onChange={(e) => setNewAlarm((p) => ({ ...p, time: e.target.value }))} />
                </div>
                <div>
                  <Label>Label (optional)</Label>
                  <Input className="mt-1.5 rounded-xl" value={newAlarm.label} onChange={(e) => setNewAlarm((p) => ({ ...p, label: e.target.value }))} placeholder="e.g. Morning study" />
                </div>
                <div>
                  <Label>Repeat on</Label>
                  <div className="flex gap-1.5 mt-2">
                    {ALL_DAYS.map((d) => (
                      <button key={d} onClick={() => toggleDay(d)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${newAlarm.days.includes(d) ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-border"}`}
                      >{d}</button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Leave empty for a one-time alarm</p>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 rounded-xl" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button className="flex-1 rounded-xl" onClick={handleAdd} disabled={addAlarm.isPending}>Set Alarm</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}
