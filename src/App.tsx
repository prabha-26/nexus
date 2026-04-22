import React, { useState, useEffect, FormEvent, useRef, ReactNode, ErrorInfo } from "react";
import {
  supabase,
  handleSupabaseError,
  OperationType,
  testSupabaseConnection,
  getUserAvatar,
  getUserDisplayName,
  isSupabaseConfigured,
  supabaseConfigMessage,
  normalizePost,
  type FeedPost,
} from "./lib/supabase";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { 
  LogOut, 
  Send, 
  User as UserIcon, 
  Loader2, 
  ArrowRight, 
  Zap, 
  Shield, 
  Globe,
  MessageSquare,
  Sparkles,
  Github,
  Twitter,
  Mail,
  Lock,
  UserPlus,
  ChevronRight,
  Plus,
  Sun,
  Moon
} from "lucide-react";
import { motion, AnimatePresence, useScroll, useSpring, useMotionValue } from "motion/react";
import { ThemeProvider, useTheme } from "next-themes";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<{ children: ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    const { hasError, error } = this.state;
    if (hasError) {
      let errorMessage = "An unexpected error occurred.";
      try {
        const parsed = JSON.parse(error?.message || "");
        if (parsed.error) errorMessage = `Supabase Error: ${parsed.error}`;
      } catch (e) {
        errorMessage = error?.message || errorMessage;
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-8">
          <div className="max-w-md w-full glass p-8 text-center">
            <Shield className="w-12 h-12 mx-auto mb-6 text-destructive" />
            <h2 className="text-2xl font-display font-bold uppercase italic mb-4 text-glow">System Failure</h2>
            <p className="text-muted-foreground font-mono text-sm mb-8">{errorMessage}</p>
            <Button 
              onClick={() => window.location.reload()}
              className="w-full bg-foreground text-background hover:bg-foreground/90 rounded-none font-mono font-bold uppercase tracking-widest"
            >
              Restart System
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-full border border-border hover:bg-muted transition-colors"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
};

const MouseParallax = ({ children, factor = 20, className = "" }: { children: React.ReactNode, factor?: number, className?: string }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const mouseX = useSpring(x, { stiffness: 150, damping: 20 });
  const mouseY = useSpring(y, { stiffness: 150, damping: 20 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const moveX = (clientX - window.innerWidth / 2) / factor;
      const moveY = (clientY - window.innerHeight / 2) / factor;
      x.set(moveX);
      y.set(moveY);
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [factor, x, y]);

  return (
    <motion.div style={{ x: mouseX, y: mouseY }} className={className}>
      {children}
    </motion.div>
  );
};

const MagneticButton = ({ children, onClick, className = "" }: { children: React.ReactNode, onClick?: () => void, className?: string }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseX = useSpring(x, { stiffness: 150, damping: 15 });
  const mouseY = useSpring(y, { stiffness: 150, damping: 15 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY, currentTarget } = e;
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    x.set((clientX - centerX) * 0.5);
    y.set((clientY - centerY) * 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: mouseX, y: mouseY }}
      className={className}
    >
      <button onClick={onClick} className="w-full h-full">
        {children}
      </button>
    </motion.div>
  );
};

const Section = ({ children, className = "", id }: { children: React.ReactNode, className?: string, id?: string }) => (
  <motion.section
    id={id}
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: false, margin: "-100px" }}
    transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
    className={`relative min-h-screen flex items-center justify-center overflow-hidden px-8 ${className}`}
  >
    {children}
  </motion.section>
);

const CustomCursor = () => {
  const cursorX = useMotionValue(-100);
  const cursorY = useMotionValue(-100);
  const springConfig = { damping: 25, stiffness: 700 };
  const cursorXSpring = useSpring(cursorX, springConfig);
  const cursorYSpring = useSpring(cursorY, springConfig);

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };
    window.addEventListener("mousemove", moveCursor);
    return () => window.removeEventListener("mousemove", moveCursor);
  }, []);

  return (
    <motion.div
      className="fixed top-0 left-0 w-8 h-8 border border-white rounded-full pointer-events-none z-[9999] mix-blend-difference"
      style={{
        x: cursorXSpring,
        y: cursorYSpring,
        translateX: "-50%",
        translateY: "-50%",
      }}
    />
  );
};

export default function App() {
  const ThemeProviderWrapper = ThemeProvider as any;
  return (
    <ErrorBoundary>
      <ThemeProviderWrapper attribute="class" defaultTheme="dark">
        <AppContent />
      </ThemeProviderWrapper>
    </ErrorBoundary>
  );
}

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [newPost, setNewPost] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dbStatus, setDbStatus] = useState<"checking" | "online" | "offline" | "config">("checking");
  
  // Auth Form State
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  useEffect(() => {
    const checkConn = async () => {
      if (!isSupabaseConfigured) {
        setDbStatus("config");
        return;
      }

      const isOnline = await testSupabaseConnection();
      setDbStatus(isOnline ? "online" : "offline");
    };
    checkConn();
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      setUser(null);
      setPosts([]);
      return;
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event: string, session: { user: User | null } | null) => {
      const sessionUser = session?.user || null;

      if (sessionUser) {
        try {
          const { error } = await supabase.from("users").upsert(
            {
              uid: sessionUser.id,
              email: sessionUser.email ?? null,
              display_name: getUserDisplayName(sessionUser),
              photo_url: getUserAvatar(sessionUser),
              role: "user",
              updated_at: new Date().toISOString(),
            },
            { onConflict: "uid" },
          );

          if (error) {
            throw error;
          }
        } catch (error) {
          const appError = handleSupabaseError(error, OperationType.WRITE, "users", { rethrow: false });
          toast.error(appError.message || "PROFILE_SYNC_FAILED");
          setDbStatus("offline");
        }

        setUser(sessionUser);
      } else {
        setUser(null);
        setPosts([]);
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !supabase) return;

    const channel: any = supabase
      .channel('posts_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, (payload) => {
        // Refetch posts on any change
        fetchPosts();
      })
      .subscribe();

    const fetchPosts = async () => {
      try {
        const { data, error } = await supabase
          .from("posts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;
        setPosts((data || []).map((post: any) => normalizePost(post)));
      } catch (error) {
        const appError = handleSupabaseError(error, OperationType.LIST, "posts", { rethrow: false });
        setPosts([]);
        setDbStatus("offline");
        toast.error(appError.message || "POSTS_UNAVAILABLE");
      }
    };

    fetchPosts();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);



  const handleEmailAuth = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      toast.error(supabaseConfigMessage);
      return;
    }

    if (!email || !password) return;
    if (isRegistering && !displayName) {
      toast.error("NAME_REQUIRED");
      return;
    }

    setAuthLoading(true);
    try {
      if (isRegistering) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: displayName
            }
          }
        });
        if (error) throw error;
        toast.success("ACCOUNT_CREATED");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        toast.success("WELCOME_BACK");
      }
    } catch (error: any) {
      toast.error(error.message || "AUTH_ERROR");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    if (!supabase) {
      toast.error(supabaseConfigMessage);
      return;
    }

    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success("SESSION_TERMINATED");
    } catch (error) {
      toast.error("LOGOUT_ERROR");
    }
  };

  const handleCreatePost = async (e: FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      toast.error(supabaseConfigMessage);
      return;
    }

    if (!newPost.trim() || !user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('posts').insert({
        author_uid: user.id,
        author_name: getUserDisplayName(user),
        author_photo: getUserAvatar(user),
        content: newPost,
        created_at: new Date().toISOString()
      });
      if (error) throw error;
      setNewPost("");
      toast.success("DATA_PUBLISHED");
    } catch (error) {
      const appError = handleSupabaseError(error, OperationType.CREATE, "posts", { rethrow: false });
      toast.error(appError.message || "POST_CREATE_FAILED");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground font-mono">
        <motion.div 
          animate={{ opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="text-xs tracking-[0.5em]"
        >
          INITIALIZING_NEXUS_CORE...
        </motion.div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen bg-background font-sans text-foreground selection:bg-foreground selection:text-background relative cursor-none scanlines">
      <CustomCursor />
      <motion.div 
        className="fixed top-0 left-0 right-0 h-[2px] bg-foreground z-[200] origin-left"
        style={{ scaleX }}
      />
      <div className="fixed inset-0 bg-noise pointer-events-none z-50 opacity-[0.03] dark:opacity-[0.05]" />
      <Toaster position="bottom-right" />
      
      {/* Background Grid */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[100] bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="container mx-auto px-8 h-24 flex items-center justify-between">
          <div className="flex items-center gap-4 group cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="w-8 h-8 bg-foreground rounded-full flex items-center justify-center transition-all duration-500 group-hover:scale-125">
              <div className="w-2 h-2 bg-background rounded-full" />
            </div>
            <span className="text-xl font-mono font-bold tracking-[0.2em] uppercase">Nexus</span>
          </div>
          
          <div className="flex items-center gap-8 font-mono text-[10px] tracking-[0.3em] uppercase">
            <ThemeToggle />
            {user ? (
              <div className="flex items-center gap-6">
                <span className="hidden md:inline text-muted-foreground">{getUserDisplayName(user).toUpperCase()}</span>
                <button onClick={handleLogout} className="hover:text-foreground transition-colors">Terminate</button>
              </div>
            ) : (
              <div className="flex items-center gap-8">
                <button onClick={() => document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-foreground transition-colors">Access</button>
                <button onClick={() => document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })} className="px-4 py-2 border border-foreground hover:bg-foreground hover:text-background transition-all">Join</button>
              </div>
            )}
          </div>
        </div>
      </nav>

      <main>
        {!user ? (
          <>
            {/* Hero Section */}
            <Section>
              <div className="container mx-auto relative z-10">
                <div className="max-w-5xl mx-auto">
                  <MouseParallax factor={30}>
                    <motion.div
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ duration: 1, delay: 0.2 }}
                      className="mono-label mb-8 flex items-center gap-4"
                    >
                      <span className="w-12 h-[1px] bg-foreground/30" />
                      System_Status: Operational
                    </motion.div>
                    
                    <h1 className="text-[12vw] md:text-[10vw] font-display font-black leading-[0.8] tracking-tighter uppercase mb-12 italic text-glow">
                      <motion.span
                        initial={{ opacity: 0, y: 100, skewY: 10 }}
                        whileInView={{ opacity: 1, y: 0, skewY: 0 }}
                        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                        className="block glitch-hover cursor-pointer"
                      >
                        Digital
                      </motion.span>
                      <motion.span
                        initial={{ opacity: 0, y: 100, skewY: 10 }}
                        whileInView={{ opacity: 1, y: 0, skewY: 0 }}
                        transition={{ duration: 1.2, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                        className="block text-transparent stroke-foreground stroke-1 glitch-hover cursor-pointer" 
                        style={{ WebkitTextStroke: '1px var(--foreground)' }}
                      >
                        Nexus
                      </motion.span>
                    </h1>
                    
                    <div className="grid md:grid-cols-2 gap-12 items-end">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.4 }}
                      >
                        <p className="text-lg text-muted-foreground font-mono leading-relaxed max-w-md">
                          <span className="text-foreground">[01]</span> A decentralized protocol for creative evolution. <br />
                          <span className="text-foreground">[02]</span> Real-time data synchronization across the global node network. <br />
                          <span className="text-foreground">[03]</span> Encrypted. Immutable. Immersive.
                        </p>
                      </motion.div>
                      
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.6 }}
                        className="flex flex-col items-start gap-4 w-full"
                      >
                        <div className="w-full h-[1px] bg-border" />
                        <MagneticButton 
                          onClick={() => document.getElementById('auth-section')?.scrollIntoView({ behavior: 'smooth' })}
                          className="group flex items-center gap-4 text-2xl font-display font-bold uppercase italic"
                        >
                          <span className="flex items-center gap-4">
                            Initialize Connection
                            <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                          </span>
                        </MagneticButton>
                      </motion.div>
                    </div>
                  </MouseParallax>
                </div>
              </div>

              {/* Decorative Elements */}
              <div className="absolute inset-0 pointer-events-none">
                <MouseParallax factor={-40} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <motion.div 
                    animate={{ 
                      rotate: 360,
                    }}
                    transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
                    className="w-[70vw] h-[70vw] border border-foreground/5 rounded-full"
                  />
                </MouseParallax>
                
                <MouseParallax factor={-60} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <motion.div 
                    animate={{ 
                      rotate: -360,
                    }}
                    transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                    className="w-[85vw] h-[85vw] border border-foreground/5 rounded-full border-dashed"
                  />
                </MouseParallax>

                <div className="absolute top-1/4 right-10 w-32 h-32 border border-foreground/10 rounded-full flex items-center justify-center">
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="w-2 h-2 bg-foreground/20 rounded-full"
                  />
                </div>
              </div>

              <div className="absolute bottom-12 left-8 font-mono text-[10px] text-muted-foreground vertical-text tracking-[0.5em] uppercase">
                EST_2026 // NEXUS_CORE
              </div>
            </Section>

            {/* Auth Section */}
            <Section id="auth-section" className="bg-muted/30">
              <div className="container mx-auto">
                <div className="grid lg:grid-cols-2 gap-24 items-center">
                  <div>
                    <div className="mono-label mb-6">Security_Protocol</div>
                    <h2 className="text-6xl font-display font-bold uppercase italic mb-8 text-glow">Authentication <br /> Required</h2>
                    <p className="text-muted-foreground font-mono text-sm leading-relaxed max-w-sm mb-12">
                      Access to the global feed requires a verified node identity. 
                      Choose your entry point below.
                    </p>
                    
                    <div className="space-y-4">
                      <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
                        <div className="w-2 h-2 bg-foreground rounded-full" />
                        End-to-end encryption active
                      </div>
                      <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
                        <div className="w-2 h-2 bg-foreground rounded-full" />
                        Global node distribution: 142
                      </div>
                    </div>
                  </div>

                  <motion.div>
                    <Card className="bg-background border-border rounded-none p-8 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 font-mono text-[8px] text-muted-foreground uppercase">
                        Ref: {Math.random().toString(36).substring(7)}
                      </div>
                      
                      <form onSubmit={handleEmailAuth} className="space-y-8">
                        {isRegistering && (
                          <div className="space-y-2">
                            <label className="mono-label">Identity_Name</label>
                            <Input 
                              placeholder="NODE_ID" 
                              className="bg-transparent border-b border-border rounded-none h-12 focus:border-foreground transition-colors font-mono"
                              value={displayName}
                              onChange={(e) => setDisplayName(e.target.value)}
                              required
                            />
                          </div>
                        )}
                        <div className="space-y-2">
                          <label className="mono-label">Email_Address</label>
                          <Input 
                            type="email" 
                            placeholder="USER@NETWORK" 
                            className="bg-transparent border-b border-border rounded-none h-12 focus:border-foreground transition-colors font-mono"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="mono-label">Access_Key</label>
                          <Input 
                            type="password" 
                            placeholder="••••••••" 
                            className="bg-transparent border-b border-border rounded-none h-12 focus:border-foreground transition-colors font-mono"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                          />
                        </div>
                        
                        <div className="flex flex-col gap-4">
                          <Button 
                            type="submit" 
                            className="w-full h-14 bg-foreground text-background hover:bg-foreground/90 rounded-none font-mono font-bold uppercase tracking-widest"
                            disabled={authLoading || !isSupabaseConfigured}
                          >
                            {authLoading ? "Processing..." : (isRegistering ? "Register_Node" : "Establish_Link")}
                          </Button>
                        </div>
                      </form>

                      {!isSupabaseConfigured && (
                        <p className="mt-6 font-mono text-[10px] leading-relaxed text-muted-foreground">
                          {supabaseConfigMessage}
                        </p>
                      )}
                      
                      <div className="mt-8 pt-8 border-t border-border flex justify-center">
                        <button 
                          onClick={() => setIsRegistering(!isRegistering)}
                          className="mono-label hover:text-foreground transition-colors"
                        >
                          {isRegistering ? "Switch to Login" : "Switch to Register"}
                        </button>
                      </div>
                    </Card>
                  </motion.div>
                </div>
              </div>
            </Section>
          </>
        ) : (
          /* Dashboard Layout */
          <div className="container mx-auto px-8 py-32">
            <div className="grid lg:grid-cols-[1fr_350px] gap-16">
              {/* Feed Column */}
              <div className="space-y-16">
                <div className="flex items-end justify-between border-b border-border pb-8">
                  <div>
                    <div className="mono-label mb-2">Global_Stream</div>
                    <h2 className="text-5xl font-display font-bold uppercase italic">Nexus Feed</h2>
                  </div>
                  <div className="font-mono text-[10px] text-muted-foreground uppercase tracking-widest">
                    Nodes_Online: 1,402
                  </div>
                </div>

                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-foreground/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity blur" />
                  <Card className="bg-card border-border rounded-none relative">
                    <form onSubmit={handleCreatePost}>
                      <div className="p-8">
                        <textarea 
                          placeholder="TRANSMIT_DATA..." 
                          value={newPost}
                          onChange={(e) => setNewPost(e.target.value)}
                          className="w-full bg-transparent border-none focus:ring-0 text-2xl font-display font-bold italic resize-none min-h-[150px] placeholder:text-muted-foreground/30"
                        />
                      </div>
                      <div className="px-8 py-6 border-t border-border flex items-center justify-between">
                        <div className="flex gap-4">
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          <span className="mono-label">Uplink_Ready</span>
                        </div>
                        <Button 
                          type="submit" 
                          disabled={isSubmitting || !newPost.trim()} 
                          className="bg-foreground text-background hover:bg-foreground/90 rounded-none px-12 h-12 font-mono font-bold uppercase tracking-widest"
                        >
                          {isSubmitting ? "Transmitting..." : "Send"}
                        </Button>
                      </div>
                    </form>
                  </Card>
                </div>

                <div className="space-y-12">
                  <AnimatePresence mode="popLayout">
                    {posts.map((post) => (
                      <motion.div
                        key={post.id}
                        layout
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="group"
                      >
                        <div className="relative">
                          <div className="absolute left-0 top-0 bottom-0 w-[1px] bg-border group-hover:bg-foreground/40 transition-colors" />
                          <div className="pl-8 py-4">
                            <div className="flex items-center justify-between mb-6">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-muted border border-border flex items-center justify-center">
                                  {post.author_photo ? (
                                    <img src={post.author_photo} alt="" className="w-full h-full object-cover grayscale opacity-50 hover:grayscale-0 hover:opacity-100 transition-all" referrerPolicy="no-referrer" />
                                  ) : (
                                    <UserIcon className="w-5 h-5 text-muted-foreground" />
                                  )}
                                </div>
                                <div>
                                  <p className="text-sm font-mono font-bold uppercase tracking-wider">{post.author_name}</p>
                                  <p className="mono-label !text-[8px]">
                                    {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                  </p>
                                </div>
                              </div>
                              <div className="font-mono text-[8px] text-muted-foreground uppercase">
                                ID: {post.id.substring(0, 8)}
                              </div>
                            </div>
                            <p className="text-2xl font-display font-bold italic text-muted-foreground group-hover:text-foreground transition-colors leading-tight">
                              {post.content}
                            </p>
                            <div className="mt-8 flex gap-8">
                              <button className="mono-label hover:text-foreground transition-colors flex items-center gap-2">
                                <Plus className="w-3 h-3" /> Interact
                              </button>
                              <button className="mono-label hover:text-foreground transition-colors flex items-center gap-2">
                                <Zap className="w-3 h-3" /> Boost
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              {/* Sidebar Column */}
              <aside className="hidden lg:block space-y-16 sticky top-32">
                <div>
                  <div className="mono-label mb-6">Node_Status</div>
                  <Card className="bg-card border-border rounded-none p-6">
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <span className="mono-label !text-muted-foreground">Database</span>
                        <span className={`font-mono text-xs ${dbStatus === 'online' ? 'text-green-500' : dbStatus === 'config' ? 'text-amber-500' : dbStatus === 'offline' ? 'text-destructive' : 'text-muted-foreground'}`}>
                          {dbStatus.toUpperCase()}
                        </span>
                      </div>
                      {dbStatus === "config" && (
                        <p className="font-mono text-[10px] leading-relaxed text-muted-foreground">
                          Configure <span className="text-foreground">VITE_SUPABASE_URL</span> and <span className="text-foreground">VITE_SUPABASE_PUBLISHABLE_KEY</span> to connect the app to your Supabase cloud database.
                        </p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="mono-label !text-muted-foreground">Uptime</span>
                        <span className="font-mono text-xs">99.99%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="mono-label !text-muted-foreground">Latency</span>
                        <span className="font-mono text-xs text-green-500">24ms</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="mono-label !text-muted-foreground">Protocol</span>
                        <span className="font-mono text-xs">v2.0.4</span>
                      </div>
                    </div>
                  </Card>
                </div>

                <div>
                  <div className="mono-label mb-6">Trending_Signals</div>
                  <div className="space-y-4">
                    {['#DECENTRALIZED', '#WEBGL', '#IMMERSIVE', '#NEXUS'].map((tag) => (
                      <button key={tag} className="w-full flex items-center justify-between group py-2 border-b border-border hover:border-foreground/20 transition-colors">
                        <span className="font-display font-bold italic text-muted-foreground group-hover:text-foreground transition-colors uppercase">{tag}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-12">
                  <div className="w-full aspect-square border border-border flex items-center justify-center relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-foreground/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="text-center relative z-10">
                      <Sparkles className="w-8 h-8 mx-auto mb-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                      <p className="mono-label">Nexus_Pro</p>
                      <button className="mt-4 text-[10px] font-mono font-bold border border-border px-4 py-2 hover:bg-foreground hover:text-background transition-all">Upgrade</button>
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-24 bg-background relative z-10">
        <div className="container mx-auto px-8">
          <div className="grid md:grid-cols-2 gap-16 items-start mb-24">
            <div>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-6 h-6 bg-foreground rounded-full" />
                <span className="text-xl font-mono font-bold tracking-[0.2em] uppercase">Nexus</span>
              </div>
              <p className="text-muted-foreground font-mono text-sm max-w-sm leading-relaxed">
                Building the future of digital interaction through decentralized protocols and immersive experiences.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-12">
              <div className="space-y-4">
                <div className="mono-label">Network</div>
                <ul className="space-y-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  <li><a href="#" className="hover:text-foreground transition-colors">Nodes</a></li>
                  <li><a href="#" className="hover:text-foreground transition-colors">Protocol</a></li>
                  <li><a href="#" className="hover:text-foreground transition-colors">Security</a></li>
                </ul>
              </div>
              <div className="space-y-4">
                <div className="mono-label">Social</div>
                <ul className="space-y-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  <li><a href="#" className="hover:text-foreground transition-colors">Twitter</a></li>
                  <li><a href="#" className="hover:text-foreground transition-colors">Github</a></li>
                  <li><a href="#" className="hover:text-foreground transition-colors">Discord</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 pt-12 border-t border-border">
            <div className="mono-label !text-muted-foreground/50">© 2026 // NEXUS_CORE_SYSTEMS</div>
            <div className="flex gap-12 mono-label !text-muted-foreground/50">
              <span>LAT: 34.0522° N</span>
              <span>LNG: 118.2437° W</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
