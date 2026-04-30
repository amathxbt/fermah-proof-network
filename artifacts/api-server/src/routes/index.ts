import { Router, type IRouter } from "express";
import healthRouter from "./health";
import proofsRouter from "./proofs";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/proofs", proofsRouter);
router.use("/stats", statsRouter);

export default router;
