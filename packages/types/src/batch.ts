import type { BrewType, BatchStatus, MeasurementType } from "./brew.js";

export interface Measurement {
  id: string;
  type: MeasurementType;
  value: number;
  unit: string;
  takenAt: Date;
  notes?: string;
}

export interface BatchLog {
  id: string;
  stage: string;
  message: string;
  createdAt: Date;
}

export interface Batch {
  id: string;
  batchNumber: string;
  type: BrewType;
  status: BatchStatus;
  recipeId: string;
  brewerId: string;
  startedAt?: Date;
  finishedAt?: Date;
  actualVolume?: number;
  notes?: string;
  logs: BatchLog[];
  measurements: Measurement[];
  createdAt: Date;
  updatedAt: Date;
}
