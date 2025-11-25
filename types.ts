export enum EquipmentType {
  WEAPON = 'WEAPON',
  HELM = 'HELM',
  ARMOR = 'ARMOR',
  SHIELD = 'SHIELD'
}

export interface Equipment {
  id: string;
  name: string;
  type: EquipmentType;
  power: number;
  isEquipped: boolean;
}

export enum JobType {
  NOVICE = '初心者',
  WARRIOR = '戦士',
  PALADIN = '聖騎士',
  PALADIN_KING = '聖騎士王',
  MAGIC_SWORDSMAN = '魔法剣士',
  MAGIC_WARRIOR = '魔法戦士',
  GREAT_MAGIC_WARRIOR = '大魔法戦士',
  GOD_MAGIC_WARRIOR = '神魔法戦士',
  ULTIMATE_WARRIOR = '究極の戦士',
  LEGENDARY_HERO = '伝説の勇者'
}

export interface JobData {
  name: JobType;
  multiplier: number;
  skills: SkillData[];
}

export interface SkillData {
  name: string;
  description: string;
  triggerRate: number; // 0.0 - 1.0
  damageMultiplier: number;
}

export interface Enemy {
  name: string;
  maxHp: number;
  currentHp: number;
  goldReward: number;
  xpReward: number;
  isBoss: boolean;
}

export interface SkillMastery {
  level: number;
  count: number;
}

export interface Player {
  level: number;
  currentXp: number;
  requiredXp: number;
  job: JobType;
  jobLevel: number;
  gold: number;
  floor: number;
  baseAttack: number;
  maxHp: number; // For visualization, though player doesn't take damage in this spec
  skillMastery: Record<string, SkillMastery>; // Key is skill name
}

export interface LogEntry {
  id: string;
  message: string;
  type: 'damage' | 'gain' | 'info' | 'boss' | 'danger';
  timestamp: number;
}

export interface GameState {
  player: Player;
  enemy: Enemy | null;
  inventory: Equipment[];
  equipped: {
    [key in EquipmentType]?: Equipment;
  };
  logs: LogEntry[];
  bossTimer: number | null; // null if not boss fight, otherwise seconds remaining
  autoBattleEnabled: boolean;
}