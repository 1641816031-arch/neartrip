import { Router, Request, Response } from "express";
import { getWeather } from "../services/weather.js";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      res.status(400).json({ error: "Invalid lat or lng" });
      return;
    }

    const days = await getWeather({ lat, lng });
    res.json({ days });
  } catch (err) {
    console.error("Weather error:", err);
    res.status(500).json({ error: "Failed to fetch weather" });
  }
});

export default router;