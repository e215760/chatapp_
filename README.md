# Lecture Q&A Pulse (Vue + TypeScript)

学生が教員に質問できる講義中Q&Aアプリの最小構成プロトタイプです。

## 目的
- 質問量・内容で詰まりを検知して理解度を見える化
- 多人数授業でも質問をチャンネル単位で集約
- 納得マークで回答の伝達状況を確認
- Q&Aを資産化し次回以降の講義改善に活用
- 投稿回数で経験値がたまり、レベルでアイコンが変化
- 匿名投稿・リアクションで心理的ハードルを下げる

## ローカル実行
```bash
npm install
npm run dev
```

## Supabase 接続
`.env` を作成して以下を設定してください。
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Supabase 未設定の場合はローカルストレージに保存します。
ローカル強制の場合は `VITE_USE_LOCAL=true` を設定してください。

## Supabase セットアップ (Auth + 参加履歴)
1) Supabase で新規プロジェクトを作成  
2) Auth > Providers で Email を有効化  
3) テスト用途なら Auth > Settings で「Confirm email」をOFF  
4) SQL Editor で以下を実行

```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null check (role in ('teacher', 'student')),
  xp integer default 0,
  level integer default 0,
  avatar_url text,
  created_at timestamptz default now()
);

create table rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique default upper(substr(md5(random()::text), 1, 6)),
  name text not null,
  channel text,
  ta_key text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);

create table room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  joined_at timestamptz default now(),
  unique (room_id, user_id)
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  text text not null,
  status text default 'open',
  author text,
  anonymous boolean default false,
  reactions jsonb default '{"like":0,"thanks":0}',
  created_at timestamptz default now()
);

create table answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references questions(id) on delete cascade,
  owner_id uuid references auth.users(id) on delete set null,
  text text not null,
  author text not null,
  role text not null check (role in ('teacher', 'student', 'ta')),
  created_at timestamptz default now()
);

create table question_reactions (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references questions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  type text not null check (type in ('like', 'thanks')),
  created_at timestamptz default now(),
  unique (question_id, user_id, type)
);

create table answer_reactions (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid references answers(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  type text not null check (type in ('like', 'thanks')),
  created_at timestamptz default now(),
  unique (answer_id, user_id, type)
);

alter table profiles enable row level security;
alter table rooms enable row level security;
alter table room_members enable row level security;
alter table questions enable row level security;
alter table answers enable row level security;
alter table question_reactions enable row level security;
alter table answer_reactions enable row level security;

create policy "profiles read/write" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "profiles public read" on profiles
  for select using (true);

create policy "rooms read" on rooms
  for select using (true);

create policy "rooms insert" on rooms
  for insert with check (auth.uid() = created_by);

create policy "rooms update" on rooms
  for update using (auth.uid() = created_by);

create policy "room_members read" on room_members
  for select using (auth.uid() = user_id);

create policy "room_members insert" on room_members
  for insert with check (auth.uid() = user_id);

create policy "questions read" on questions
  for select using (true);

create policy "questions insert" on questions
  for insert with check (auth.uid() is not null);

create policy "questions update" on questions
  for update using (
    auth.uid() = owner_id
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('teacher', 'ta')
    )
  );

create policy "questions delete" on questions
  for delete using (
    auth.uid() = owner_id
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('teacher', 'ta')
    )
  );

create policy "answers read" on answers
  for select using (true);

create policy "answers insert" on answers
  for insert with check (auth.uid() is not null);

create policy "answers update" on answers
  for update using (
    auth.uid() = owner_id
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('teacher', 'ta')
    )
  );

create policy "answers delete" on answers
  for delete using (
    auth.uid() = owner_id
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('teacher', 'ta')
    )
  );

create policy "question_reactions read" on question_reactions
  for select using (true);

create policy "question_reactions insert" on question_reactions
  for insert with check (auth.uid() = user_id);

create policy "question_reactions delete" on question_reactions
  for delete using (auth.uid() = user_id);

create policy "answer_reactions read" on answer_reactions
  for select using (true);

create policy "answer_reactions insert" on answer_reactions
  for insert with check (auth.uid() = user_id);

create policy "answer_reactions delete" on answer_reactions
  for delete using (auth.uid() = user_id);
```

5) `.env` にプロジェクトの URL と anon key を設定

既存プロジェクトで `profiles` を作成済みの場合は以下を追加してください。

```sql
alter table profiles add column if not exists xp integer default 0;
alter table profiles add column if not exists level integer default 0;
alter table profiles add column if not exists avatar_url text;

create policy "profiles public read" on profiles
  for select using (true);

create policy "answers update" on answers
  for update using (
    auth.uid() = owner_id
    or exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role in ('teacher', 'ta')
    )
  );
```

## アカウント管理 (ローカル)
- 初回ログイン画面で学生/教員を選択して登録します。
- 以降は同じ表示名 + 役割でログインできます。
- 簡易仕様のためパスワードなしです（Supabase Auth 連携で拡張可能）。

### 推奨テーブル
```sql
create table rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique default upper(substr(md5(random()::text), 1, 6)),
  name text not null,
  channel text,
  ta_key text,
  created_at timestamptz default now()
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade,
  text text not null,
  status text default 'open',
  author text,
  anonymous boolean default false,
  reactions jsonb default '{"like":0,"thanks":0}',
  created_at timestamptz default now()
);
```

## ルーム参加
- 教員がルーム生成
- 学生はコード/URL/QR から参加

## 想定拡張
- 教員認証 (Supabase Auth + RLS)
- チャンネルの階層化
- 質問のタグや投票

## node_modulesは削除しました
