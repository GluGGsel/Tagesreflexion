export type Role = "mann" | "frau";

export type Entry = {
  general_1: string;
  general_2: string;
  partner_specific: string;
  children1_gratitude: string;
  children2_gratitude: string;
  updated_at: string;
};

export type TalkItem = {
  id: number;
  text: string;
  created_by: Role;
  created_at: string;
};

export type StateResponse = {
  day: { id: number | null; date: string };
  today_date: string;
  entries: {
    mann: Entry | null;
    frau: Entry | null;
  };
  talk: TalkItem[];
  can_next_day: boolean;
};
