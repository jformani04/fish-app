import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useAuth } from "@/auth/AuthProvider";
import {
  FriendProfile,
  FriendRequest,
  getFriends,
  getPendingRequests,
} from "@/lib/friends";

type FriendsContextType = {
  friends: FriendProfile[];
  pendingRequests: FriendRequest[];
  friendsLoading: boolean;
  refreshFriends: () => Promise<void>;
};

const FriendsContext = createContext<FriendsContextType | null>(null);

export function FriendsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FriendRequest[]>([]);
  const [friendsLoading, setFriendsLoading] = useState(false);

  const refreshFriends = useCallback(async () => {
    if (!user) return;
    setFriendsLoading(true);
    try {
      const [f, r] = await Promise.all([
        getFriends(user.id),
        getPendingRequests(user.id),
      ]);
      setFriends(f);
      setPendingRequests(r);
    } catch (err) {
      console.log("[FriendsProvider] error", err);
    } finally {
      setFriendsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      refreshFriends();
    } else {
      setFriends([]);
      setPendingRequests([]);
    }
  }, [user]);

  return (
    <FriendsContext.Provider
      value={{ friends, pendingRequests, friendsLoading, refreshFriends }}
    >
      {children}
    </FriendsContext.Provider>
  );
}

export function useFriends() {
  const ctx = useContext(FriendsContext);
  if (!ctx) throw new Error("useFriends must be used within FriendsProvider");
  return ctx;
}
