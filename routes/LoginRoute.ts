import express, { Request, Response } from "express";

const router = express.Router();

router.get("/", (req: Request, res: Response) => {
  res.json({ msg: "Login Pages" });
});

router.post("/login", (req: Request, res: Response) => {
  res.json({ body: req.body });
});

export default router;
