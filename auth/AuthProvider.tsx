import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { getUserProviders } from "@/lib/authProviders";

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

// Returns true when an email/password account has not yet verified their email.
// Google accounts always have email_confirmed_at set by the OAuth provider, so
// they are never blocked. Linked accounts (email + google) are also not blocked.
function isEmailUnverified(user: User): boolean {
  const providers = getUserProviders(user);
  const hasOnlyEmailProvider =
    providers.length === 0 ||
    (providers.length === 1 && providers[0] === "email");
  return hasOnlyEmailProvider && !user.email_confirmed_at;
}

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
      const currentUser = sessionData.session?.user ?? null;

      // Clear any persisted session that belongs to an unverified email account.
      // This guards against stale tokens from before email confirmation was enabled.
      if (currentUser && isEmailUnverified(currentUser)) {
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setSession(sessionData.session);
      setUser(currentUser);

      if (currentUser) {
        await loadProfile(currentUser.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    };

    fetchSessionAndProfile();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      const currentUser = session?.user ?? null;

      if (event === "SIGNED_IN" && currentUser) {
        // Prevent unverified email accounts from entering the app. Supabase
        // normally blocks login before a session is issued, but this is a
        // defense-in-depth check for edge cases (e.g. Google auto-link of an
        // unconfirmed email account).
        if (isEmailUnverified(currentUser)) {
          await supabase.auth.signOut();
          return;
        }
      }

      setSession(session);
      setUser(currentUser);

      if (event === "SIGNED_OUT" || !currentUser) {
        setProfile(null);
        return;
      }

      // Avoid repeated profile fetches on token refresh events.
      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        loadProfile(currentUser.id);
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
