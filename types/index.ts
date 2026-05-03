export interface WeightEntry {
  id: string;
  date: string; // YYYY-MM-DD
  weight: number; // lbs
  note?: string;
}

export interface Goal {
  startDate: string;
  startWeight: number;
  goalWeight: number;
  weeklyLoss: number; // lbs/week
}
