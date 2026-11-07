export interface HouseholdMember {
  card_id: string;
  card_name: string;
  household_role: string;
  standing: string;
  attitude_to_user: string;
  attitude_to_peers: string;
}

export interface HouseholdRecord {
  id: string;
  name: string;
  category_label: string;
  description: string;
  user_title: string;
  rules_and_etiquette: string[];
  members: HouseholdMember[];
  shared_lore: string;
  createdAt: string;
  updatedAt: string;
}

export interface HouseholdMeta {
  id: string;
  name: string;
  category_label: string;
  description: string;
  user_title: string;
  memberCount: number;
  members: Array<{ card_id: string; card_name: string; household_role: string; standing: string }>;
  updatedAt: string;
}

export interface GenerateEncounterRequest {
  householdId: string;
  participatingCardIds?: string[];
  scenarioGoal?: string;
  tone?: string;
  saveToAlternateGreetings?: boolean;
}
