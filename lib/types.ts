export type Role = "mann" | "frau";

export type Entry = {
  role: Role;
  general_1: string;
  general_2: string;
  partner_specific: string;
  children_gratitude: string;
  updated_at: string | null;
};

export type TalkItem = {
  id: number;
  text: string;
  created_by: Role;
  origin_created_at: string;
};

export type StateResponse = {
  day: { id: number; date: string; status: "open" | "closed" };
  entries: Record<Role, Entry>;
  talk: TalkItem[];
  can_next_day: boolean;
};
