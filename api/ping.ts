export default function handler(req: any, res: any) {
  res.json({ status: "alive", timestamp: new Date().toISOString() });
}
