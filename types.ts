export enum EquipmentType {
  WEAPON = 'WEAPON',
  HELM = 'HELM',
  ARMOR = 'ARMOR',
  SHIELD = 'SHIELD'
}

export enum EquipmentRank {
  D = 'D',
  C = 'C',
  B = 'B',
  A = 'A',
  S = 'S'
}

export interface Equipment {
  id: string;
  name: string;
  type: EquipmentType;
  power: number;
  isEquipped: boolean;
  rank: EquipmentRank;
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
  unlockLevel: number; // Level required in previous job to unlock this
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

export interface MerchantUpgrades {
  attackBonus: number;      // 攻撃UP (+10/lv)
  critRate: number;         // クリティカル率UP (+1%/lv)
  critDamage: number;       // クリティカルダメージUP (+10%/lv)
  weaponBoost: number;      // 武器補正 (+1%/lv)
  helmBoost: number;        // 兜補正 (+1%/lv)
  armorBoost: number;       // 鎧補正 (+1%/lv)
  shieldBoost: number;      // 盾補正 (+1%/lv)
}

export interface ReincarnationUpgrades {
  xpBoost: number;          // 経験値UP (+1%/lv)
  goldBoost: number;        // ゴールドUP (+1%/lv)
  stoneBoost: number;       // 転生石UP (+1%/lv)
  startFloor: number;       // 開始階層UP (+100階/lv)
  equipAProb: number;       // A装備獲得率UP (+1%/lv)
  equipSProb: number;       // S装備獲得率UP (+1%/lv)
  baseAttackBoost: number;  // 基礎攻撃力UP (+100/lv)
  autoPromote: number;      // 自動転職 (Lv check against job index)
  autoEquip: number;        // 自動最強装備 (0 or 1)
  
  // Skill Specific Probabilities (+1%/lv)
  prob_slash: number;
  prob_power_attack: number;
  prob_holy_strike: number;
  prob_divine: number;
  prob_meteor: number;
  prob_galaxy: number;
  prob_void: number;
  prob_god_blow: number;
  prob_infinity: number;
  prob_legend: number;
}

export interface Player {
  level: number;
  currentXp: number;
  requiredXp: number;
  job: JobType;
  jobLevel: number;
  gold: number;
  floor: number;
  maxFloorReached: number; // Track max floor for reincarnation limit
  baseAttack: number;
  maxHp: number; // For visualization, though player doesn't take damage in this spec
  skillMastery: Record<string, SkillMastery>; // Key is skill name
  reincarnationStones: number;
  merchantUpgrades: MerchantUpgrades;
  reincarnationUpgrades: ReincarnationUpgrades;
}

export interface LogEntry {
  id: string;
  message: string;
  type: 'damage' | 'gain' | 'info' | 'boss' | 'danger' | 'crit';
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
  hardMode: boolean;
}