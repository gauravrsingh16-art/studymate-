import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useUpdateProfile() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { error } = await supabase.from("profiles").update(updates).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profile"] }),
  });
}

export function useStudySessions(date?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["study_sessions", user?.id, date],
    queryFn: async () => {
      let q = supabase.from("study_sessions").select("*").eq("user_id", user!.id).order("time_start");
      if (date) q = q.eq("date", date);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

export function useAddSession() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (session: { subject: string; time_start: string; time_end: string; priority: string; notes: string; date: string }) => {
      const { error } = await supabase.from("study_sessions").insert({ ...session, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["study_sessions"] }),
  });
}

export function useUpdateSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, unknown>) => {
      const { error } = await supabase.from("study_sessions").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["study_sessions"] }),
  });
}

export function useDeleteSession() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("study_sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["study_sessions"] }),
  });
}

export function useHabits() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["habits", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("habits").select("*").eq("user_id", user!.id).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

export function useAddHabit() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (habit: { name: string; frequency: string; category?: string; notes?: string }) => {
      const { error } = await supabase.from("habits").insert({ ...habit, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habits"] }),
  });
}

export function useUpdateHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, unknown>) => {
      const { error } = await supabase.from("habits").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habits"] }),
  });
}

export function useDeleteHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("habits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habits"] }),
  });
}

export function useHabitCompletions(startDate: string, endDate: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["habit_completions", user?.id, startDate, endDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("habit_completions")
        .select("*")
        .eq("user_id", user!.id)
        .gte("date", startDate)
        .lte("date", endDate);
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

export function useToggleHabitCompletion() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ habitId, date, completed }: { habitId: string; date: string; completed: boolean }) => {
      if (completed) {
        const { error } = await supabase.from("habit_completions").upsert(
          { user_id: user!.id, habit_id: habitId, date, completed: true },
          { onConflict: "habit_id,date" }
        );
        if (error) throw error;
      } else {
        const { error } = await supabase.from("habit_completions").delete().eq("habit_id", habitId).eq("date", date);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["habit_completions"] }),
  });
}

export function useGoals(period?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["goals", user?.id, period],
    queryFn: async () => {
      let q = supabase.from("goals").select("*").eq("user_id", user!.id).order("created_at");
      if (period) q = q.eq("period", period);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

export function useAddGoal() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (goal: { title: string; target: number; unit: string; period: string }) => {
      const { error } = await supabase.from("goals").insert({ ...goal, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });
}

export function useUpdateGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, unknown>) => {
      const { error } = await supabase.from("goals").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });
}

// Milestones
export function useMilestones(goalId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["milestones", goalId],
    queryFn: async () => {
      const { data, error } = await supabase.from("goal_milestones").select("*").eq("goal_id", goalId).eq("user_id", user!.id).order("created_at");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user && !!goalId,
  });
}

export function useAddMilestone() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (milestone: { goal_id: string; title: string }) => {
      const { error } = await supabase.from("goal_milestones").insert({ ...milestone, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["milestones"] }),
  });
}

export function useToggleMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase.from("goal_milestones").update({ completed }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["milestones"] }),
  });
}

export function useDeleteMilestone() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("goal_milestones").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["milestones"] }),
  });
}

// Alarms
export function useAlarms() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["alarms", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("alarms").select("*").eq("user_id", user!.id).order("time");
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });
}

export function useAddAlarm() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (alarm: { label: string; time: string; days: string[] }) => {
      const { error } = await supabase.from("alarms").insert({ ...alarm, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alarms"] }),
  });
}

export function useUpdateAlarm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Record<string, unknown>) => {
      const { error } = await supabase.from("alarms").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alarms"] }),
  });
}

export function useDeleteAlarm() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("alarms").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alarms"] }),
  });
}
