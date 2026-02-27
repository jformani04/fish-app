import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User, } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

export type UserProfile = {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async (userId: string) => {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      setProfile(profileData);
    };

    const fetchSessionAndProfile = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      setSession(sessionData.session);
      setUser(sessionData.session?.user || null);

      if (sessionData.session?.user) {
        await loadProfile(sessionData.session.user.id);
      } else {
        setProfile(null);
      }

      setLoading(false);
    };

    fetchSessionAndProfile();

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user || null);

      if (event === "SIGNED_OUT" || !session?.user) {
        setProfile(null);
        return;
      }

      // Avoid repeated profile fetches on token refresh events.
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        loadProfile(session.user.id);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
