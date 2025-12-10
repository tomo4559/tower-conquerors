
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
  basePower: number; // New: Fixed base power determined by Tier
  power: number;     // Calculated power (Base * Rank * Plus)
  isEquipped: boolean;
  rank: EquipmentRank;
  tier: number;      // New: Tier 1-30
  plus: number;      // New: Enhancement level (+0 to +Max)
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
  giantKilling: number;     // ジャイアントキリング (対ボスダメージ +2%/lv)
  weaponBoost: number;      // 武器補正 (+1%/lv)
  helmBoost: number;        // 兜補正 (+1%/lv)
  armorBoost: number;       // 鎧補正 (+1%/lv)
  shieldBoost: number;      // 盾補正 (+1%/lv)
}

export interface ReincarnationUpgrades {
  xpBoost: number;          // 経験値UP (+1%/lv)
  goldBoost: number;        // ゴールドUP (+1%/lv)
  stoneBoost: number;       // 転生石UP (+1%/lv)
  startFloor: number;       // 開始階層 (+100 floor/lv)
  autoPromote: number;      // 自動転職
  autoEquip: number;        // 自動装備
  autoMerchant: number;     // 自動商人購入
  itemFilter: number;       // ドロップ選別
  farming: number;          // 自動周回
  autoEnhance: number;      // 自動装備強化 (New)
  itemPersistence: number;  // 装備継承 (Lv1:B, Lv2:A, Lv3:S)
  baseAttackBoost: number;  // 基礎攻撃力UP
  enemyHpDown: number;      // 敵HP低下
  skillDamageBoost: number; // スキル威力UP
  priceDiscount: number;    // 購入価格割引
  concentration: number;    // スキル発動率UP
  vitalSpot: number;        // クリティカル率UP
  hyperSpeed: number;       // 攻撃速度UP
  awakening: number;        // 覚醒
}

export interface ActiveSkillState {
  isActive: boolean;
  endTime: number;
  cooldownEnd: number;
  duration: number;
}

export interface ActiveSkillsState {
  concentration: ActiveSkillState;
  vitalSpot: ActiveSkillState;
  hyperSpeed: ActiveSkillState;
  awakening: ActiveSkillState;
}

export interface FarmingMode {
  min: number;
  max: number;
}

export interface Player {
  level: number;
  currentXp: number;
  requiredXp: number;
  job: JobType;
  jobLevel: number;
  gold: number;
  floor: number;
  maxFloorReached: number;
  baseAttack: number;
  maxHp: number;
  skillMastery: Record<string, SkillMastery>;
  reincarnationStones: number;
  merchantUpgrades: MerchantUpgrades;
  reincarnationUpgrades: ReincarnationUpgrades;
  autoMerchantKeys: Partial<Record<keyof MerchantUpgrades, boolean>>;
  dropPreferences?: Partial<Record<EquipmentType, boolean>>;
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
  equipped: Partial<Record<EquipmentType, Equipment>>;
  logs: LogEntry[];
  bossTimer: number | null;
  autoBattleEnabled: boolean;
  activeSkills: ActiveSkillsState;
  farmingMode: FarmingMode | null;
  rareDropItem: Equipment | null; // For modal display
}