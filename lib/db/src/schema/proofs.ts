import { pgTable, text, integer, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

// Enums
export const proofTypeEnum = pgEnum("proof_type", ["groth16", "plonk", "fflonk", "risc0"]);
export const proofStatusEnum = pgEnum("proof_status", ["pending", "submitted", "verified", "failed"]);

// Proofs table
export const proofsTable = pgTable(
  "proofs",
  {
    id: text("id").primaryKey(),
    circuitId: text("circuit_id").notNull(),
    proofType: proofTypeEnum("proof_type").notNull(),
    status: proofStatusEnum("status").notNull().default("pending"),
    submitter: text("submitter").notNull(),
    inputHash: text("input_hash").notNull(),
    proofHash: text("proof_hash"),
    txHash: text("tx_hash"),
    blockNumber: integer("block_number"),
    gasUsed: text("gas_used"),
    fermahJobId: text("fermah_job_id"),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("proofs_submitter_idx").on(table.submitter),
    index("proofs_status_idx").on(table.status),
    index("proofs_created_at_idx").on(table.createdAt),
  ]
);

// Zod schemas
export const insertProofSchema = createInsertSchema(proofsTable).omit({
  createdAt: true,
  updatedAt: true,
});

export const selectProofSchema = createSelectSchema(proofsTable);

export type InsertProof = z.infer<typeof insertProofSchema>;
export type Proof = typeof proofsTable.$inferSelect;
