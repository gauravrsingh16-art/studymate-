import { useState, useEffect } from "react";
import { User, Clock, Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useProfile, useUpdateProfile } from "@/hooks/useData";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: "",
    email: "",
    institution: "",
    major: "",
    daily_study_goal: 6,
    session_duration: 45,
    break_duration: 10,
    preferred_start_time: "09:00",
    theme: "light",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        name: profile.name ?? "",
        email: profile.email ?? "",
        institution: profile.institution ?? "",
        major: profile.major ?? "",
        daily_study_goal: profile.daily_study_goal ?? 6,
        session_duration: profile.session_duration ?? 45,
        break_duration: profile.break_duration ?? 10,
        preferred_start_time: profile.preferred_start_time?.slice(0, 5) ?? "09:00",
        theme: profile.theme ?? "light",
      });
      // Apply theme from profile and persist to localStorage
      const isDark = profile.theme === "dark";
      document.documentElement.classList.toggle("dark", isDark);
      localStorage.setItem("studyflow-theme", profile.theme ?? "light");
    }
  }, [profile]);

  const toggleTheme = (checked: boolean) => {
    const theme = checked ? "dark" : "light";
    setForm((p) => ({ ...p, theme }));
    document.documentElement.classList.toggle("dark", checked);
    localStorage.setItem("studyflow-theme", theme);
  };

  const handleSave = () => {
    updateProfile.mutate(form, {
      onSuccess: () => {
        toast({ title: "Profile saved", description: "Your preferences have been updated." });
        localStorage.setItem("studyflow-theme", form.theme);
      },
      onError: (e) => toast({ title: "Error", description: e.message, variant: "destructive" }),
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Profile & Settings</h1>
          <p className="mt-1 text-muted-foreground">Manage your preferences</p>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl bg-card p-6 card-shadow space-y-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/8">
              <User className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Personal Details</h2>
              <p className="text-sm text-muted-foreground">Your account information</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Full Name</Label><Input className="mt-1.5 rounded-xl" value={form.name} onChange={(e) => setForm(p => ({ ...p, name: e.target.value }))} /></div>
            <div><Label>Email</Label><Input className="mt-1.5 rounded-xl" value={form.email} disabled /></div>
            <div><Label>Institution</Label><Input className="mt-1.5 rounded-xl" value={form.institution} onChange={(e) => setForm(p => ({ ...p, institution: e.target.value }))} /></div>
            <div><Label>Major</Label><Input className="mt-1.5 rounded-xl" value={form.major} onChange={(e) => setForm(p => ({ ...p, major: e.target.value }))} /></div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl bg-card p-6 card-shadow space-y-5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/8">
              <Clock className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Study Preferences</h2>
              <p className="text-sm text-muted-foreground">Customize your routine</p>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>Daily Study Goal (hours)</Label><Input className="mt-1.5 rounded-xl" type="number" value={form.daily_study_goal} onChange={(e) => setForm(p => ({ ...p, daily_study_goal: Number(e.target.value) }))} /></div>
            <div><Label>Session Duration (min)</Label><Input className="mt-1.5 rounded-xl" type="number" value={form.session_duration} onChange={(e) => setForm(p => ({ ...p, session_duration: Number(e.target.value) }))} /></div>
            <div><Label>Break Duration (min)</Label><Input className="mt-1.5 rounded-xl" type="number" value={form.break_duration} onChange={(e) => setForm(p => ({ ...p, break_duration: Number(e.target.value) }))} /></div>
            <div><Label>Preferred Start Time</Label><Input className="mt-1.5 rounded-xl" type="time" value={form.preferred_start_time} onChange={(e) => setForm(p => ({ ...p, preferred_start_time: e.target.value }))} /></div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-2xl bg-card p-6 card-shadow space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {form.theme === "dark" ? <Moon className="h-5 w-5 text-primary" /> : <Sun className="h-5 w-5 text-primary" />}
              <div>
                <p className="font-medium text-foreground">Dark Mode</p>
                <p className="text-sm text-muted-foreground">Switch between light and dark themes</p>
              </div>
            </div>
            <Switch checked={form.theme === "dark"} onCheckedChange={toggleTheme} />
          </div>
        </motion.div>

        <Button className="rounded-xl w-full sm:w-auto" onClick={handleSave} disabled={updateProfile.isPending}>
          {updateProfile.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </Layout>
  );
}
