import type { SupabaseServerClient } from "@/server/supabase/types";

export const listCategoriesForUser = async (supabase: SupabaseServerClient, userId: string) => {
  const { data } = await supabase
    .from("categories")
    .select("id,name,kind,color_hex,icon,is_active,is_system")
    .or(`user_id.eq.${userId},is_system.eq.true`)
    .order("kind")
    .order("name");

  return data ?? [];
};

export const listCategoryOptionsForUser = async (
  supabase: SupabaseServerClient,
  userId: string
) => {
  const { data } = await supabase
    .from("categories")
    .select("id,name,kind,is_system,is_active")
    .or(`user_id.eq.${userId},is_system.eq.true`)
    .order("name");

  return data ?? [];
};

export const createCategory = async (
  supabase: SupabaseServerClient,
  input: {
    userId: string;
    name: string;
    kind: "income" | "expense";
    colorHex: string;
    icon?: string;
  }
) => {
  return supabase.from("categories").insert({
    user_id: input.userId,
    name: input.name,
    kind: input.kind,
    color_hex: input.colorHex,
    icon: input.icon || null,
    is_system: false,
    is_active: true,
  });
};

export const updateCategory = async (
  supabase: SupabaseServerClient,
  input: {
    categoryId: string;
    userId: string;
    name: string;
    kind: "income" | "expense";
    colorHex: string;
    icon?: string;
  }
) => {
  return supabase
    .from("categories")
    .update({
      name: input.name,
      kind: input.kind,
      color_hex: input.colorHex,
      icon: input.icon || null,
    })
    .eq("id", input.categoryId)
    .eq("user_id", input.userId)
    .eq("is_system", false);
};

export const toggleCategoryActiveStatus = async (
  supabase: SupabaseServerClient,
  input: {
    categoryId: string;
    userId: string;
    isActive: boolean;
  }
) => {
  return supabase
    .from("categories")
    .update({ is_active: input.isActive })
    .eq("id", input.categoryId)
    .eq("user_id", input.userId)
    .eq("is_system", false);
};
