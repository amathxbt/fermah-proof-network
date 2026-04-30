import { Router } from "express";
import { desc, count, countDistinct, eq, sql } from "drizzle-orm";
import { db, proofsTable } from "@workspace/db";
import { GetRecentActivityQueryParams } from "@workspace/api-zod";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/stats — Network-wide statistics
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", async (_req, res) => {
  const [
    [{ total }],
    [{ verified }],
    [{ pending }],
    [{ failed }],
    [{ submitters }],
    avgResult,
  ] = await Promise.all([
    db.select({ total: count() }).from(proofsTable),
    db.select({ verified: count() }).from(proofsTable).where(eq(proofsTable.status, "verified")),
    db.select({ pending: count() }).from(proofsTable).where(eq(proofsTable.status, "pending")),
    db.select({ failed: count() }).from(proofsTable).where(eq(proofsTable.status, "failed")),
    db.select({ submitters: countDistinct(proofsTable.submitter) }).from(proofsTable),
    db
      .select({
        avgMs: sql<number>`EXTRACT(EPOCH FROM AVG(${proofsTable.updatedAt} - ${proofsTable.createdAt}))`,
      })
      .from(proofsTable)
      .where(eq(proofsTable.status, "verified")),
  ]);

  const successRate = total > 0 ? Math.round((verified / total) * 100) : 0;
  const avgProofTime = avgResult[0]?.avgMs ?? 0;

  return res.json({
    totalProofs: total,
    verifiedProofs: verified,
    pendingProofs: pending,
    failedProofs: failed,
    totalSubmitters: submitters,
    successRate,
    avgProofTime: Math.round(avgProofTime),
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/stats/recent-activity — Activity feed
// ─────────────────────────────────────────────────────────────────────────────
router.get("/recent-activity", async (req, res) => {
  const params = GetRecentActivityQueryParams.safeParse(req.query);
  const limit = params.success ? (params.data.limit ?? 10) : 10;

  // Get recently updated proofs and translate status changes to events
  const recentProofs = await db
    .select()
    .from(proofsTable)
    .orderBy(desc(proofsTable.updatedAt))
    .limit(limit);

  const events = recentProofs.map((proof) => ({
    id: `${proof.id}-${proof.status}`,
    type: proof.status === "pending" ? "submitted" : proof.status,
    proofId: proof.id,
    circuitId: proof.circuitId,
    submitter: proof.submitter,
    txHash: proof.txHash ?? null,
    timestamp: proof.updatedAt,
  }));

  return res.json(events);
});

export default router;
