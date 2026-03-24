export interface Goal {
  id: string;
  name: string;
  description: string | null;
  deadline: string | null; // YYYY-MM-DD
  dailyAction: string;
  createdAt: string; // ISO timestamp
  archivedAt: string | null; // ISO timestamp
}

export interface CheckIn {
  id: string;
  goalId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  note: string | null;
  createdAt: string; // ISO timestamp
}

export interface GoalWithStats extends Goal {
  streak: number;
  commitmentRate: number;
  todayCheckin: CheckIn | null;
}

export interface CreateGoalInput {
  name: string;
  description?: string;
  deadline?: string;
  dailyAction: string;
}

export interface UpdateGoalInput {
  name?: string;
  description?: string;
  deadline?: string;
  dailyAction?: string;
}

export interface UpsertCheckinInput {
  goalId: string;
  date: string;
  completed: boolean;
  note?: string;
}
