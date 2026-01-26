import type {
  Profile,
  Question,
  QuestionStatus,
  Reactions,
  Room,
  Role,
  UserAccount,
  Answer,
} from "../types";

type StoreShape = {
  rooms: Room[];
  questions: Question[];
  profiles: Record<string, Profile>;
  users: Array<UserAccount & { password: string }>;
  memberships: Array<{ userId: string; roomId: string; joinedAt: string }>;
  questionReactions: Array<{ questionId: string; userId: string; type: keyof Reactions }>;
  answerReactions: Array<{ answerId: string; userId: string; type: keyof Reactions }>;
  currentUserId?: string;
};

const STORAGE_KEY = "lecture-qna-store";

const loadStore = (): StoreShape => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {
      rooms: [],
      questions: [],
      profiles: {},
      users: [],
      memberships: [],
      questionReactions: [],
      answerReactions: [],
      currentUserId: undefined,
    };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<StoreShape> & { profile?: Profile };
    const profiles = parsed.profiles ?? {};
    if (parsed.profile && parsed.currentUserId && !profiles[parsed.currentUserId]) {
      profiles[parsed.currentUserId] = parsed.profile;
    }
    return {
      rooms: parsed.rooms ?? [],
      questions: parsed.questions ?? [],
      profiles,
      users: parsed.users ?? [],
      memberships: parsed.memberships ?? [],
      questionReactions: parsed.questionReactions ?? [],
      answerReactions: parsed.answerReactions ?? [],
      currentUserId: parsed.currentUserId,
    };
  } catch {
    return {
      rooms: [],
      questions: [],
      profiles: {},
      users: [],
      memberships: [],
      questionReactions: [],
      answerReactions: [],
      currentUserId: undefined,
    };
  }
};

const saveStore = (store: StoreShape) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
};

const makeId = () => crypto.randomUUID();

const levelForXp = (xp: number) => Math.floor(xp);

const avatarForLevel = (level: number) => {
  if (level >= 12) return 3;
  if (level >= 7) return 2;
  if (level >= 3) return 1;
  return 0;
};

const baseReactions = (): Reactions => ({ like: 0, thanks: 0 });
const baseAnswers = (): Answer[] => [];

export const localApi = {
  setCurrentUserId(userId?: string) {
    const store = loadStore();
    store.currentUserId = userId;
    if (userId && !store.profiles[userId]) {
      store.profiles[userId] = { xp: 0, level: 0, avatarStage: 0 };
    }
    saveStore(store);
  },
  async registerUser(
    name: string,
    role: Role,
    email: string,
    password: string,
    avatarUrl?: string
  ): Promise<UserAccount> {
    const store = loadStore();
    const existing = store.users.find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
    if (existing) {
      store.currentUserId = existing.id;
      if (!store.profiles[existing.id]) {
        store.profiles[existing.id] = { xp: 0, level: 0, avatarStage: 0 };
      }
      saveStore(store);
      const { password: _password, ...user } = existing;
      return user;
    }
    const user = { id: makeId(), name, role, email, password, avatarUrl };
    store.users.push(user);
    store.currentUserId = user.id;
    store.profiles[user.id] = { xp: 0, level: 0, avatarStage: 0 };
    saveStore(store);
    const { password: _password, ...account } = user;
    return account;
  },
  async loginUser(email: string, password: string): Promise<UserAccount | null> {
    const store = loadStore();
    const user = store.users.find((entry) => entry.email.toLowerCase() === email.toLowerCase());
    if (!user || user.password !== password) {
      return null;
    }
    store.currentUserId = user.id;
    if (!store.profiles[user.id]) {
      store.profiles[user.id] = { xp: 0, level: 0, avatarStage: 0 };
    }
    saveStore(store);
    const { password: _password, ...account } = user;
    return account;
  },
  async logoutUser(): Promise<void> {
    const store = loadStore();
    store.currentUserId = undefined;
    saveStore(store);
  },
  async getCurrentUser(): Promise<UserAccount | null> {
    const store = loadStore();
    if (!store.currentUserId) {
      return null;
    }
    const user = store.users.find((entry) => entry.id === store.currentUserId);
    if (!user) {
      return null;
    }
    const { password: _password, ...account } = user;
    return account;
  },
  async updateAvatar(avatarUrl: string): Promise<UserAccount> {
    const store = loadStore();
    if (!store.currentUserId) {
      throw new Error("ユーザーが見つかりません。");
    }
    const userIndex = store.users.findIndex((entry) => entry.id === store.currentUserId);
    if (userIndex === -1) {
      throw new Error("ユーザーが見つかりません。");
    }
    store.users[userIndex] = { ...store.users[userIndex], avatarUrl };
    saveStore(store);
    const { password: _password, ...account } = store.users[userIndex];
    return account;
  },
  async updateDisplayName(displayName: string): Promise<UserAccount> {
    const store = loadStore();
    if (!store.currentUserId) {
      throw new Error("ユーザーが見つかりません。");
    }
    const userIndex = store.users.findIndex((entry) => entry.id === store.currentUserId);
    if (userIndex === -1) {
      throw new Error("ユーザーが見つかりません。");
    }
    store.users[userIndex] = { ...store.users[userIndex], name: displayName };
    saveStore(store);
    const { password: _password, ...account } = store.users[userIndex];
    return account;
  },
  async listUserAvatars(userIds: string[]): Promise<Record<string, string>> {
    const store = loadStore();
    const result: Record<string, string> = {};
    for (const userId of userIds) {
      const user = store.users.find((entry) => entry.id === userId);
      if (user?.avatarUrl) {
        result[userId] = user.avatarUrl;
      }
    }
    return result;
  },
  async listUserLevels(userIds: string[]): Promise<Record<string, number>> {
    const store = loadStore();
    const result: Record<string, number> = {};
    for (const userId of userIds) {
      const profile = store.profiles[userId];
      if (profile) {
        result[userId] = profile.level ?? 0;
      }
    }
    return result;
  },
  async listJoinedRooms(): Promise<Room[]> {
    const store = loadStore();
    if (!store.currentUserId) {
      return [];
    }
    const roomIds = new Set(
      store.memberships
        .filter((member) => member.userId === store.currentUserId)
        .map((member) => member.roomId)
    );
    return store.rooms.filter((room) => roomIds.has(room.id));
  },
  async createRoom(name: string, channel: string): Promise<Room> {
    const store = loadStore();
    const room: Room = {
      id: makeId(),
      code: Math.random().toString(36).slice(2, 8).toUpperCase(),
      name,
      channel,
      createdAt: new Date().toISOString(),
    };
    store.rooms.unshift(room);
    if (store.currentUserId) {
      store.memberships.unshift({
        userId: store.currentUserId,
        roomId: room.id,
        joinedAt: new Date().toISOString(),
      });
    }
    saveStore(store);
    return room;
  },
  async joinRoom(code: string): Promise<Room | null> {
    const store = loadStore();
    const room = store.rooms.find((entry) => entry.code === code) ?? null;
    if (room && store.currentUserId) {
      const exists = store.memberships.some(
        (member) => member.userId === store.currentUserId && member.roomId === room.id
      );
      if (!exists) {
        store.memberships.unshift({
          userId: store.currentUserId,
          roomId: room.id,
          joinedAt: new Date().toISOString(),
        });
        saveStore(store);
      }
    }
    return room;
  },
  async listQuestions(roomId: string): Promise<Question[]> {
    const store = loadStore();
    return store.questions
      .filter((question) => question.roomId === roomId)
      .map((question) => ({
        ...question,
        reactions: question.reactions ?? baseReactions(),
        answers: (question.answers ?? baseAnswers()).map((answer) => ({
          ...answer,
          reactions: answer.reactions ?? baseReactions(),
        })),
      }));
  },
  async createQuestion(
    roomId: string,
    text: string,
    author?: string,
    anonymous?: boolean,
    ownerId?: string
  ): Promise<Question> {
    const store = loadStore();
    const question: Question = {
      id: makeId(),
      roomId,
      text,
      status: "open",
      createdAt: new Date().toISOString(),
      ownerId,
      author,
      anonymous,
      reactions: baseReactions(),
      answers: baseAnswers(),
    };
    store.questions.unshift(question);
    saveStore(store);
    return question;
  },
  async createAnswer(
    questionId: string,
    text: string,
    author: string,
    role: Role,
    ownerId?: string
  ): Promise<Answer> {
    const store = loadStore();
    const target = store.questions.find((question) => question.id === questionId);
    if (!target) {
      throw new Error("質問が見つかりません。");
    }
    const answer: Answer = {
      id: makeId(),
      questionId,
      text,
      author,
      role,
      createdAt: new Date().toISOString(),
      reactions: baseReactions(),
      ownerId,
    };
    if (!target.answers) {
      target.answers = baseAnswers();
    }
    target.answers.push(answer);
    saveStore(store);
    return answer;
  },
  async addQuestionReaction(
    questionId: string,
    type: keyof Reactions,
    userId: string
  ): Promise<Question | null> {
    const store = loadStore();
    const target = store.questions.find((question) => question.id === questionId);
    if (!target) {
      return null;
    }
    if (!target.reactions) {
      target.reactions = baseReactions();
    }
    const existingIndex = store.questionReactions.findIndex(
      (entry) => entry.questionId === questionId && entry.userId === userId && entry.type === type
    );
    if (existingIndex >= 0) {
      store.questionReactions.splice(existingIndex, 1);
      target.reactions[type] = Math.max(0, target.reactions[type] - 1);
    } else {
      target.reactions[type] += 1;
      store.questionReactions.push({ questionId, userId, type });
    }
    saveStore(store);
    return target;
  },
  async addAnswerReaction(
    answerId: string,
    type: keyof Reactions,
    userId: string
  ): Promise<Answer | null> {
    const store = loadStore();
    const existingIndex = store.answerReactions.findIndex(
      (entry) => entry.answerId === answerId && entry.userId === userId && entry.type === type
    );
    for (const question of store.questions) {
      const answer = question.answers?.find((entry) => entry.id === answerId);
      if (!answer) {
        continue;
      }
      if (!answer.reactions) {
        answer.reactions = baseReactions();
      }
      if (existingIndex >= 0) {
        store.answerReactions.splice(existingIndex, 1);
        answer.reactions[type] = Math.max(0, answer.reactions[type] - 1);
      } else {
        answer.reactions[type] += 1;
        store.answerReactions.push({ answerId, userId, type });
      }
      saveStore(store);
      return answer;
    }
    return null;
  },
  async updateQuestionStatus(
    questionId: string,
    status: QuestionStatus
  ): Promise<Question | null> {
    const store = loadStore();
    const target = store.questions.find((question) => question.id === questionId);
    if (!target) {
      return null;
    }
    target.status = status;
    saveStore(store);
    return target;
  },
  async updateQuestionText(questionId: string, text: string): Promise<Question | null> {
    const store = loadStore();
    const target = store.questions.find((question) => question.id === questionId);
    if (!target) {
      return null;
    }
    target.text = text;
    saveStore(store);
    return target;
  },
  async updateAnswerText(answerId: string, text: string): Promise<Answer | null> {
    const store = loadStore();
    for (const question of store.questions) {
      const target = question.answers?.find((answer) => answer.id === answerId);
      if (!target) {
        continue;
      }
      target.text = text;
      saveStore(store);
      return target;
    }
    return null;
  },
  async deleteQuestion(questionId: string): Promise<boolean> {
    const store = loadStore();
    const targetIndex = store.questions.findIndex((question) => question.id === questionId);
    if (targetIndex === -1) {
      return false;
    }
    const [removed] = store.questions.splice(targetIndex, 1);
    store.questionReactions = store.questionReactions.filter(
      (entry) => entry.questionId !== questionId
    );
    if (removed?.answers?.length) {
      const answerIds = new Set(removed.answers.map((answer) => answer.id));
      store.answerReactions = store.answerReactions.filter(
        (entry) => !answerIds.has(entry.answerId)
      );
    }
    saveStore(store);
    return true;
  },
  async deleteAnswer(answerId: string): Promise<boolean> {
    const store = loadStore();
    for (const question of store.questions) {
      const answerIndex = question.answers?.findIndex((answer) => answer.id === answerId);
      if (answerIndex === undefined || answerIndex < 0) {
        continue;
      }
      question.answers?.splice(answerIndex, 1);
      store.answerReactions = store.answerReactions.filter(
        (entry) => entry.answerId !== answerId
      );
      saveStore(store);
      return true;
    }
    return false;
  },
  async getProfile(): Promise<Profile> {
    const store = loadStore();
    if (!store.currentUserId) {
      return { xp: 0, level: 0, avatarStage: 0 };
    }
    return store.profiles[store.currentUserId] ?? { xp: 0, level: 0, avatarStage: 0 };
  },
  async addXp(amount: number): Promise<Profile> {
    const store = loadStore();
    if (!store.currentUserId) {
      return { xp: 0, level: 0, avatarStage: 0 };
    }
    const profile =
      store.profiles[store.currentUserId] ?? { xp: 0, level: 0, avatarStage: 0 };
    profile.xp = Math.max(0, profile.xp + amount);
    profile.level = levelForXp(profile.xp);
    profile.avatarStage = avatarForLevel(profile.level);
    store.profiles[store.currentUserId] = profile;
    saveStore(store);
    return profile;
  },
};
