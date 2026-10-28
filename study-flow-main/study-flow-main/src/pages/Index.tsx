import { Link } from "react-router-dom";
import { Calendar, CheckSquare, BarChart3, Target, BookOpen, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import heroBg from "@/assets/hero-bg.jpg";

const features = [
  {
    icon: Calendar,
    title: "Daily Study Planner",
    description: "Organize your study sessions with a structured calendar. Set priorities, time slots, and track completion.",
  },
  {
    icon: CheckSquare,
    title: "Habit Tracker",
    description: "Build consistent study habits with daily tracking, streak counters, and weekly consistency charts.",
  },
  {
    icon: BarChart3,
    title: "Progress Analytics",
    description: "Visualize your productivity with clean charts showing study hours, habit adherence, and trends.",
  },
  {
    icon: Target,
    title: "Weekly & Monthly Goals",
    description: "Set clear academic goals and monitor your progress with intuitive progress indicators.",
  },
];

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <header className="sticky top-0 z-50 glass border-b">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <BookOpen className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold text-foreground">StudyFlow</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link to="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img src={heroBg} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="relative container py-24 md:py-32 lg:py-40">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="max-w-2xl"
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight text-foreground">
              Plan Better.{" "}
              <span className="text-primary">Study Smarter.</span>{" "}
              Build Consistent Habits.
            </h1>
            <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-xl">
              A focused productivity tool for students and learners. Organize study sessions, 
              track daily habits, and measure your progress — all in one calm, distraction-free space.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/signup">
                <Button size="lg" className="rounded-xl px-6">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg" className="rounded-xl px-6">
                  Sign In
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-20 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-lg mx-auto mb-16"
        >
          <h2 className="text-3xl font-bold text-foreground">Everything you need to stay on track</h2>
          <p className="mt-4 text-muted-foreground">Simple, focused tools designed for academic productivity.</p>
        </motion.div>

        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {features.map((f) => (
            <motion.div
              key={f.title}
              variants={fadeUp}
              className="rounded-2xl bg-card p-8 card-shadow hover:card-shadow-hover transition-shadow duration-300"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/8 mb-5">
                <f.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">StudyFlow</span>
          </div>
          <p className="text-sm text-muted-foreground">Built for focused learners. No distractions.</p>
        </div>
      </footer>
    </div>
  );
}
