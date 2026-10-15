import { Router, type IRouter } from "express";
import applicationsRouter from "./applications";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);
router.use(applicationsRouter);

export default router;
