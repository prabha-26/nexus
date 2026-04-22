/// <reference types="vite/client" />

import type { User } from "@supabase/supabase-js";
import { supabase } from "../utils/supabase";

export { supabase };

// ==============================
// TYPES
// ==============================

export interface FeedPost {
  id: string;
  author_uid: string;
  author_name: string;
  author_photo: string | null;
  content: string;
  created_at: string;
}

// ==============================
// CONFIG MESSAGE
// ==============================

// ==============================
// CONFIG CHECK
// ==============================

export const isSupabaseConfigured =
  !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigMessage =
  "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect this app to your Supabase project.";

// ==============================
// ENUMS
// ==============================

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

// ==============================
// ERROR TYPE
// ==============================

export interface SupabaseErrorInfo {
  error: string;
  operationType: OperationType;
  table: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailConfirmedAt: string | null | undefined;
    phone: string | null | undefined;
    confirmedAt: string | null | undefined;
    lastSignInAt: string | null | undefined;
    appMetadata: any;
    userMetadata: any;
    aud: string;
    createdAt: string;
  };
}

// ==============================
// USER HELPERS
// ==============================

export function getUserDisplayName(
  user: Pick<User, "email" | "user_metadata"> | null | undefined,
) {
  return (
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "User"
  );
}

export function getUserAvatar(
  user: Pick<User, "user_metadata"> | null | undefined,
) {
  const avatar = user?.user_metadata?.avatar_url;
  return typeof avatar === "string" && avatar.length > 0 ? avatar : null;
}

// ==============================
// DATA NORMALIZATION
// ==============================

export function normalizePost(row: any): FeedPost {
  return {
    id: String(row?.id ?? ""),
    author_uid: String(row?.author_uid ?? row?.authorUid ?? ""),
    author_name: String(row?.author_name ?? row?.authorName ?? "Anonymous"),
    author_photo:
      typeof (row?.author_photo ?? row?.authorPhoto) === "string" &&
      (row?.author_photo ?? row?.authorPhoto).length > 0
        ? row?.author_photo ?? row?.authorPhoto
        : null,
    content: String(row?.content ?? ""),
    created_at: String(
      row?.created_at ?? row?.createdAt ?? new Date().toISOString(),
    ),
  };
}

// ==============================
// ERROR HANDLER
// ==============================

export function handleSupabaseError(
  error: any,
  operationType: OperationType,
  table: string | null,
  options: { rethrow?: boolean } = {},
) {
  const appError = new Error(error?.message || "Supabase error");

  console.error("Supabase Error:", {
    error: appError.message,
    operationType,
    table,
  });

  if (options.rethrow !== false) {
    throw appError;
  }

  return appError;
}

// ==============================
// CONNECTION TEST
// ==============================

export async function testSupabaseConnection() {
  try {
    const { error } = await supabase.from("posts").select("id").limit(1);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error("Supabase connection failed:", error);
    return false;
  }
}