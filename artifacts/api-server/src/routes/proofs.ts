import { Router } from "express";
import { eq, desc, count, countDistinct, and } from "drizzle-orm";
import { db, proofsTable } from "@workspace/db";
import {
  ListProofsQueryParams,
  SubmitProofBody,
  GetProofParams,
  GetProofStatusParams,
} from "@workspace/api-zod";
import { randomUUID } from "crypto";

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/proofs — List proofs with pagination + optional status filter
// ─────────────────────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  const query = ListProofsQueryParams.safeParse(req.query);
  if (!query.success) {
    return res.status(400).json({ error: "Invalid query parameters", details: query.error.issues });
  }

  const { page, limit, status } = query.data;
  const offset = (page - 1) * limit;

  const whereClause = status ? eq(proofsTable.status, status as any) : undefined;

  const [proofs, [{ total }]] = await Promise.all([
    db
      .select()
      .from(proofsTable)
      .where(whereClause)
      .orderBy(desc(proofsTable.createdAt))
      .limit(limit)
      .offset(offset),
    db
      .select({ total: count() })
      .from(proofsTable)
      .where(whereClause),
  ]);

  return res.json({ proofs, total, page, limit });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/proofs — Submit a new proof request to Fermah
// ─────────────────────────────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  const body = SubmitProofBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: "Invalid request body", details: body.error.issues });
  }

  const { circuitId, proofType, submitter, inputHash, publicInputs } = body.data;

  // Generate Fermah job ID (in production this would call Fermah seek SDK)
  const fermahJobId = `fermah-${randomUUID()}`;
  const id = randomUUID();

  const [proof] = await db
    .insert(proofsTable)
    .values({
      id,
      circuitId,
      proofType: proofType as any,
      status: "pending",
      submitter,
      inputHash,
      fermahJobId,
    })
    .returning();

  // In production: kick off Fermah proof job here
  // await fermahClient.seek({ jobId: fermahJobId, circuitId, publicInputs });

  // Simulate async proof progression for demo purposes
  _simulateProofProgress(proof.id);

  return res.status(201).json(proof);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/proofs/:id — Get a single proof
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  const params = GetProofParams.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({ error: "Invalid params" });
  }

  const [proof] = await db
    .select()
    .from(proofsTable)
    .where(eq(proofsTable.id, params.data.id));

  if (!proof) {
    return res.status(404).json({ error: "Proof not found" });
  }

  return res.json(proof);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/proofs/:id/status — Live status polling endpoint
// ─────────────────────────────────────────────────────────────────────────────
router.get("/:id/status", async (req, res) => {
  const params = GetProofStatusParams.safeParse(req.params);
  if (!params.success) {
    return res.status(400).json({ error: "Invalid params" });
  }

  const [proof] = await db
    .select({
      id: proofsTable.id,
      status: proofsTable.status,
      fermahJobId: proofsTable.fermahJobId,
      txHash: proofsTable.txHash,
      blockNumber: proofsTable.blockNumber,
      updatedAt: proofsTable.updatedAt,
    })
    .from(proofsTable)
    .where(eq(proofsTable.id, params.data.id));

  if (!proof) {
    return res.status(404).json({ error: "Proof not found" });
  }

  return res.json(proof);
});

// ─────────────────────────────────────────────────────────────────────────────
// Simulation helper — mimics Fermah proof lifecycle for demo purposes
// ─────────────────────────────────────────────────────────────────────────────
async function _simulateProofProgress(proofId: string) {
  // After 3 seconds → submitted
  setTimeout(async () => {
    await db
      .update(proofsTable)
      .set({ status: "submitted", updatedAt: new Date() })
      .where(eq(proofsTable.id, proofId));

    // After 8 more seconds → verified (90%) or failed (10%)
    setTimeout(async () => {
      const success = Math.random() > 0.1;
      if (success) {
        const proofHash = `0x${Array.from({ length: 64 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join("")}`;
        const txHash = `0x${Array.from({ length: 64 }, () =>
          Math.floor(Math.random() * 16).toString(16)
        ).join("")}`;
        const blockNumber = 20000000 + Math.floor(Math.random() * 500000);
        await db
          .update(proofsTable)
          .set({
            status: "verified",
            proofHash,
            txHash,
            blockNumber,
            gasUsed: `${Math.floor(Math.random() * 200000 + 50000)}`,
            updatedAt: new Date(),
          })
          .where(eq(proofsTable.id, proofId));
      } else {
        await db
          .update(proofsTable)
          .set({
            status: "failed",
            errorMessage: "Fermah: witness verification failed",
            updatedAt: new Date(),
          })
          .where(eq(proofsTable.id, proofId));
      }
    }, 8000);
  }, 3000);
}

export default router;
