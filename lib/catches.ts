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
  isFavorite: boolean;
  hideLocation: boolean;
  date: string;
  latitude?: number | null;
  longitude?: number | null;
}

export type MapCatchPin = {
  id: string;
  species: string;
  latitude: number;
  longitude: number;
  imageUrl: string;
  date: string;
};

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
  is_favorite: boolean | null;
  hide_location: boolean | null;
  date: string | null;
  created_at: string;
  latitude?: number | null;
  longitude?: number | null;
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
  is_favorite: boolean;
  hide_location: boolean;
  date: string;
  latitude?: number | null;
  longitude?: number | null;
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

function isMissingColumnError(error: any, column: string): boolean {
  const message = String(error?.message ?? "").toLowerCase();
  return message.includes(column) && message.includes("schema cache");
}

function stripOptionalColumns<T extends Record<string, any>>(payload: T, columns: string[]) {
  const cloned = { ...payload };
  for (const key of columns) {
    delete cloned[key];
  }
  return cloned;
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
    isFavorite: row.is_favorite ?? false,
    hideLocation: row.hide_location ?? false,
    date: row.date ?? "",
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
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
    is_favorite: catchLog.isFavorite,
    hide_location: catchLog.hideLocation,
    date: catchLog.date,
    latitude: catchLog.latitude ?? null,
    longitude: catchLog.longitude ?? null,
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

export async function getUserFavoriteCatchLogs(userId: string): Promise<CatchLog[]> {
  const all = await getUserCatchLogs(userId);
  return all.filter((row) => row.isFavorite);
}

export function getCatchStats(catches: CatchLog[]) {
  const speciesSet = new Set(
    catches
      .map((item) => item.species.trim().toLowerCase())
      .filter((item) => item.length > 0)
  );

  return {
    totalCatches: catches.length,
    speciesCount: speciesSet.size,
  };
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

  const payload = mapCatchLogToUpdateRow(catchLog);

  let { error } = await supabase
    .from("catch_logs")
    .update(payload)
    .eq("id", catchLog.id)
    .eq("user_id", user.id);

  if (
    error &&
    (isMissingColumnError(error, "hide_location") ||
      isMissingColumnError(error, "is_favorite") ||
      isMissingColumnError(error, "latitude") ||
      isMissingColumnError(error, "longitude"))
  ) {
    const legacyPayload = stripOptionalColumns(payload, [
      "hide_location",
      "is_favorite",
      "latitude",
      "longitude",
    ]);
    const retry = await supabase
      .from("catch_logs")
      .update(legacyPayload)
      .eq("id", catchLog.id)
      .eq("user_id", user.id);
    error = retry.error;
  }

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
    is_favorite: input.isFavorite,
    hide_location: input.hideLocation,
    date: input.date,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
  };

  let { error } = await supabase.from("catch_logs").insert(payload);
  if (
    error &&
    (isMissingColumnError(error, "hide_location") ||
      isMissingColumnError(error, "is_favorite") ||
      isMissingColumnError(error, "latitude") ||
      isMissingColumnError(error, "longitude"))
  ) {
    const legacyPayload = stripOptionalColumns(payload, [
      "hide_location",
      "is_favorite",
      "latitude",
      "longitude",
    ]);
    const retry = await supabase.from("catch_logs").insert(legacyPayload);
    error = retry.error;
  }
  if (error) {
    debugLog("create failed", error);
    throw error;
  }

  debugLog("create success");
}

export async function getMapCatchPins(userId: string): Promise<MapCatchPin[]> {
  debugLog("fetch map pins user_id", userId);

  const { data, error } = await supabase
    .from("catch_logs")
    .select("id, species, latitude, longitude, image_url, date")
    .eq("user_id", userId)
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  if (error) {
    debugLog("fetch map pins failed", error);
    throw error;
  }

  return ((data ?? []) as any[]).filter(
    (row) =>
      typeof row.latitude === "number" &&
      typeof row.longitude === "number" &&
      isFinite(row.latitude) &&
      isFinite(row.longitude)
  ).map((row) => ({
    id: row.id as string,
    species: (row.species as string | null) ?? "Unknown",
    latitude: row.latitude as number,
    longitude: row.longitude as number,
    imageUrl: (row.image_url as string | null) ?? "",
    date: (row.date as string | null) ?? "",
  }));
}

export async function uploadCatchPhoto(fileUri: string): Promise<string> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("No authenticated user");

  const filePath = `${user.id}/${Date.now()}.jpg`;
  const fileBlob = await (await fetch(fileUri)).blob();

  const { error: uploadError } = await supabase.storage
    .from("catch_photos")
    .upload(filePath, fileBlob, {
      contentType: "image/jpeg",
      upsert: false,
    });

  if (uploadError) {
    debugLog("catch photo upload failed", uploadError);
    throw uploadError;
  }

  const { data } = supabase.storage.from("catch_photos").getPublicUrl(filePath);
  debugLog("catch photo upload success", data.publicUrl);
  return data.publicUrl;
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
  const payload = {
    user_id: userId,
    image_url: "",
    species: "Largemouth Bass",
    length: "45 cm",
    weight: "2.3 kg",
    location: "Lake Okeechobee",
    temperature: "22C",
    weather: "Sunny",
    lure: "Plastic worm",
    method: "Spin",
    notes: "Dev seeded catch for testing.",
    is_public: true,
    is_favorite: false,
    hide_location: false,
    date: new Date().toISOString(),
  };

  let { error } = await supabase.from("catch_logs").insert(payload);
  if (
    error &&
    (isMissingColumnError(error, "hide_location") ||
      isMissingColumnError(error, "is_favorite"))
  ) {
    const legacyPayload = stripOptionalColumns(payload, ["hide_location", "is_favorite"]);
    const retry = await supabase.from("catch_logs").insert(legacyPayload);
    error = retry.error;
  }
  if (error) throw error;
}
