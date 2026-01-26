export type Role = "teacher" | "student";

export type QuestionStatus = "open" | "resolved";

export interface Room {
  id: string;
  code: string;
  name: string;
  channel?: string;
  createdAt: string;
}

export interface Reactions {
  like: number;
  thanks: number;
}

export interface Question {
  id: string;
  roomId: string;
  text: string;
  status: QuestionStatus;
  createdAt: string;
  ownerId?: string;
  author?: string;
  anonymous?: boolean;
  reactions: Reactions;
  answers: Answer[];
}

export interface Profile {
  xp: number;
  level: number;
  avatarStage: number;
}

export interface UserAccount {
  id: string;
  name: string;
  role: Role;
  email: string;
  avatarUrl?: string;
}

export interface Answer {
  id: string;
  questionId: string;
  text: string;
  author: string;
  role: Role;
  createdAt: string;
  reactions: Reactions;
  ownerId?: string;
}
