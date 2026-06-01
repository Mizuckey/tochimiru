import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase クライアントを生成する。
 * 環境変数が未設定なら null を返し、呼び出し側でハードコードデータにフォールバックする。
 *
 * 読み取り専用の公開データを想定し、anon キー（NEXT_PUBLIC_*）を使用する。
 * 書き込みを行う場合は RLS ポリシーと認証を別途設計すること。
 */
export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey, {
    auth: { persistSession: false },
  });
}
