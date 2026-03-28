import { Request, Response } from "express";

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // 🔥 mock
  if (!email || !password) {
    return res.status(400).json({ error: "Missing data" });
  }

  return res.json({
    token: "fake-jwt-token",
    user: { id: "1", email },
  });
};

export const register = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  return res.json({
    success: true,
    user: { id: "1", email },
  });
};