import type {
  Answer,
  Profile,
  Question,
  QuestionStatus,
  Reactions,
  Role,
  Room,
  UserAccount,
} from "../types";
import { getSupabase } from "./supabase";
import { localApi } from "./localStore";

const useLocal = import.meta.env.VITE_USE_LOCAL === "true";
const requireSupabase = () => {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase が設定されていません。ENV を確認してください。");
  }
  return supabase;
};

const getSessionUser = async (supabase: ReturnType<typeof getSupabase>) => {
  if (!supabase) {
    return null;
  }
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user) {
    return sessionData.session.user;
  }
  const { data: userData, error } = await supabase.auth.getUser();
  if (error) {
    return null;
  }
  return userData.user ?? null;
};

const getUserId = async (supabase: ReturnType<typeof getSupabase>) => {
  const user = await getSessionUser(supabase);
  return user?.id ?? null;
};

const levelForXp = (xp: number) => Math.floor(xp);
const avatarForLevel = (level: number) => {
  if (level >= 12) return 3;
  if (level >= 7) return 2;
  if (level >= 3) return 1;
  return 0;
};

const mapRoom = (row: any): Room => ({
  id: row.id,
  code: row.code,
  name: row.name,
  channel: row.channel,
  createdAt: row.created_at,
});

const mapAnswer = (row: any): Answer => ({
  id: row.id,
  questionId: row.question_id,
  text: row.text,
  author: row.author,
  role: row.role,
  createdAt: row.created_at,
  reactions: row.reactions ?? { like: 0, thanks: 0 },
  ownerId: row.owner_id ?? undefined,
});

const mapQuestion = (row: any): Question => ({
  id: row.id,
  roomId: row.room_id,
  text: row.text,
  status: row.status,
  createdAt: row.created_at,
  ownerId: row.owner_id ?? undefined,
  author: row.author,
  anonymous: row.anonymous ?? false,
  reactions: row.reactions ?? { like: 0, thanks: 0 },
  answers: (row.answers ?? []).map(mapAnswer).sort((a: Answer, b: Answer) =>
    a.createdAt.localeCompare(b.createdAt)
  ),
});

export const dataApi = {
  async registerUser(
    name: string,
    role: Role,
    email: string,
    password: string,
    avatarUrl?: string
  ): Promise<UserAccount> {
    if (useLocal) {
      return localApi.registerUser(name, role, email, password, avatarUrl);
    }
    const supabase = requireSupabase();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: name, role } },
    });
    if (error || !data.user) {
      throw new Error(error?.message ?? "Failed to register");
    }
    const profilePayload = {
      id: data.user.id,
      display_name: name,
      role,
      xp: 0,
      level: 0,
      avatar_url: avatarUrl ?? null,
    };
    const { error: profileError } = await supabase.from("profiles").upsert(profilePayload);
    if (profileError) {
      throw new Error(profileError.message);
    }
    localApi.setCurrentUserId(data.user.id);
    return { id: data.user.id, name, role, email, avatarUrl: avatarUrl ?? undefined };
  },
  async loginUser(email: string, password: string): Promise<UserAccount | null> {
    if (useLocal) {
      return localApi.loginUser(email, password);
    }
    const supabase = requireSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) {
      return null;
    }
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profileError || !profile) {
      throw new Error(profileError?.message ?? "プロフィールが見つかりません。");
    }
    localApi.setCurrentUserId(data.user.id);
    return {
      id: data.user.id,
      name: profile.display_name,
      role: profile.role,
      email,
      avatarUrl: profile.avatar_url ?? undefined,
    };
  },
  async logoutUser(): Promise<void> {
    if (useLocal) {
      return localApi.logoutUser();
    }
    const supabase = requireSupabase();
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
    localApi.setCurrentUserId(undefined);
  },
  async getCurrentUser(): Promise<UserAccount | null> {
    if (useLocal) {
      return localApi.getCurrentUser();
    }
    const supabase = getSupabase();
    if (!supabase) {
      return null;
    }
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return null;
    }
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.user.id)
      .maybeSingle();
    if (profileError || !profile) {
      return null;
    }
    localApi.setCurrentUserId(data.user.id);
    return {
      id: data.user.id,
      name: profile.display_name,
      role: profile.role,
      email: data.user.email ?? "",
      avatarUrl: profile.avatar_url ?? undefined,
    };
  },
  async listJoinedRooms(): Promise<Room[]> {
    if (useLocal) {
      return localApi.listJoinedRooms();
    }
    const supabase = requireSupabase();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return [];
    }
    const { data, error } = await supabase
      .from("room_members")
      .select("room:rooms(*)")
      .eq("user_id", authData.user.id)
      .order("joined_at", { ascending: false });
    if (error || !data) {
      throw new Error(error?.message ?? "Failed to load rooms");
    }
    return data
      .map((entry) => entry.room)
      .filter(Boolean)
      .map(mapRoom);
  },
  async createRoom(name: string, channel: string): Promise<Room> {
    if (useLocal) {
      return localApi.createRoom(name, channel);
    }
    const supabase = requireSupabase();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      throw new Error("認証が必要です。");
    }
    const payload: Record<string, unknown> = { name, channel, created_by: authData.user.id };
    const { data, error } = await supabase
      .from("rooms")
      .insert([payload])
      .select()
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? "Failed to create room");
    }
    const { error: memberError } = await supabase.from("room_members").upsert(
      { room_id: data.id, user_id: authData.user.id },
      { onConflict: "room_id,user_id", ignoreDuplicates: true }
    );
    if (memberError) {
      throw new Error(memberError.message);
    }
    return mapRoom(data);
  },
  async joinRoom(code: string): Promise<Room | null> {
    if (useLocal) {
      return localApi.joinRoom(code);
    }
    const supabase = requireSupabase();
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("code", code)
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    if (data) {
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        const { error: memberError } = await supabase.from("room_members").upsert(
          { room_id: data.id, user_id: authData.user.id },
          { onConflict: "room_id,user_id", ignoreDuplicates: true }
        );
        if (memberError) {
          throw new Error(memberError.message);
        }
      }
    }
    return data ? mapRoom(data) : null;
  },
  async listQuestions(roomId: string): Promise<Question[]> {
    if (useLocal) {
      return localApi.listQuestions(roomId);
    }
    const supabase = getSupabase();
    if (!supabase) {
      return localApi.listQuestions(roomId);
    }
    const { data, error } = await supabase
      .from("questions")
      .select("*, answers(*)")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false });
    if (error || !data) {
      throw new Error(error?.message ?? "Failed to load questions");
    }
    const questionIds = data.map((row) => row.id);
    const answerIds = data.flatMap((row) => (row.answers ?? []).map((answer: any) => answer.id));
    const reactionsByQuestion = new Map<string, Reactions>();
    const reactionsByAnswer = new Map<string, Reactions>();
    if (questionIds.length) {
      const { data: reactionRows, error: reactionError } = await supabase
        .from("question_reactions")
        .select("question_id, type")
        .in("question_id", questionIds);
      if (reactionError) {
        throw new Error(reactionError.message);
      }
      for (const row of reactionRows ?? []) {
        const current = reactionsByQuestion.get(row.question_id) ?? { like: 0, thanks: 0 };
        current[row.type as keyof Reactions] += 1;
        reactionsByQuestion.set(row.question_id, current);
      }
    }
    if (answerIds.length) {
      const { data: reactionRows, error: reactionError } = await supabase
        .from("answer_reactions")
        .select("answer_id, type")
        .in("answer_id", answerIds);
      if (reactionError) {
        throw new Error(reactionError.message);
      }
      for (const row of reactionRows ?? []) {
        const current = reactionsByAnswer.get(row.answer_id) ?? { like: 0, thanks: 0 };
        current[row.type as keyof Reactions] += 1;
        reactionsByAnswer.set(row.answer_id, current);
      }
    }
    return data.map((row) => {
      const question = mapQuestion(row);
      question.reactions = reactionsByQuestion.get(question.id) ?? { like: 0, thanks: 0 };
      question.answers = question.answers.map((answer) => ({
        ...answer,
        reactions: reactionsByAnswer.get(answer.id) ?? { like: 0, thanks: 0 },
      }));
      return question;
    });
  },
  async createQuestion(
    roomId: string,
    text: string,
    author?: string,
    anonymous?: boolean,
    ownerId?: string
  ): Promise<Question> {
    if (useLocal) {
      return localApi.createQuestion(roomId, text, author, anonymous, ownerId);
    }
    const supabase = getSupabase();
    if (!supabase) {
      return localApi.createQuestion(roomId, text, author, anonymous, ownerId);
    }
    let resolvedOwnerId = ownerId;
    if (!resolvedOwnerId) {
      const { data: authData } = await supabase.auth.getUser();
      resolvedOwnerId = authData.user?.id;
    }
    const { data, error } = await supabase
      .from("questions")
      .insert([{ room_id: roomId, text, author, anonymous, owner_id: resolvedOwnerId }])
      .select()
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? "Failed to create question");
    }
    return {
      ...mapQuestion(data),
      answers: [],
    };
  },
  async createAnswer(
    questionId: string,
    text: string,
    author: string,
    role: Role,
    ownerId?: string
  ): Promise<Answer> {
    if (useLocal) {
      return localApi.createAnswer(questionId, text, author, role, ownerId);
    }
    const supabase = getSupabase();
    if (!supabase) {
      return localApi.createAnswer(questionId, text, author, role, ownerId);
    }
    const { data, error } = await supabase
      .from("answers")
      .insert([{ question_id: questionId, text, author, role, owner_id: ownerId }])
      .select()
      .single();
    if (
      error &&
      (error.code === "42703" ||
        error.code === "PGRST204" ||
        error.message.includes("schema cache"))
    ) {
      const { data: retryData, error: retryError } = await supabase
        .from("answers")
        .insert([{ question_id: questionId, text, author, role }])
        .select()
        .single();
      if (retryError || !retryData) {
        throw new Error(retryError?.message ?? "Failed to create answer");
      }
      return {
        ...mapAnswer(retryData),
        reactions: { like: 0, thanks: 0 },
      };
    }
    if (error || !data) {
      throw new Error(error?.message ?? "Failed to create answer");
    }
    return {
      ...mapAnswer(data),
      reactions: { like: 0, thanks: 0 },
    };
  },
  async updateQuestionStatus(
    questionId: string,
    status: QuestionStatus
  ): Promise<Question | null> {
    if (useLocal) {
      return localApi.updateQuestionStatus(questionId, status);
    }
    const supabase = getSupabase();
    if (!supabase) {
      return localApi.updateQuestionStatus(questionId, status);
    }
    const { data, error } = await supabase
      .from("questions")
      .update({ status })
      .eq("id", questionId)
      .select("*, answers(*)")
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    return data ? mapQuestion(data) : null;
  },
  async updateQuestionText(questionId: string, text: string): Promise<Question | null> {
    if (useLocal) {
      return localApi.updateQuestionText(questionId, text);
    }
    const supabase = getSupabase();
    if (!supabase) {
      return localApi.updateQuestionText(questionId, text);
    }
    const { data, error } = await supabase
      .from("questions")
      .update({ text })
      .eq("id", questionId)
      .select("*, answers(*)")
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    return data ? mapQuestion(data) : null;
  },
  async updateAnswerText(answerId: string, text: string): Promise<Answer | null> {
    if (useLocal) {
      return localApi.updateAnswerText(answerId, text);
    }
    const supabase = getSupabase();
    if (!supabase) {
      return localApi.updateAnswerText(answerId, text);
    }
    const { data, error } = await supabase
      .from("answers")
      .update({ text })
      .eq("id", answerId)
      .select()
      .maybeSingle();
    if (error) {
      throw new Error(error.message);
    }
    return data ? mapAnswer(data) : null;
  },
  async addQuestionReaction(
    questionId: string,
    type: keyof Reactions,
    userId: string
  ): Promise<Question | null> {
    if (useLocal) {
      return localApi.addQuestionReaction(questionId, type, userId);
    }
    const supabase = getSupabase();
    if (!supabase) {
      return localApi.addQuestionReaction(questionId, type, userId);
    }
    const { data: existing, error: existingError } = await supabase
      .from("question_reactions")
      .select("id")
      .eq("question_id", questionId)
      .eq("user_id", userId)
      .eq("type", type)
      .maybeSingle();
    if (existingError) {
      throw new Error(existingError.message);
    }
    if (existing) {
      const { error: deleteError } = await supabase
        .from("question_reactions")
        .delete()
        .eq("id", existing.id);
      if (deleteError) {
        throw new Error(deleteError.message);
      }
    } else {
      const { error: insertError } = await supabase
        .from("question_reactions")
        .insert([{ question_id: questionId, user_id: userId, type }]);
      if (insertError) {
        throw new Error(insertError.message);
      }
    }
    const { data: questionRow, error: questionError } = await supabase
      .from("questions")
      .select("*, answers(*)")
      .eq("id", questionId)
      .maybeSingle();
    if (questionError) {
      throw new Error(questionError.message);
    }
    if (!questionRow) {
      return null;
    }
    const { data: reactionRows, error: reactionError } = await supabase
      .from("question_reactions")
      .select("type")
      .eq("question_id", questionId);
    if (reactionError) {
      throw new Error(reactionError.message);
    }
    const reactions: Reactions = { like: 0, thanks: 0 };
    for (const row of reactionRows ?? []) {
      reactions[row.type as keyof Reactions] += 1;
    }
    const question = mapQuestion(questionRow);
    question.reactions = reactions;
    return question;
  },
  async addAnswerReaction(
    answerId: string,
    type: keyof Reactions,
    userId: string
  ): Promise<Answer | null> {
    if (useLocal) {
      return localApi.addAnswerReaction(answerId, type, userId);
    }
    const supabase = getSupabase();
    if (!supabase) {
      return localApi.addAnswerReaction(answerId, type, userId);
    }
    const { data: existing, error: existingError } = await supabase
      .from("answer_reactions")
      .select("id")
      .eq("answer_id", answerId)
      .eq("user_id", userId)
      .eq("type", type)
      .maybeSingle();
    if (existingError) {
      throw new Error(existingError.message);
    }
    if (existing) {
      const { error: deleteError } = await supabase
        .from("answer_reactions")
        .delete()
        .eq("id", existing.id);
      if (deleteError) {
        throw new Error(deleteError.message);
      }
    } else {
      const { error: insertError } = await supabase
        .from("answer_reactions")
        .insert([{ answer_id: answerId, user_id: userId, type }]);
      if (insertError) {
        throw new Error(insertError.message);
      }
    }
    const { data: answerRow, error: answerError } = await supabase
      .from("answers")
      .select("*")
      .eq("id", answerId)
      .maybeSingle();
    if (answerError) {
      throw new Error(answerError.message);
    }
    if (!answerRow) {
      return null;
    }
    const { data: reactionRows, error: reactionError } = await supabase
      .from("answer_reactions")
      .select("type")
      .eq("answer_id", answerId);
    if (reactionError) {
      throw new Error(reactionError.message);
    }
    const reactions: Reactions = { like: 0, thanks: 0 };
    for (const row of reactionRows ?? []) {
      reactions[row.type as keyof Reactions] += 1;
    }
    return { ...mapAnswer(answerRow), reactions };
  },
  async deleteQuestion(questionId: string): Promise<boolean> {
    if (useLocal) {
      return localApi.deleteQuestion(questionId);
    }
    const supabase = getSupabase();
    if (!supabase) {
      return localApi.deleteQuestion(questionId);
    }
    const { data, error } = await supabase
      .from("questions")
      .delete()
      .eq("id", questionId)
      .select("id");
    if (error) {
      throw new Error(error.message);
    }
    if (!data || data.length === 0) {
      throw new Error("削除権限がありません。");
    }
    return true;
  },
  async deleteAnswer(answerId: string): Promise<boolean> {
    if (useLocal) {
      return localApi.deleteAnswer(answerId);
    }
    const supabase = getSupabase();
    if (!supabase) {
      return localApi.deleteAnswer(answerId);
    }
    const { data, error } = await supabase
      .from("answers")
      .delete()
      .eq("id", answerId)
      .select("id");
    if (error) {
      throw new Error(error.message);
    }
    if (!data || data.length === 0) {
      throw new Error("削除権限がありません。");
    }
    return true;
  },
  async getProfile(): Promise<Profile> {
    if (useLocal) {
      return localApi.getProfile();
    }
    const supabase = getSupabase();
    if (!supabase) {
      return localApi.getProfile();
    }
    const userId = await getUserId(supabase);
    if (!userId) {
      return { xp: 0, level: 0, avatarStage: 0 };
    }
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("xp, level")
      .eq("id", userId)
      .maybeSingle();
    if (profileError || !profile) {
      return { xp: 0, level: 0, avatarStage: 0 };
    }
    const xp = profile.xp ?? 0;
    const level = profile.level ?? levelForXp(xp);
    return { xp, level, avatarStage: avatarForLevel(level) };
  },
  async addXp(amount: number): Promise<Profile> {
    if (useLocal) {
      return localApi.addXp(amount);
    }
    const supabase = getSupabase();
    if (!supabase) {
      return localApi.addXp(amount);
    }
    const userId = await getUserId(supabase);
    if (!userId) {
      return { xp: 0, level: 0, avatarStage: 0 };
    }
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("xp, level")
      .eq("id", userId)
      .maybeSingle();
    if (profileError) {
      throw new Error(profileError.message);
    }
    const currentXp = profile?.xp ?? 0;
    const newXp = Math.max(0, currentXp + amount);
    const newLevel = levelForXp(newXp);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ xp: newXp, level: newLevel })
      .eq("id", userId);
    if (updateError) {
      throw new Error(updateError.message);
    }
    return { xp: newXp, level: newLevel, avatarStage: avatarForLevel(newLevel) };
  },
  async updateAvatar(avatarUrl: string): Promise<UserAccount> {
    if (useLocal) {
      return localApi.updateAvatar(avatarUrl);
    }
    const supabase = requireSupabase();
    const user = await getSessionUser(supabase);
    if (!user) {
      throw new Error("ユーザーが見つかりません。");
    }
    const { data, error } = await supabase
      .from("profiles")
      .update({ avatar_url: avatarUrl })
      .eq("id", user.id)
      .select("*")
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? "アイコンの更新に失敗しました。");
    }
    return {
      id: data.id,
      name: data.display_name,
      role: data.role,
      email: user.email ?? "",
      avatarUrl: data.avatar_url ?? undefined,
    };
  },
  async updateDisplayName(displayName: string): Promise<UserAccount> {
    if (useLocal) {
      return localApi.updateDisplayName(displayName);
    }
    const supabase = requireSupabase();
    const user = await getSessionUser(supabase);
    if (!user) {
      throw new Error("ユーザーが見つかりません。");
    }
    const { data, error } = await supabase
      .from("profiles")
      .update({ display_name: displayName })
      .eq("id", user.id)
      .select("*")
      .single();
    if (error || !data) {
      throw new Error(error?.message ?? "表示名の更新に失敗しました。");
    }
    return {
      id: data.id,
      name: data.display_name,
      role: data.role,
      email: user.email ?? "",
      avatarUrl: data.avatar_url ?? undefined,
    };
  },
  async listUserAvatars(userIds: string[]): Promise<Record<string, string>> {
    if (!userIds.length) {
      return {};
    }
    if (useLocal) {
      return localApi.listUserAvatars(userIds);
    }
    const supabase = getSupabase();
    if (!supabase) {
      return localApi.listUserAvatars(userIds);
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("id, avatar_url")
      .in("id", userIds);
    if (error || !data) {
      throw new Error(error?.message ?? "アイコン情報の取得に失敗しました。");
    }
    const result: Record<string, string> = {};
    for (const row of data) {
      if (row.avatar_url) {
        result[row.id] = row.avatar_url;
      }
    }
    return result;
  },
  async listUserLevels(userIds: string[]): Promise<Record<string, number>> {
    if (!userIds.length) {
      return {};
    }
    if (useLocal) {
      return localApi.listUserLevels(userIds);
    }
    const supabase = getSupabase();
    if (!supabase) {
      return localApi.listUserLevels(userIds);
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("id, xp, level")
      .in("id", userIds);
    if (error || !data) {
      throw new Error(error?.message ?? "レベル情報の取得に失敗しました。");
    }
    const result: Record<string, number> = {};
    for (const row of data) {
      const level = row.level ?? levelForXp(row.xp ?? 0);
      result[row.id] = level;
    }
    return result;
  },
  async listUserReactions(
    questionIds: string[],
    answerIds: string[],
    userId: string
  ): Promise<{
    questions: Record<string, { like: boolean; thanks: boolean }>;
    answers: Record<string, { like: boolean; thanks: boolean }>;
  }> {
    if (useLocal) {
      return localApi.listUserReactions(questionIds, answerIds, userId);
    }
    const supabase = getSupabase();
    if (!supabase) {
      return localApi.listUserReactions(questionIds, answerIds, userId);
    }

    const questions: Record<string, { like: boolean; thanks: boolean }> = {};
    const answers: Record<string, { like: boolean; thanks: boolean }> = {};

    if (questionIds.length) {
      const { data } = await supabase
        .from("question_reactions")
        .select("question_id, type")
        .eq("user_id", userId)
        .in("question_id", questionIds);
      for (const qId of questionIds) {
        questions[qId] = { like: false, thanks: false };
      }
      for (const row of data ?? []) {
        questions[row.question_id][row.type as "like" | "thanks"] = true;
      }
    }

    if (answerIds.length) {
      const { data } = await supabase
        .from("answer_reactions")
        .select("answer_id, type")
        .eq("user_id", userId)
        .in("answer_id", answerIds);
      for (const aId of answerIds) {
        answers[aId] = { like: false, thanks: false };
      }
      for (const row of data ?? []) {
        answers[row.answer_id][row.type as "like" | "thanks"] = true;
      }
    }

    return { questions, answers };
  },
};
