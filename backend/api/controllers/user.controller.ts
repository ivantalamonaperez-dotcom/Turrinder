import { Request, Response } from "express";

export const getProfile = async (req: Request, res: Response) => {
  // 🔥 mock
  return res.json({
    id: "1",
    name: "Usuario",
    age: 22,
  });
};