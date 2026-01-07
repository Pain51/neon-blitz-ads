
import { db } from "./db";
import {
  scores,
  type CreateScoreRequest,
  type ScoreResponse
} from "@shared/schema";
import { desc } from "drizzle-orm";

export interface IStorage {
  getTopScores(): Promise<ScoreResponse[]>;
  createScore(score: CreateScoreRequest): Promise<ScoreResponse>;
}

export class DatabaseStorage implements IStorage {
  async getTopScores(): Promise<ScoreResponse[]> {
    return await db.select()
      .from(scores)
      .orderBy(desc(scores.score))
      .limit(10);
  }

  async createScore(insertScore: CreateScoreRequest): Promise<ScoreResponse> {
    const [score] = await db.insert(scores)
      .values(insertScore)
      .returning();
    return score;
  }
}

export const storage = new DatabaseStorage();
