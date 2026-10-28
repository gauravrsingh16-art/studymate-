import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BookOpen, Mail, Lock, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const getFriendlyErrorMessage = (rawError: Error) => {
    const message = rawError.message || "";
    const lower = message.toLowerCase();

    if (lower.includes("invalid login credentials") || lower.includes("invalid_credentials")) {
      return "Invalid email or password. Please verify your credentials. If you recently created your account, confirm your email or check if confirmation is pending.";
    }
    if (lower.includes("email not confirmed")) {
      return "Your email address has not been verified yet. Please check your inbox (including your spam folder) for the verification link.";
    }
    if (lower.includes("rate limit") || lower.includes("too many requests")) {
      return "Too many sign-in attempts. Please wait a few moments and try again.";
    }
    if (lower.includes("failed to fetch") || lower.includes("network")) {
      return "Cannot connect to the authentication service. Please check your internet connection.";
    }
    return message;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      setError(getFriendlyErrorMessage(error));
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-6"
      >
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <BookOpen className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">StudyFlow</span>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to continue</p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
            <div className="space-y-1">
              <p>{error}</p>
              {error.includes("Invalid email or password") && (
                <p className="text-xs text-muted-foreground">
                  New here? <Link to="/signup" className="text-primary underline font-medium">Create an account</Link> or <Link to="/forgot-password" className="text-primary underline font-medium">reset password</Link>.
                </p>
              )}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Email</Label>
            <div className="relative mt-1.5">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-10 rounded-xl" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" />
            </div>
          </div>
          <div>
            <Label>Password</Label>
            <div className="relative mt-1.5">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-10 rounded-xl" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
            </div>
          </div>
          <Button type="submit" className="w-full rounded-xl" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </Button>
        </form>

        <div className="text-center text-sm text-muted-foreground space-y-2">
          <Link to="/forgot-password" className="block hover:text-foreground transition-colors">Forgot password?</Link>
          <p>Don't have an account?{" "}<Link to="/signup" className="text-primary font-medium hover:underline">Sign up</Link></p>
        </div>
      </motion.div>
    </div>
  );
}
