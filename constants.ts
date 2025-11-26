import { JobType, JobData, EquipmentType, SkillData, EquipmentRank } from './types';

export const TICK_RATE_MS = 1000; // Battle tick every 1 second
export const BOSS_TIME_LIMIT = 30; // Seconds

// Equipment Ranks
export const RANK_DATA: Record<EquipmentRank, { multiplier: number, color: string, probNormal: number, probBoss: number }> = {
  [EquipmentRank.D]: { multiplier: 1.0, color: 'text-slate-400', probNormal: 0.80, probBoss: 0.20 },
  [EquipmentRank.C]: { multiplier: 1.5, color: 'text-emerald-400', probNormal: 0.12, probBoss: 0.48 },
  [EquipmentRank.B]: { multiplier: 3.0, color: 'text-cyan-400', probNormal: 0.05, probBoss: 0.20 },
  [EquipmentRank.A]: { multiplier: 5.0, color: 'text-red-500', probNormal: 0.02, probBoss: 0.08 },
  [EquipmentRank.S]: { multiplier: 10.0, color: 'text-yellow-400', probNormal: 0.01, probBoss: 0.04 },
};

// Skills - Buffed Multipliers
const SKILL_SLASH: SkillData = { name: 'スラッシュ', description: '通常攻撃の1.3倍', triggerRate: 0.3, damageMultiplier: 1.3 };
const SKILL_POWER_ATTACK: SkillData = { name: 'パワーアタック', description: '通常攻撃の1.6倍', triggerRate: 0.25, damageMultiplier: 1.6 };
const SKILL_HOLY_STRIKE: SkillData = { name: 'ホーリーストライク', description: '通常攻撃の2.2倍', triggerRate: 0.2, damageMultiplier: 2.2 };
const SKILL_DIVINE: SkillData = { name: 'ディバインジャッジメント', description: '通常攻撃の2.8倍', triggerRate: 0.15, damageMultiplier: 2.8 };

// New High-Tier Skills - Buffed Multipliers
const SKILL_METEOR: SkillData = { name: 'メテオスラッシュ', description: '通常攻撃の3.5倍', triggerRate: 0.12, damageMultiplier: 3.5 };
const SKILL_GALAXY: SkillData = { name: 'ギャラクシーブレイク', description: '通常攻撃の4.2倍', triggerRate: 0.10, damageMultiplier: 4.2 };
const SKILL_VOID: SkillData = { name: 'ヴォイドストライク', description: '通常攻撃の5.0倍', triggerRate: 0.08, damageMultiplier: 5.0 };
const SKILL_GOD_BLOW: SkillData = { name: 'ゴッドブロウ', description: '通常攻撃の6.5倍', triggerRate: 0.06, damageMultiplier: 6.5 };
const SKILL_INFINITY: SkillData = { name: 'インフィニティエッジ', description: '通常攻撃の8.0倍', triggerRate: 0.05, damageMultiplier: 8.0 };
const SKILL_LEGEND: SkillData = { name: 'レジェンドオーラ', description: '通常攻撃の10.0倍', triggerRate: 0.04, damageMultiplier: 10.0 };

export const JOB_DEFINITIONS: Record<JobType, JobData> = {
  [JobType.NOVICE]: { 
    name: JobType.NOVICE, 
    multiplier: 1.0, 
    unlockLevel: 0,
    skills: [SKILL_SLASH] 
  },
  [JobType.WARRIOR]: { 
    name: JobType.WARRIOR, 
    multiplier: 1.3, // Buffed from 1.2
    unlockLevel: 20,
    skills: [SKILL_SLASH, SKILL_POWER_ATTACK] 
  },
  [JobType.PALADIN]: { 
    name: JobType.PALADIN, 
    multiplier: 1.7, // Buffed from 1.5
    unlockLevel: 25,
    skills: [SKILL_SLASH, SKILL_POWER_ATTACK, SKILL_HOLY_STRIKE] 
  },
  [JobType.PALADIN_KING]: { 
    name: JobType.PALADIN_KING, 
    multiplier: 2.2, // Buffed from 1.8
    unlockLevel: 30,
    skills: [SKILL_SLASH, SKILL_POWER_ATTACK, SKILL_HOLY_STRIKE, SKILL_DIVINE] 
  },
  
  [JobType.MAGIC_SWORDSMAN]: { 
    name: JobType.MAGIC_SWORDSMAN, 
    multiplier: 2.8, // Buffed from 2.0
    unlockLevel: 35,
    skills: [SKILL_SLASH, SKILL_POWER_ATTACK, SKILL_HOLY_STRIKE, SKILL_DIVINE, SKILL_METEOR] 
  },
  [JobType.MAGIC_WARRIOR]: { 
    name: JobType.MAGIC_WARRIOR, 
    multiplier: 3.5, // Buffed from 2.3
    unlockLevel: 40,
    skills: [SKILL_SLASH, SKILL_POWER_ATTACK, SKILL_HOLY_STRIKE, SKILL_DIVINE, SKILL_METEOR, SKILL_GALAXY] 
  },
  [JobType.GREAT_MAGIC_WARRIOR]: { 
    name: JobType.GREAT_MAGIC_WARRIOR, 
    multiplier: 4.5, // Buffed from 2.6
    unlockLevel: 45,
    skills: [SKILL_SLASH, SKILL_POWER_ATTACK, SKILL_HOLY_STRIKE, SKILL_DIVINE, SKILL_METEOR, SKILL_GALAXY, SKILL_VOID] 
  },
  [JobType.GOD_MAGIC_WARRIOR]: { 
    name: JobType.GOD_MAGIC_WARRIOR, 
    multiplier: 6.0, // Buffed from 3.0
    unlockLevel: 50,
    skills: [SKILL_SLASH, SKILL_POWER_ATTACK, SKILL_HOLY_STRIKE, SKILL_DIVINE, SKILL_METEOR, SKILL_GALAXY, SKILL_VOID, SKILL_GOD_BLOW] 
  },
  [JobType.ULTIMATE_WARRIOR]: { 
    name: JobType.ULTIMATE_WARRIOR, 
    multiplier: 8.0, // Buffed from 3.5
    unlockLevel: 55,
    skills: [SKILL_SLASH, SKILL_POWER_ATTACK, SKILL_HOLY_STRIKE, SKILL_DIVINE, SKILL_METEOR, SKILL_GALAXY, SKILL_VOID, SKILL_GOD_BLOW, SKILL_INFINITY] 
  },
  [JobType.LEGENDARY_HERO]: { 
    name: JobType.LEGENDARY_HERO, 
    multiplier: 10.0, // Buffed from 4.0
    unlockLevel: 60,
    skills: [SKILL_SLASH, SKILL_POWER_ATTACK, SKILL_HOLY_STRIKE, SKILL_DIVINE, SKILL_METEOR, SKILL_GALAXY, SKILL_VOID, SKILL_GOD_BLOW, SKILL_INFINITY, SKILL_LEGEND] 
  },
};

export const JOB_ORDER = [
  JobType.NOVICE,
  JobType.WARRIOR,
  JobType.PALADIN,
  JobType.PALADIN_KING,
  JobType.MAGIC_SWORDSMAN,
  JobType.MAGIC_WARRIOR,
  JobType.GREAT_MAGIC_WARRIOR,
  JobType.GOD_MAGIC_WARRIOR,
  JobType.ULTIMATE_WARRIOR,
  JobType.LEGENDARY_HERO
];

export const ENEMY_TYPES = [
  { name: 'スライム', hp: 20, gold: 10, xp: 35 },
  { name: 'ゴブリン', hp: 30, gold: 15, xp: 55 },
  { name: 'オーク', hp: 40, gold: 20, xp: 75 },
  { name: 'トロル', hp: 50, gold: 25, xp: 95 },
  { name: 'ドラゴン', hp: 60, gold: 30, xp: 120 },
  { name: 'デーモン', hp: 80, gold: 40, xp: 150 },
  { name: 'ダークナイト', hp: 100, gold: 50, xp: 180 },
  { name: 'ウィッチ', hp: 120, gold: 60, xp: 210 },
  { name: 'ライチ', hp: 140, gold: 70, xp: 250 },
  { name: 'アンデッド', hp: 160, gold: 80, xp: 300 },
];

export const BOSS_TYPES = {
  10: { name: 'ゴブリンキング', hp: 150, gold: 100, xp: 600 },
  20: { name: 'オークロード', hp: 300, gold: 200, xp: 1200 },
  30: { name: 'ドラゴン', hp: 500, gold: 300, xp: 1800 },
  40: { name: 'デーモン', hp: 700, gold: 400, xp: 2400 },
  50: { name: 'アンデッドキング', hp: 1000, gold: 500, xp: 3000 },
  60: { name: '魔王', hp: 1500, gold: 600, xp: 4000 },
  70: { name: '神獣', hp: 2000, gold: 700, xp: 5000 },
  80: { name: '邪神', hp: 2500, gold: 800, xp: 6000 },
  90: { name: '究極の悪', hp: 3000, gold: 900, xp: 7000 },
  100: { name: '伝説の敵', hp: 4000, gold: 1000, xp: 10000 },
};

export const EQUIP_NAMES = {
  [EquipmentType.WEAPON]: ['古びた剣', '鉄の剣', '鋼の剣', 'ミスリルソード', 'ドラゴンキラー', 'エクスカリバー'],
  [EquipmentType.HELM]: ['皮の帽子', '鉄の兜', '鋼の兜', '騎士の兜', '王の冠'],
  [EquipmentType.ARMOR]: ['皮の鎧', '鎖帷子', 'プレートメイル', 'ドラゴンスケイル', '神の鎧'],
  [EquipmentType.SHIELD]: ['木の盾', '鉄の盾', 'タワーシールド', 'ミラーシールド', 'イージス'],
};

export const MERCHANT_ITEMS = [
  { key: 'attackBonus', name: '攻撃力UP', desc: '基礎攻撃力 +10', baseCost: 100 },
  { key: 'critRate', name: 'クリティカル率UP', desc: 'クリティカル率 +1%', baseCost: 100 },
  { key: 'critDamage', name: 'クリティカルダメUP', desc: 'クリティカルダメージ +10%', baseCost: 100 },
  { key: 'weaponBoost', name: '武器強化', desc: '武器の攻撃力 +1%', baseCost: 100 },
  { key: 'helmBoost', name: '兜強化', desc: '兜の攻撃力 +1%', baseCost: 100 },
  { key: 'armorBoost', name: '鎧強化', desc: '鎧の攻撃力 +1%', baseCost: 100 },
  { key: 'shieldBoost', name: '盾強化', desc: '盾の攻撃力 +1%', baseCost: 100 },
] as const;