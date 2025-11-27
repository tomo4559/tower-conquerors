import { ENEMY_TYPES, BOSS_TYPES, JOB_DEFINITIONS, EQUIP_NAMES, RANK_DATA } from '../constants';
import { Player, Enemy, Equipment, EquipmentType, JobType, LogEntry, EquipmentRank, ReincarnationUpgrades } from '../types';

export const calculateUpgradeCost = (baseCost: number, currentLevel: number): number => {
  // Cost = Base * (1.2 ^ Level)
  return Math.floor(baseCost * Math.pow(1.2, currentLevel));
};

export const formatNumber = (num: number): string => {
  if (num >= 10000000000) {
    return Math.floor(num / 1000000000) + 'G';
  }
  if (num >= 10000000) {
    return Math.floor(num / 1000000) + 'M';
  }
  if (num >= 10000) {
    return Math.floor(num / 1000) + 'k';
  }
  return num.toLocaleString();
};

export const calculateTotalAttack = (player: Player, equipped: Partial<Record<EquipmentType, Equipment>>): number => {
  // 1. Merchant Attack Bonus (+10 per level)
  const merchantAtkBonus = (player.merchantUpgrades?.attackBonus || 0) * 10;
  
  // 1.5 Reincarnation Attack Bonus (+100 per level)
  const reincarnationAtkBonus = (player.reincarnationUpgrades?.baseAttackBoost || 0) * 100;

  // 2. Equipment Calculation with Merchant Boosts
  let equipmentBonus = 0;
  
  // Helper to get boost percent based on type
  const getBoost = (type: EquipmentType) => {
    if (!player.merchantUpgrades) return 0;
    switch (type) {
      case EquipmentType.WEAPON: return player.merchantUpgrades.weaponBoost * 0.01;
      case EquipmentType.HELM: return player.merchantUpgrades.helmBoost * 0.01;
      case EquipmentType.ARMOR: return player.merchantUpgrades.armorBoost * 0.01;
      case EquipmentType.SHIELD: return player.merchantUpgrades.shieldBoost * 0.01;
      default: return 0;
    }
  };

  Object.entries(equipped).forEach(([type, item]) => {
    if (item) {
      const boostPercent = getBoost(type as EquipmentType);
      // Item Power * (1 + Boost%)
      equipmentBonus += item.power * (1 + boostPercent);
    }
  });

  // Base Attack + Merchant Flat Bonus + Reincarnation Flat Bonus + Equipment Total
  const totalBase = player.baseAttack + merchantAtkBonus + reincarnationAtkBonus + equipmentBonus;

  // Job Multiplier
  const jobMultiplier = JOB_DEFINITIONS[player.job].multiplier;
  
  return Math.floor(totalBase * jobMultiplier);
};

export const calculateBossStats = (targetFloor: number): { hp: number, gold: number, xp: number } => {
  // If targetFloor is 100, 200, etc., use the base data directly
  if (targetFloor % 100 === 0) {
      const bossKey = ((targetFloor - 1) % 100 + 1) as keyof typeof BOSS_TYPES;
      const bossData = BOSS_TYPES[bossKey] || BOSS_TYPES[100];
      const baseScaler = Math.max(1, targetFloor / 50);
      const tierScaler = Math.pow(2, Math.floor((targetFloor - 1) / 100));
      const totalScaler = baseScaler * tierScaler;
      
      return {
          hp: Math.floor(bossData.hp * totalScaler),
          gold: Math.floor(bossData.gold * totalScaler),
          xp: Math.floor(bossData.xp * totalScaler)
      };
  }

  // Recursive step: Get the stats of the previous 100th floor boss
  const prevHundredFloor = Math.floor((targetFloor - 1) / 100) * 100;
  let baseHp = 0;
  
  if (prevHundredFloor > 0) {
      const prevStats = calculateBossStats(prevHundredFloor);
      baseHp = prevStats.hp;
  }

  // Calculate current floor's specific stats
  const bossKey = ((targetFloor - 1) % 100 + 1) as keyof typeof BOSS_TYPES;
  const bossData = BOSS_TYPES[bossKey] || BOSS_TYPES[100];
  const baseScaler = Math.max(1, targetFloor / 50);
  const tierScaler = Math.pow(2, Math.floor((targetFloor - 1) / 100));
  const totalScaler = baseScaler * tierScaler;

  // Final HP is Previous 100th Boss HP + Current Calculated HP
  // This ensures 110F > 100F
  return {
      hp: baseHp + Math.floor(bossData.hp * totalScaler),
      gold: Math.floor(bossData.gold * totalScaler),
      xp: Math.floor(bossData.xp * totalScaler)
  };
};

export const calculateReincarnationStones = (floor: number, multiplier: number): number => {
  if (floor < 100) return 0;
  
  let stones = 100; // Base for floor 100
  
  // For floors > 100, we add stones based on 10-floor increments
  // 100F: 100
  // 110F: 100 + 1 = 101
  // 120F: 101 + 2 = 103
  // 130F: 103 + 4 = 107
  // ... and so on
  
  const increments = Math.floor((floor - 100) / 10);
  
  for (let i = 1; i <= increments; i++) {
    stones += Math.pow(2, i - 1);
  }
  
  return Math.floor(stones * multiplier);
};

export const generateEnemy = (floor: number, isHardMode: boolean = false): Enemy => {
  // Hard Mode Multiplier
  const modeMultiplier = isHardMode ? 10 : 1;

  if (floor % 10 === 0) {
    const stats = calculateBossStats(floor);
    const bossKey = ((floor - 1) % 100 + 1) as keyof typeof BOSS_TYPES;
    const bossData = BOSS_TYPES[bossKey] || BOSS_TYPES[100];

    return {
      name: bossData.name,
      maxHp: Math.floor(stats.hp * modeMultiplier),
      currentHp: Math.floor(stats.hp * modeMultiplier),
      goldReward: Math.floor(stats.gold * modeMultiplier),
      xpReward: Math.floor(stats.xp * modeMultiplier),
      isBoss: true
    };
  }

  // Normal Enemy Logic
  // 1. Get previous boss stats to use as a baseline
  const prevBossFloor = Math.floor((floor - 1) / 10) * 10;
  let baseHp = 50; // Fallback for floors 1-9
  let baseGold = 10;
  let baseXp = 20;

  if (prevBossFloor >= 10) {
      const bossStats = calculateBossStats(prevBossFloor);
      baseHp = bossStats.hp;
      baseGold = bossStats.gold;
      baseXp = bossStats.xp;
  }

  // 2. Scale based on progress between bosses (0.5 to 0.95)
  const offset = floor % 10; // 1 to 9
  const ratio = 0.5 + (offset - 1) * 0.05; // 0.5, 0.55, ... 0.9

  // Cyclical enemy names
  const typeIndex = Math.floor(((floor - 1) % 20) / 2); 
  const baseEnemy = ENEMY_TYPES[Math.min(typeIndex, ENEMY_TYPES.length - 1)];
  const loop = Math.floor((floor - 1) / 20) + 1;
  const nameSuffix = loop > 1 ? ` Lv${floor}` : '';

  let finalHp, finalGold, finalXp;

  if (floor < 10) {
      finalHp = baseEnemy.hp * loop * 1.2;
      finalGold = baseEnemy.gold * loop;
      finalXp = baseEnemy.xp * loop;
  } else {
      finalHp = baseHp * ratio;
      finalGold = baseGold * ratio * 0.2; 
      finalXp = baseXp * ratio * 0.2;     
  }
  
  return {
    name: `${baseEnemy.name}${nameSuffix}`,
    maxHp: Math.floor(finalHp * modeMultiplier),
    currentHp: Math.floor(finalHp * modeMultiplier),
    goldReward: Math.floor(finalGold * modeMultiplier),
    xpReward: Math.floor(finalXp * modeMultiplier),
    isBoss: false
  };
};

export const generateDrop = (floor: number, upgrades: ReincarnationUpgrades, isBoss: boolean = false): Equipment | null => {
  // 30% chance to drop
  if (Math.random() > 0.3) return null;

  // Select Rank - Check High Rarity First to allow upgrades to matter more intuitively
  let rank = EquipmentRank.D;
  const rand = Math.random();
  
  // Reincarnation Probabilities
  const sBonus = (upgrades?.equipSProb || 0) * 0.01;
  const aBonus = (upgrades?.equipAProb || 0) * 0.01;

  // We iterate from highest rarity to lowest, using the probability + bonus
  // If random < cumulative_prob, we take it.
  
  const rankCheckOrder = [EquipmentRank.S, EquipmentRank.A, EquipmentRank.B, EquipmentRank.C, EquipmentRank.D];
  let cumulative = 0;

  for (const r of rankCheckOrder) {
    let prob = isBoss ? RANK_DATA[r].probBoss : RANK_DATA[r].probNormal;
    
    // Apply bonuses
    if (r === EquipmentRank.S) prob += sBonus;
    if (r === EquipmentRank.A) prob += aBonus;
    
    cumulative += prob;
    
    if (rand < cumulative) {
      rank = r;
      break;
    }
  }

  const types = Object.values(EquipmentType);
  const type = types[Math.floor(Math.random() * types.length)];
  
  const nameList = EQUIP_NAMES[type];
  const tier = Math.min(Math.floor((floor - 1) / 10), nameList.length - 1);
  const name = nameList[tier] || nameList[nameList.length - 1];

  let basePower = 0;
  switch (type) {
    case EquipmentType.WEAPON: basePower = 5 + (floor * 0.5); break;
    case EquipmentType.HELM: basePower = 3 + (floor * 0.3); break;
    case EquipmentType.ARMOR: basePower = 3 + (floor * 0.3); break;
    case EquipmentType.SHIELD: basePower = 2 + (floor * 0.2); break;
  }
  
  // Determine enhancement level first (0, +1, +2)
  const plus = Math.floor(Math.random() * 3);
  
  // Small variance for item quality (0.95 - 1.05)
  const quality = 0.95 + (Math.random() * 0.1);
  
  // Enhancement bonus: +1 is 20% stronger, +2 is 40% stronger
  const plusMultiplier = 1 + (plus * 0.2);

  // Rank Multiplier
  const rankMultiplier = RANK_DATA[rank].multiplier;
  
  // Final power calculation: Base * Quality * Bonus * Rank + Flat Bonus
  const finalPower = Math.floor(((basePower * quality * plusMultiplier) + plus) * rankMultiplier);

  const plusStr = plus > 0 ? ` +${plus}` : '';
  const displayName = `[${rank}] ${name}${plusStr}`;

  return {
    id: Math.random().toString(36).substring(7),
    name: displayName,
    type,
    power: finalPower,
    isEquipped: false,
    rank: rank
  };
};

export const createLog = (message: string, type: LogEntry['type']): LogEntry => {
  return {
    id: Math.random().toString(36).substring(7),
    message,
    type,
    timestamp: Date.now()
  };
};