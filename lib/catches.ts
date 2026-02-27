import { supabase } from "@/lib/supabase";

const DEBUG = process.env.EXPO_PUBLIC_DEBUG === "1";

export interface CatchLog {
  id: string;
  imageUrl: string;
  species: string;
  length: string;
  weight: string;
  location: string;
  temperature: string;
  weather: string;
  lure: string;
  method: string;
  notes: string;
  isPublic: boolean;
  hideLocation: boolean;
  date: string;
}

type CatchLogRow = {
  id: string;
  user_id: string;
  image_url: string | null;
  species: string | null;
  length: string | null;
  weight: string | null;
  location: string | null;
  temperature: string | null;
  weather: string | null;
  lure: string | null;
  method: string | null;
  notes: string | null;
  is_public: boolean | null;
  hide_location: boolean | null;
  date: string | null;
  created_at: string;
};

type CatchLogUpdateRow = {
  image_url: string;
  species: string;
  length: string;
  weight: string;
  location: string;
  temperature: string;
  weather: string;
  lure: string;
  method: string;
  notes: string;
  is_public: boolean;
  hide_location: boolean;
  date: string;
};

type CatchLogInsertInput = Omit<CatchLog, "id">;

function debugLog(message: string, payload?: unknown) {
  if (!DEBUG) return;
  if (payload === undefined) {
    console.log(`[catches] ${message}`);
    return;
  }
  console.log(`[catches] ${message}`, payload);
}

export function mapCatchLogRowToCatchLog(row: CatchLogRow): CatchLog {
  return {
    id: row.id,
    imageUrl: row.image_url ?? "",
    species: row.species ?? "",
    length: row.length ?? "",
    weight: row.weight ?? "",
    location: row.location ?? "",
    temperature: row.temperature ?? "",
    weather: row.weather ?? "",
    lure: row.lure ?? "",
    method: row.method ?? "",
    notes: row.notes ?? "",
    isPublic: row.is_public ?? false,
    hideLocation: row.hide_location ?? false,
    date: row.date ?? "",
  };
}

export function mapCatchLogToUpdateRow(catchLog: CatchLog): CatchLogUpdateRow {
  return {
    image_url: catchLog.imageUrl,
    species: catchLog.species,
    length: catchLog.length,
    weight: catchLog.weight,
    location: catchLog.location,
    temperature: catchLog.temperature,
    weather: catchLog.weather,
    lure: catchLog.lure,
    method: catchLog.method,
    notes: catchLog.notes,
    is_public: catchLog.isPublic,
    hide_location: catchLog.hideLocation,
    date: catchLog.date,
  };
}

export async function getUserCatchLogs(userId: string): Promise<CatchLog[]> {
  debugLog("fetch user catches user_id", userId);

  const { data, error } = await supabase
    .from("catch_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    debugLog("fetch failed", error);
    throw error;
  }

  const rows = (data ?? []) as CatchLogRow[];
  debugLog("fetch count", rows.length);
  return rows.map(mapCatchLogRowToCatchLog);
}

export async function getCatchLogById(
  catchId: string,
  userId: string
): Promise<CatchLog | null> {
  const { data, error } = await supabase
    .from("catch_logs")
    .select("*")
    .eq("id", catchId)
    .eq("user_id", userId)
    .single();

  if (error) {
    if ((error as any).code === "PGRST116") return null;
    throw error;
  }

  return mapCatchLogRowToCatchLog(data as CatchLogRow);
}

export async function updateCatchLog(catchLog: CatchLog): Promise<void> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("No authenticated user");

  debugLog("update catch user_id", user.id);

  const { error } = await supabase
    .from("catch_logs")
    .update(mapCatchLogToUpdateRow(catchLog))
    .eq("id", catchLog.id)
    .eq("user_id", user.id);

  if (error) {
    debugLog("update failed", error);
    throw error;
  }

  debugLog("update success catch_id", catchLog.id);
}

export async function createCatchLog(input: CatchLogInsertInput): Promise<void> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("No authenticated user");

  debugLog("create catch user_id", user.id);

  const payload = {
    user_id: user.id,
    image_url: input.imageUrl,
    species: input.species,
    length: input.length,
    weight: input.weight,
    location: input.location,
    temperature: input.temperature,
    weather: input.weather,
    lure: input.lure,
    method: input.method,
    notes: input.notes,
    is_public: input.isPublic,
    hide_location: input.hideLocation,
    date: input.date,
  };

  const { error } = await supabase.from("catch_logs").insert(payload);
  if (error) {
    debugLog("create failed", error);
    throw error;
  }

  debugLog("create success");
}

export async function deleteCatchLog(catchId: string): Promise<void> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("No authenticated user");

  debugLog("delete catch user_id", user.id);

  const { error } = await supabase
    .from("catch_logs")
    .delete()
    .eq("id", catchId)
    .eq("user_id", user.id);

  if (error) {
    debugLog("delete failed", error);
    throw error;
  }

  debugLog("delete success catch_id", catchId);
}

export async function seedDevCatchLog(userId: string): Promise<void> {
  const now = new Date();
  const date = now.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const payload = {
    user_id: userId,
    image_url:
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80",
    species: "Largemouth Bass",
    length: "45 cm",
    weight: "2.3 kg",
    location: "Lake Okeechobee",
    temperature: "22C",
    weather: "Sunny",
    lure: "Plastic worm",
    method: "Spin",
    notes: "Dev seeded catch for testing.",
    is_public: false,
    hide_location: false,
    date,
  };

  const { error } = await supabase.from("catch_logs").insert(payload);
  if (error) throw error;
}
