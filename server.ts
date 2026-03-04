import express from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "";

const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

const app = express();
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    supabaseConfigured: !!(supabaseUrl && supabaseAnonKey),
    nodeEnv: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL
  });
});

app.get("/api/settings/:userId", async (req, res) => {
  const { userId } = req.params;
  if (!supabase) return res.status(503).json({ error: "Database not configured" });
  try {
    let { data, error } = await supabase.from("settings").select("*").eq("user_id", userId).single();
    if (error && error.code !== "PGRST116") throw error;
    if (!data && (userId === 'dimitar' || userId === 'gordana')) {
      const defaults: Record<string, any> = {
        dimitar: { user_id: 'dimitar', pin: '0000', base_rate: 104.0, deployment_rate: 12.0, deployment_label: 'App Deployments', meeting_rate_unit: 2, meeting_rate_value: 5 },
        gordana: { user_id: 'gordana', pin: '0000', base_rate: 90.0, deployment_rate: 8.0, deployment_label: 'App Marketings', meeting_rate_unit: 2, meeting_rate_value: 5 }
      };
      const { error: insertError } = await supabase.from('settings').insert(defaults[userId]);
      if (!insertError) data = defaults[userId];
    }
    res.json(data || null);
  } catch (error) {
    console.error("Fetch settings error:", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

app.post("/api/settings/:userId", async (req, res) => {
  const { userId } = req.params;
  const { pin, base_rate, deployment_rate, deployment_label, meeting_rate_unit, meeting_rate_value } = req.body;
  if (!supabase) return res.status(503).json({ error: "Database not configured" });
  try {
    const { error } = await supabase.from("settings").upsert({ user_id: userId, pin, base_rate, deployment_rate, deployment_label, meeting_rate_unit, meeting_rate_value });
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to save settings" });
  }
});

app.get("/api/all-invoices", async (req, res) => {
  if (!supabase) return res.status(503).json({ error: "Database not configured" });
  try {
    const { data, error } = await supabase.from("invoices").select("*").order("period_start", { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch all invoices" });
  }
});

app.get("/api/invoices/:userId", async (req, res) => {
  const { userId } = req.params;
  if (!supabase) return res.status(503).json({ error: "Database not configured" });
  try {
    const { data, error } = await supabase.from("invoices").select("*").eq("user_id", userId).order("period_start", { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch invoices" });
  }
});

app.post("/api/invoices/:userId", async (req, res) => {
  const { userId } = req.params;
  const { id, period_start, period_end, app_deployments, custom_entries, meetings, base_rate } = req.body;
  if (!supabase) return res.status(503).json({ error: "Database not configured" });
  try {
    const { error } = await supabase.from("invoices").upsert({ id, user_id: userId, period_start, period_end, app_deployments: app_deployments || [], custom_entries: custom_entries || [], meetings, base_rate, updated_at: new Date().toISOString() });
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to save invoice" });
  }
});

app.patch("/api/invoices/:id/payment", async (req, res) => {
  const { id } = req.params;
  const { is_paid, received_amount_eur } = req.body;
  if (!supabase) return res.status(503).json({ error: "Database not configured" });
  try {
    const { error } = await supabase.from("invoices").update({ is_paid, received_amount_eur, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update payment status" });
  }
});

app.delete("/api/invoices/:id", async (req, res) => {
  const { id } = req.params;
  if (!supabase) return res.status(503).json({ error: "Database not configured" });
  try {
    const { error } = await supabase.from("invoices").delete().eq("id", id);
    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete invoice" });
  }
});

app.get("/api/exchange-rate", async (req, res) => {
  try {
    const response = await fetch("https://api.exchangerate-api.com/v4/latest/USD");
    const data = await response.json();
    res.json({ rate: data.rates.EUR });
  } catch (error) {
    res.json({ rate: 0.95 });
  }
});

export default app;
