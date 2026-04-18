import { supabase } from "@/lib/supabase";
import { MapCatchPin } from "@/lib/catches";

export type FriendshipStatus = "pending" | "accepted" | "blocked";

export type FriendProfile = {
  id: string;
  username: string;
  avatarUrl: string | null;
  bio: string | null;
};

export type FriendRequest = {
  id: string;
  requesterId: string;
  receiverId: string;
  status: FriendshipStatus;
  createdAt: string;
  profile: FriendProfile;
};

export type FriendshipStatusResult = {
  status: FriendshipStatus | null;
  requestId: string | null;
  iAmRequester: boolean;
};

type ProfileRow = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
};

type FriendshipRow = {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: FriendshipStatus;
  created_at: string;
};

type FriendshipWithBoth = FriendshipRow & {
  requester: ProfileRow | null;
  receiver: ProfileRow | null;
};

type FriendshipWithRequester = FriendshipRow & {
  requester: ProfileRow | null;
};

type FriendshipWithReceiver = FriendshipRow & {
  receiver: ProfileRow | null;
};

function mapProfileRow(row: ProfileRow): FriendProfile {
  return {
    id: row.id,
    username: row.username ?? "Angler",
    avatarUrl: row.avatar_url ?? null,
    bio: row.bio ?? null,
  };
}

export async function sendFriendRequest(receiverId: string): Promise<void> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("No authenticated user");

  const { error } = await supabase.from("friendships").insert({
    requester_id: user.id,
    receiver_id: receiverId,
    status: "pending",
  });
  if (error) throw error;
}

export async function acceptFriendRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted" })
    .eq("id", requestId);
  if (error) throw error;
}

export async function declineFriendRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", requestId);
  if (error) throw error;
}

export async function cancelFriendRequest(requestId: string): Promise<void> {
  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", requestId);
  if (error) throw error;
}

export async function removeFriend(requestId: string): Promise<void> {
  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("id", requestId);
  if (error) throw error;
}

export async function getFriends(userId: string): Promise<FriendProfile[]> {
  const { data, error } = await supabase
    .from("friendships")
    .select(
      `id, requester_id, receiver_id, status, created_at,
       requester:profiles!requester_id(id, username, avatar_url, bio),
       receiver:profiles!receiver_id(id, username, avatar_url, bio)`
    )
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`);

  if (error) throw error;

  return ((data ?? []) as FriendshipWithBoth[]).map((row) => {
    const profileRow =
      row.requester_id === userId ? row.receiver : row.requester;
    return mapProfileRow(
      profileRow ?? { id: "", username: null, avatar_url: null, bio: null }
    );
  });
}

export async function getPendingRequests(
  userId: string
): Promise<FriendRequest[]> {
  const { data, error } = await supabase
    .from("friendships")
    .select(
      `id, requester_id, receiver_id, status, created_at,
       requester:profiles!requester_id(id, username, avatar_url, bio)`
    )
    .eq("receiver_id", userId)
    .eq("status", "pending");

  if (error) throw error;

  return ((data ?? []) as FriendshipWithRequester[]).map((row) => ({
    id: row.id,
    requesterId: row.requester_id,
    receiverId: row.receiver_id,
    status: row.status,
    createdAt: row.created_at,
    profile: mapProfileRow(
      row.requester ?? {
        id: row.requester_id,
        username: null,
        avatar_url: null,
        bio: null,
      }
    ),
  }));
}

export async function getSentRequests(
  userId: string
): Promise<FriendRequest[]> {
  const { data, error } = await supabase
    .from("friendships")
    .select(
      `id, requester_id, receiver_id, status, created_at,
       receiver:profiles!receiver_id(id, username, avatar_url, bio)`
    )
    .eq("requester_id", userId)
    .eq("status", "pending");

  if (error) throw error;

  return ((data ?? []) as FriendshipWithReceiver[]).map((row) => ({
    id: row.id,
    requesterId: row.requester_id,
    receiverId: row.receiver_id,
    status: row.status,
    createdAt: row.created_at,
    profile: mapProfileRow(
      row.receiver ?? {
        id: row.receiver_id,
        username: null,
        avatar_url: null,
        bio: null,
      }
    ),
  }));
}

export async function getFriendshipStatus(
  otherUserId: string
): Promise<FriendshipStatusResult> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("No authenticated user");

  // Check both directions separately (most reliable with PostgREST)
  const { data: asRequester } = await supabase
    .from("friendships")
    .select("id, requester_id, receiver_id, status")
    .eq("requester_id", user.id)
    .eq("receiver_id", otherUserId)
    .maybeSingle();

  if (asRequester) {
    const row = asRequester as FriendshipRow;
    return { status: row.status, requestId: row.id, iAmRequester: true };
  }

  const { data: asReceiver } = await supabase
    .from("friendships")
    .select("id, requester_id, receiver_id, status")
    .eq("requester_id", otherUserId)
    .eq("receiver_id", user.id)
    .maybeSingle();

  if (asReceiver) {
    const row = asReceiver as FriendshipRow;
    return { status: row.status, requestId: row.id, iAmRequester: false };
  }

  return { status: null, requestId: null, iAmRequester: false };
}

export async function searchUsers(query: string): Promise<FriendProfile[]> {
  if (!query.trim()) return [];

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError) throw userError;
  if (!user) throw new Error("No authenticated user");

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, avatar_url, bio")
    .ilike("username", `%${query.trim()}%`)
    .neq("id", user.id)
    .limit(20);

  if (error) throw error;

  return ((data ?? []) as ProfileRow[]).map(mapProfileRow);
}

export async function getFriendCatchPins(
  friendIds: string[]
): Promise<MapCatchPin[]> {
  if (friendIds.length === 0) return [];

  const { data, error } = await supabase
    .from("catch_logs")
    .select("id, species, latitude, longitude, image_url, date, hide_location")
    .in("user_id", friendIds)
    .eq("is_public", true)
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  if (error) throw error;

  return ((data ?? []) as any[])
    .filter(
      (row) =>
        !row.hide_location &&
        typeof row.latitude === "number" &&
        typeof row.longitude === "number" &&
        isFinite(row.latitude) &&
        isFinite(row.longitude)
    )
    .map((row) => ({
      id: row.id as string,
      species: (row.species as string | null) ?? "Unknown",
      latitude: row.latitude as number,
      longitude: row.longitude as number,
      imageUrl: (row.image_url as string | null) ?? "",
      date: (row.date as string | null) ?? "",
    }));
}

// ---- Rich map pin (includes weight/length/username for callout card) ----

export type FriendMapPin = {
  id: string;
  species: string;
  latitude: number;
  longitude: number;
  imageUrl: string;
  date: string;
  weight: string;
  length: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
};

export async function getFriendMapPins(
  friendIds: string[]
): Promise<FriendMapPin[]> {
  if (friendIds.length === 0) return [];

  const { data: pinsData, error: pinsError } = await supabase
    .from("catch_logs")
    .select(
      "id, species, latitude, longitude, image_url, date, weight, length, user_id, hide_location"
    )
    .in("user_id", friendIds)
    .eq("is_public", true)
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  if (pinsError) throw pinsError;

  const validRows = ((pinsData ?? []) as any[]).filter(
    (row) =>
      !row.hide_location &&
      typeof row.latitude === "number" &&
      typeof row.longitude === "number" &&
      isFinite(row.latitude) &&
      isFinite(row.longitude)
  );

  if (validRows.length === 0) return [];

  const uniqueUserIds = [...new Set(validRows.map((r) => r.user_id as string))];
  const { data: profilesData, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", uniqueUserIds);

  if (profilesError) throw profilesError;

  const profileMap = new Map(
    ((profilesData ?? []) as any[]).map((p) => [p.id as string, p])
  );

  return validRows.map((row) => {
    const profile = profileMap.get(row.user_id as string);
    return {
      id: row.id as string,
      species: (row.species as string | null) ?? "Unknown",
      latitude: row.latitude as number,
      longitude: row.longitude as number,
      imageUrl: (row.image_url as string | null) ?? "",
      date: (row.date as string | null) ?? "",
      weight: (row.weight as string | null) ?? "",
      length: (row.length as string | null) ?? "",
      userId: row.user_id as string,
      username: (profile?.username as string | null) ?? "Angler",
      avatarUrl: (profile?.avatar_url as string | null) ?? null,
    };
  });
}

// ---- Friends feed ----

export type FeedItem = {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  species: string;
  weight: string;
  length: string;
  imageUrl: string;
  date: string;
  location: string;
};

export async function getFriendFeed(friendIds: string[]): Promise<FeedItem[]> {
  if (friendIds.length === 0) return [];

  const { data: rows, error } = await supabase
    .from("catch_logs")
    .select(
      "id, image_url, species, length, weight, location, date, user_id, created_at"
    )
    .in("user_id", friendIds)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  const uniqueUserIds = [
    ...new Set((rows as any[]).map((r) => r.user_id as string)),
  ];
  const { data: profilesData, error: profilesError } = await supabase
    .from("profiles")
    .select("id, username, avatar_url")
    .in("id", uniqueUserIds);

  if (profilesError) throw profilesError;

  const profileMap = new Map(
    ((profilesData ?? []) as any[]).map((p) => [p.id as string, p])
  );

  return (rows as any[]).map((row) => {
    const profile = profileMap.get(row.user_id as string);
    return {
      id: row.id as string,
      userId: row.user_id as string,
      username: (profile?.username as string | null) ?? "Angler",
      avatarUrl: (profile?.avatar_url as string | null) ?? null,
      species: (row.species as string | null) ?? "",
      weight: (row.weight as string | null) ?? "",
      length: (row.length as string | null) ?? "",
      imageUrl: (row.image_url as string | null) ?? "",
      date: (row.date as string | null) ?? "",
      location: (row.location as string | null) ?? "",
    };
  });
}

export async function getFriendPublicCatches(friendId: string) {
  const { data, error } = await supabase
    .from("catch_logs")
    .select(
      "id, image_url, species, length, weight, location, date, is_public, hide_location"
    )
    .eq("user_id", friendId)
    .eq("is_public", true)
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) throw error;

  return ((data ?? []) as any[]).map((row) => ({
    id: row.id as string,
    imageUrl: (row.image_url as string | null) ?? "",
    species: (row.species as string | null) ?? "",
    length: (row.length as string | null) ?? "",
    weight: (row.weight as string | null) ?? "",
    location: (row.location as string | null) ?? "",
    date: (row.date as string | null) ?? "",
  }));
}
