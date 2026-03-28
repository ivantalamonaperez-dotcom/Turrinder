import { Request, Response } from "express";

export const getChats = async (req: Request, res: Response) => {
  return res.json([
    {
      id: "chat1",
      messages: ["Hola", "¿Cómo estás?"],
    },
  ]);
};