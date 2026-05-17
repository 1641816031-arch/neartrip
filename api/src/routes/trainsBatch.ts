import { Router, Request, Response } from "express";
import { queryTrains } from "../services/railway.js";

const router = Router();
const MAX_QUERIES = 40;

interface BatchQuery {
  from: string;
  to: string;
  date: string;
  key: string;
}

/**
 * POST /api/trains/batch
 * NDJSON 流式批量查询
 * 逐个处理 queries，每个间隔由底层 throttledFetch 保证 ≥ 1500ms
 */
router.post("/", async (req: Request, res: Response) => {
  try {
    const { queries } = req.body as { queries: BatchQuery[] };

    if (!Array.isArray(queries)) {
      res.status(400).json({ error: "queries must be an array" });
      return;
    }

    if (queries.length > MAX_QUERIES) {
      res.status(400).json({ error: `Maximum ${MAX_QUERIES} queries allowed` });
      return;
    }

    // 设置 NDJSON 响应头
    res.setHeader("Content-Type", "application/x-ndjson");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("Cache-Control", "no-cache");

    console.log(`🚄 批量查询开始: ${queries.length} 个请求`);

    for (const q of queries) {
      try {
        const trains = await queryTrains({ from: q.from, to: q.to, date: q.date });

        const line = JSON.stringify({
          key: q.key,
          trainCount: trains.length,
          trains,
        });

        res.write(line + "\n");

        // 强制刷新缓冲区，确保客户端立即收到
        if ((res as any).flush) {
          (res as any).flush();
        }

        console.log(`✅ [${q.key}] ${trains.length} 趟列车`);
      } catch (err) {
        const errorLine = JSON.stringify({
          key: q.key,
          error: err instanceof Error ? err.message : "Unknown error",
          trains: [],
        });

        res.write(errorLine + "\n");

        if ((res as any).flush) {
          (res as any).flush();
        }

        console.log(`❌ [${q.key}] 失败: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    res.end();
    console.log("🚄 批量查询完成");

  } catch (err) {
    console.error("批量查询外层错误:", err);

    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to process batch" });
    } else {
      res.end();
    }
  }
});

export default router;