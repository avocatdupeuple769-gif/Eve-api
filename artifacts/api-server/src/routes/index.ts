import { Router, type IRouter } from "express";
import healthRouter from "./health";
import openaiRouter from "./openai";
import searchRouter from "./search";

const router: IRouter = Router();

router.use(healthRouter);
router.use(openaiRouter);
router.use(searchRouter);

export default router;
