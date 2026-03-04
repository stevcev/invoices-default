import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_ANON_KEY || ""
);

export default async function handler(req: any, res: any) {
  try {
    // This actually pings Supabase with a real query
    await supabase.from("settings").select("user_id").limit(1);
    res.json({ status: "alive", supabase: "pinged", timestamp: new Date().toISOString() });
  } catch (error) {
    res.json({ status: "alive", supabase: "failed", timestamp: new Date().toISOString() });
  }
}
