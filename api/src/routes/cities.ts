import { Router, Request, Response } from "express";
import { queryTrains } from "../services/railway.js";
import { parseTrainResult } from "../utils/parser.js";
import destinations from "../../data/destinations.json" with { type: "json" };
import stations from "../../data/stations.json" with { type: "json" };

const router = Router();

interface StationData {
  name: string;
  city: string;
  code: string;
  lat: number;
  lng: number;
  level?: string;
}

interface CityResult {
  city: string;
  code: string;
  lat: number;
  lng: number;
  trainCount: number;
  trains: ReturnType<typeof parseTrainResult>[];
}

router.get("/", async (req: Request, res: Response) => {
  try {
    const { from, date } = req.query;

    if (!from || !date) {
      res.status(400).json({ error: "Missing required query params: from, date" });
      return;
    }

    const fromStr = String(from);
    const dateStr = String(date);
    const stationList = stations as StationData[];
    const cityNames = (destinations as { cities: string[] }).cities;

    const results: CityResult[] = [];

    for (const cityName of cityNames) {
      try {
        // Find main station: prefer level === 'city', else first match
        const mainStation =
          stationList.find((s) => s.city === cityName && s.level === "city") ||
          stationList.find((s) => s.city === cityName);

        if (!mainStation) continue;

        const rawTrains = await queryTrains({
          from: fromStr,
          to: mainStation.code,
          date: dateStr,
        });

        const trains = rawTrains; // 已经是 TrainWithPrice[]

        results.push({
          city: mainStation.city,
          code: mainStation.code,
          lat: mainStation.lat,
          lng: mainStation.lng,
          trainCount: trains.length,
          trains,
        });
      } catch (err) {
        console.error(`City scan error for ${cityName}:`, err);
        // Continue with next city, do not break
      }
    }

    res.json({ cities: results });
  } catch (err) {
    console.error("Cities error:", err);
    res.status(500).json({ error: "Failed to scan cities" });
  }
});

export default router;