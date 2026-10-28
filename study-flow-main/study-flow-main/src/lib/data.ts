export const todayTasks = [
  { id: 1, subject: "Mathematics", time: "09:00 – 10:30", priority: "High", status: "completed" as const, notes: "Linear Algebra Ch. 4" },
  { id: 2, subject: "Physics", time: "11:00 – 12:30", priority: "Medium", status: "completed" as const, notes: "Thermodynamics review" },
  { id: 3, subject: "Computer Science", time: "14:00 – 15:30", priority: "High", status: "pending" as const, notes: "Data Structures – Trees" },
  { id: 4, subject: "English Literature", time: "16:00 – 17:00", priority: "Low", status: "pending" as const, notes: "Essay draft review" },
  { id: 5, subject: "Chemistry", time: "18:00 – 19:00", priority: "Medium", status: "pending" as const, notes: "Organic reactions" },
];

export const habits = [
  { id: 1, name: "Read 30 minutes", streak: 14, completedToday: true, weeklyData: [true, true, true, false, true, true, true] },
  { id: 2, name: "Review flashcards", streak: 7, completedToday: true, weeklyData: [true, false, true, true, true, true, true] },
  { id: 3, name: "Practice problems", streak: 5, completedToday: false, weeklyData: [true, true, true, true, true, false, false] },
  { id: 4, name: "Write summary notes", streak: 3, completedToday: false, weeklyData: [false, true, true, true, false, false, false] },
  { id: 5, name: "Morning review", streak: 21, completedToday: true, weeklyData: [true, true, true, true, true, true, true] },
];

export const weeklyStudyData = [
  { day: "Mon", hours: 5.5 },
  { day: "Tue", hours: 4.2 },
  { day: "Wed", hours: 6.0 },
  { day: "Thu", hours: 3.8 },
  { day: "Fri", hours: 5.0 },
  { day: "Sat", hours: 7.2 },
  { day: "Sun", hours: 4.5 },
];

export const goals = [
  { id: 1, title: "Complete Linear Algebra", target: 20, current: 14, unit: "chapters" },
  { id: 2, title: "Study 35 hours this week", target: 35, current: 28.5, unit: "hours" },
  { id: 3, title: "Maintain 90% habit streak", target: 90, current: 78, unit: "%" },
  { id: 4, title: "Finish CS project", target: 100, current: 65, unit: "%" },
];

export const monthlyGoals = [
  { id: 1, title: "Complete all midterm prep", target: 100, current: 72, unit: "%" },
  { id: 2, title: "Read 4 textbook chapters", target: 4, current: 3, unit: "chapters" },
  { id: 3, title: "Log 140 study hours", target: 140, current: 98, unit: "hours" },
];

export const weekDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
