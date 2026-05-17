import { Router, Request, Response } from "express";
import { queryTrainStops } from "../services/railway.js";

const router = Router();

router.get("/", async (req: Request, res: Response) => {
  try {
    const { trainNo, from, to, date } = req.query;

    if (!trainNo || !from || !to || !date) {
      res.status(400).json({ error: "Missing required query params: trainNo, from, to, date" });
      return;
    }

    const stops = await queryTrainStops({
      trainNo: String(trainNo),
      from: String(from),
      to: String(to),
      date: String(date),
    });

    res.json({ trainNo: String(trainNo), stops });
  } catch (err) {
    console.error("Train stops error:", err);
    res.status(500).json({ error: "Failed to query train stops" });
  }
});

export default router;