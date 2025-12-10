

import { ENEMY_TYPES, BOSS_TYPES, JOB_DEFINITIONS, EQUIP_NAMES, RANK_DATA } from '../constants';
import { Player, Enemy, Equipment, EquipmentType, JobType, LogEntry, EquipmentRank, ReincarnationUpgrades } from '../types';

export const calculateUpgradeCost = (baseCost: number, currentLevel: number, discountLevel: number = 0, upgradeKey?: keyof ReincarnationUpgrades): number => {
  // Special logic for Item Persistence
  if (upgradeKey === 'itemPersistence') {
      if (currentLevel === 0) return 10_000_000;      // Lv1: 10M
      if (currentLevel === 1) return 1_000_000_000;   // Lv2: 1G
      if (currentLevel === 2) return 100_000_000_000; // Lv3: 100G
      return Infinity; // Maxed
  }

  // Merchant items use 1.5 multiplier, Reincarnation items use 1.2
  // If upgradeKey is present, it's a Reincarnation upgrade.
  const multiplier = upgradeKey ? 1.2 : 1.5;

  const basePrice = Math.floor(baseCost * Math.pow(multiplier, currentLevel));
  const discountPercent = Math.min(99, (discountLevel * (discountLevel + 1)) / 2); // Cap at 99%
  const discountFactor = 1 - (discountPercent / 100);
  return Math.floor(basePrice * discountFactor);
};

export const formatNumber = (num: number): string => {
  const absNum = Math.abs(num);
  const sign = num < 0 ? "-" : "";
  
  if (absNum < 1000) return Math.floor(num).toLocaleString();
  
  const magnitude = Math.floor(Math.log10(absNum) / 3);
  if (magnitude === 1) return sign + Math.floor(absNum / 1e3) + 'k';
  if (magnitude === 2) return sign + Math.floor(absNum / 1e6) + 'm';
  if (magnitude === 3) return sign + Math.floor(absNum / 1e9) + 'g';
  if (magnitude === 4) return sign + Math.floor(absNum / 1e12) + 't';
  
  const offset = magnitude - 5; 
  if (offset < 0) return Math.floor(num).toLocaleString();
  
  const firstIdx = Math.floor(offset / 26);
  const secondIdx = offset % 26;
  if (firstIdx > 25) return "MAX";
  const firstChar = String.fromCharCode(97 + firstIdx);
  const secondChar = String.fromCharCode(97 + secondIdx);
  const suffix = firstChar + secondChar;
  const divisor = Math.pow(10, magnitude * 3);
  return sign + Math.floor(absNum / divisor) + suffix;
};

// --- New Enhancement Mechanics ---
export const getEnhancementBonusMultiplier = (plus: number): number => {
  // +0 = 1x
  // +1 = 2x
  // ...
  // +5 = 32x
  if (plus <= 0) return 1;
  return Math.pow(2, plus);
};

export const calculateItemPower = (basePower: number, rank: EquipmentRank, plus: number): number => {
  const rankMultiplier = RANK_DATA[rank].multiplier;
  const plusMultiplier = getEnhancementBonusMultiplier(plus);
  // Final = Base * RankMult * PlusMult
  return Math.floor(basePower * rankMultiplier * plusMultiplier);
};

export const getNextRank = (currentRank: EquipmentRank): EquipmentRank | null => {
    const ranks = [EquipmentRank.D, EquipmentRank.C, EquipmentRank.B, EquipmentRank.A, EquipmentRank.S];
    const idx = ranks.indexOf(currentRank);
    if (idx >= 0 && idx < ranks.length - 1) {
        return ranks[idx + 1];
    }
    return null; // S is max
};

export const getSetBonus = (equipped: Partial<Record<EquipmentType, Equipment>>) => {
    // Count tiers
    const tierCounts: Record<number, number> = {};
    Object.values(equipped).forEach(item => {
        if (item) {
            tierCounts[item.tier] = (tierCounts[item.tier] || 0) + 1;
        }
    });

    let maxCount = 0;
    let bestTier = 0;
    Object.entries(tierCounts).forEach(([t, count]) => {
        if (count > maxCount || (count === maxCount && Number(t) > bestTier)) {
            maxCount = count;
            bestTier = Number(t);
        }
    });

    // Bonuses
    // 2: Atk x 1.1
    // 3: Atk x 1.2, Skill x 1.2
    // 4: Atk x 1.5, Skill x 1.5, Crit +10%
    let atkMult = 1.0;
    let skillMult = 1.0;
    let critAdd = 0;

    if (maxCount >= 4) {
        atkMult = 1.5;
        skillMult = 1.5;
        critAdd = 10;
    } else if (maxCount >= 3) {
        atkMult = 1.2;
        skillMult = 1.2;
    } else if (maxCount >= 2) {
        atkMult = 1.1;
    }

    return { atkMult, skillMult, critAdd, activeTier: bestTier, count: maxCount };
};

export const getCollectionBonusValue = (power: number): number => Math.floor(power / 5);

export const calculateCollectionBonus = (equipped: Partial<Record<EquipmentType, Equipment>>, inventory: Equipment[]): number => {
  // Inventory includes ALL items (both equipped and unequipped).
  // We sum up power of all unique items in inventory.
  let totalPower = 0;
  const countedIds = new Set<string>();

  inventory.forEach(item => {
      if (!countedIds.has(item.id)) {
          totalPower += item.power;
          countedIds.add(item.id);
      }
  });

  return Math.floor(totalPower / 5);
};

export const calculateTotalAttack = (player: Player, equipped: Partial<Record<EquipmentType, Equipment>>, inventory?: Equipment[]): number => {
  const atkLv = player.merchantUpgrades?.attackBonus || 0;
  const merchantAtkBonus = atkLv * (atkLv + 1) * 10;
  
  const reincAtkLv = player.reincarnationUpgrades?.baseAttackBoost || 0;
  const reincarnationAtkBonus = reincAtkLv * (reincAtkLv + 1) * 50;

  // Equipment Calculation (Equipped)
  let equipmentBonus = 0;
  const getBoost = (type: EquipmentType) => {
    if (!player.merchantUpgrades) return 0;
    let lv = 0;
    switch (type) {
      case EquipmentType.WEAPON: lv = player.merchantUpgrades.weaponBoost; break;
      case EquipmentType.HELM: lv = player.merchantUpgrades.helmBoost; break;
      case EquipmentType.ARMOR: lv = player.merchantUpgrades.armorBoost; break;
      case EquipmentType.SHIELD: lv = player.merchantUpgrades.shieldBoost; break;
    }
    return lv * (lv + 1) * 0.01;
  };

  Object.entries(equipped).forEach(([type, item]) => {
    if (item) {
      const boostPercent = getBoost(type as EquipmentType);
      equipmentBonus += item.power * (1 + boostPercent);
    }
  });

  // Collection Bonus: 1/5 of ALL possessed equipment (Inventory + Equipped)
  const collectionBonus = calculateCollectionBonus(equipped, inventory || []);

  const totalBase = player.baseAttack + merchantAtkBonus + reincarnationAtkBonus + equipmentBonus + collectionBonus;
  
  // Set Bonus
  const setBonus = getSetBonus(equipped);

  const jobMultiplier = JOB_DEFINITIONS[player.job].multiplier;
  
  return Math.floor(totalBase * jobMultiplier * setBonus.atkMult);
};

export const calculateBossStats = (targetFloor: number): { hp: number, gold: number, xp: number } => {
  const baseScaler = Math.max(1, targetFloor / 20); 
  // Adjusted scaling for 500-floor tiers and massive Rank S power
  const tierScaler = Math.pow(100.0, Math.floor((targetFloor - 1) / 500)); 
  const ultraHighScaler = targetFloor > 1000 ? (1 + Math.pow((targetFloor - 1000) / 200, 4)) : 1;
  const totalScaler = baseScaler * tierScaler * ultraHighScaler;

  // 500th floor Super Floor Boss Multiplier (100x HP/XP)
  const isSuperFloorBoss = targetFloor % 500 === 0;
  const superBossMultiplier = isSuperFloorBoss ? 100 : 1;

  // Difficulty Adjustments
  let difficultyMultiplier = 1.0;
  const tierCycle = targetFloor % 500;

  if (tierCycle === 100) {
      difficultyMultiplier = 0.8; // 20% weaker
  } else if (tierCycle === 200 || tierCycle === 300 || tierCycle === 400) {
      difficultyMultiplier = 3.0; // 200% stronger (+200% = 3x)
  } else if (tierCycle === 0) {
      // 500F, 1000F... (Applied on top of superBossMultiplier)
      difficultyMultiplier = 4.0; // 300% stronger (+300% = 4x)
  }

  if (targetFloor % 100 === 0) {
      const bossKey = ((targetFloor - 1) % 100 + 1) as keyof typeof BOSS_TYPES;
      const bossData = BOSS_TYPES[bossKey] || BOSS_TYPES[100];
      return {
          hp: Math.floor(bossData.hp * totalScaler * superBossMultiplier * difficultyMultiplier),
          gold: Math.floor(bossData.gold * totalScaler), 
          xp: Math.floor(bossData.xp * totalScaler * superBossMultiplier * difficultyMultiplier)
      };
  }

  const prevHundredFloor = Math.floor((targetFloor - 1) / 100) * 100;
  let baseHp = 0;
  if (prevHundredFloor > 0) {
      // Recursive call will handle previous multipliers, but we need raw accum
      // Simplified: Just take previous stats.
      const prevStats = calculateBossStats(prevHundredFloor);
      baseHp = prevStats.hp;
  }

  const bossKey = ((targetFloor - 1) % 100 + 1) as keyof typeof BOSS_TYPES;
  const bossData = BOSS_TYPES[bossKey] || BOSS_TYPES[100];
  
  return {
      hp: baseHp + Math.floor(bossData.hp * totalScaler),
      gold: Math.floor(bossData.gold * totalScaler),
      xp: Math.floor(bossData.xp * totalScaler)
  };
};

export const calculateReincarnationStones = (floor: number, multiplier: number): number => {
  if (floor < 100) return 0;
  const diff = Math.max(0, floor - 100);
  const stones = 100 + (diff * 10) + Math.floor(Math.pow(diff, 3) / 4);
  return Math.floor(stones * multiplier);
};

export const generateEnemy = (floor: number, upgrades?: ReincarnationUpgrades): Enemy => {
  const hpReductionLevel = upgrades?.enemyHpDown || 0;
  const reductionPercent = Math.min(99, (hpReductionLevel * (hpReductionLevel + 1)) / 2);
  const hpReductionMultiplier = 1 - (reductionPercent / 100);

  let rawHp, rawGold, rawXp, isBoss = false, name = '';

  if (floor % 10 === 0) {
    const stats = calculateBossStats(floor);
    const bossKey = ((floor - 1) % 100 + 1) as keyof typeof BOSS_TYPES;
    const bossData = BOSS_TYPES[bossKey] || BOSS_TYPES[100];
    
    // Multipliers for Floor Bosses (100th)
    if (floor % 100 === 0) {
        rawHp = stats.hp * 5;
        rawGold = stats.gold * 10;
        rawXp = stats.xp * 10;
    } else {
        rawHp = stats.hp;
        rawGold = stats.gold;
        rawXp = stats.xp;
    }
    isBoss = true;
    name = bossData.name;
    
    // Super Floor Boss Name Modifier (Log display mostly, UI handles "Super Floor Boss" label)
    if (floor % 500 === 0) {
        name = `真・${name}`;
    }

  } else {
    const prevBossFloor = Math.floor((floor - 1) / 10) * 10;
    let baseHp = 50; 
    let baseGold = 10;
    let baseXp = 20;

    if (prevBossFloor >= 10) {
        const bossStats = calculateBossStats(prevBossFloor);
        baseHp = bossStats.hp;
        baseGold = bossStats.gold;
        baseXp = bossStats.xp;
    }

    const offset = floor % 10;
    const ratio = 0.5 + (offset - 1) * 0.05;
    const typeIndex = Math.floor(((floor - 1) % 20) / 2); 
    const baseEnemy = ENEMY_TYPES[Math.min(typeIndex, ENEMY_TYPES.length - 1)];
    const loop = Math.floor((floor - 1) / 20) + 1;
    const nameSuffix = loop > 1 ? ` Lv${floor}` : '';

    if (floor < 10) {
        rawHp = baseEnemy.hp * loop * 1.2;
        rawGold = baseEnemy.gold * loop;
        rawXp = baseEnemy.xp * loop;
    } else {
        rawHp = baseHp * ratio;
        rawGold = baseGold * ratio * 0.2; 
        rawXp = baseXp * ratio * 0.2;     
    }
    name = `${baseEnemy.name}${nameSuffix}`;
  }

  const finalHp = Math.max(1, Math.floor(rawHp * hpReductionMultiplier));
  const finalGold = Math.floor(rawGold);
  const finalXp = Math.floor(rawXp);

  return {
    name,
    maxHp: finalHp,
    currentHp: finalHp,
    goldReward: finalGold,
    xpReward: finalXp,
    isBoss
  };
};

export const generateDrop = (
    floor: number, 
    upgrades: ReincarnationUpgrades, 
    dropPreferences: Partial<Record<EquipmentType, boolean>> | undefined,
    isBoss: boolean = false,
    forceDrop: boolean = false,
    allowARank: boolean = false // New param for 500th floor special drops
): Equipment | null => {
  if (!forceDrop && Math.random() > 0.3) return null;

  // Type Determination with Preferences
  let availableTypes = Object.values(EquipmentType);
  if ((upgrades.itemFilter || 0) > 0 && dropPreferences) {
      availableTypes = availableTypes.filter(type => dropPreferences[type]);
  }
  if (availableTypes.length === 0) return null;

  const type = availableTypes[Math.floor(Math.random() * availableTypes.length)];

  // Tier Calculation: 500 floors per Tier
  const tier = Math.max(1, Math.ceil(floor / 500));
  
  // Progress within current tier (0.0 to ~1.0)
  const progressInTier = ((floor - 1) % 500) / 499;

  // --- SPECIAL A-RANK DROP LOGIC ---
  if (allowARank) {
      // 0.1% Chance
      if (Math.random() < 0.001) {
          const nameList = EQUIP_NAMES[type];
          const nameIndex = (tier - 1) % nameList.length;
          const baseName = nameList[nameIndex];
          const basePower = (tier * tier * 5) + 10;
          
          const finalPower = calculateItemPower(basePower, EquipmentRank.A, 0);

          return {
              id: Math.random().toString(36).substring(7),
              name: baseName,
              type,
              basePower,
              power: finalPower,
              isEquipped: false,
              rank: EquipmentRank.A,
              tier,
              plus: 0
          };
      }
  }
  // ---------------------------------

  // Rank Determination: Max C rank. B/A/S disabled for drops.
  // Start (0%): D(98%), C(2%)
  // End (100%): D(40%), C(60%)
  const startRankWeights = { [EquipmentRank.D]: 98, [EquipmentRank.C]: 2 };
  const endRankWeights = { [EquipmentRank.D]: 40, [EquipmentRank.C]: 60 };

  const lerp = (start: number, end: number, p: number) => start + (end - start) * p;

  const weightD = lerp(startRankWeights[EquipmentRank.D], endRankWeights[EquipmentRank.D], progressInTier);
  const weightC = lerp(startRankWeights[EquipmentRank.C], endRankWeights[EquipmentRank.C], progressInTier);
  
  const totalWeight = weightD + weightC;
  const rankRand = Math.random() * totalWeight;

  let rank = EquipmentRank.D;
  if (rankRand < weightD) {
      rank = EquipmentRank.D;
  } else {
      rank = EquipmentRank.C;
  }

  // Name selection
  const nameList = EQUIP_NAMES[type];
  const nameIndex = (tier - 1) % nameList.length;
  const baseName = nameList[nameIndex];
  
  // Base Power Fixed by Tier
  const basePower = (tier * tier * 5) + 10;
  
  // Plus Value (0-2 for drops only, max 5 allowed via synthesis)
  const startPlusWeights = { 0: 90, 1: 9, 2: 1 };
  const endPlusWeights = { 0: 50, 1: 40, 2: 10 };

  const w0 = lerp(startPlusWeights[0], endPlusWeights[0], progressInTier);
  const w1 = lerp(startPlusWeights[1], endPlusWeights[1], progressInTier);
  const w2 = lerp(startPlusWeights[2], endPlusWeights[2], progressInTier);

  const totalPlusWeight = w0 + w1 + w2;
  const plusRand = Math.random() * totalPlusWeight;
  
  let plus = 0;
  if (plusRand < w0) plus = 0;
  else if (plusRand < w0 + w1) plus = 1;
  else plus = 2;

  // Calculate Final Power
  const finalPower = calculateItemPower(basePower, rank, plus);

  return {
    id: Math.random().toString(36).substring(7),
    name: baseName,
    type,
    basePower,
    power: finalPower,
    isEquipped: false,
    rank,
    tier,
    plus
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

export const performBulkSynthesis = (inventory: Equipment[], equipped: Partial<Record<EquipmentType, Equipment>>) => {
    // Deduplicate items based on ID to avoid double-counting equipped items (which exist in inventory array AND equipped object)
    const poolMap = new Map<string, Equipment>();
    inventory.forEach(item => poolMap.set(item.id, item));
    Object.values(equipped).forEach(item => {
        if (item) poolMap.set(item.id, item);
    });

    let currentPool = Array.from(poolMap.values());
    let logs: LogEntry[] = [];
    let changesMade = true;
    let loopCount = 0;

    while (changesMade && loopCount < 50) {
        changesMade = false;
        loopCount++;

        const groups: Record<string, Equipment[]> = {};
        // Grouping
        for (const item of currentPool) {
            const key = `${item.type}-${item.tier}-${item.name}-${item.rank}-${item.plus}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        }

        const nextPool: Equipment[] = [];

        for (const key in groups) {
            const items = groups[key];
            // Sort: Equipped items first so they become 'base'
            items.sort((a, b) => (a.isEquipped === b.isEquipped ? 0 : a.isEquipped ? -1 : 1));

            while (items.length >= 2) {
                const base = items[0];
                const mat = items[1];

                // Check if mergeable
                if (base.rank === EquipmentRank.S && base.plus >= 5) {
                     // Cannot merge S+5. Move to next pool.
                     nextPool.push(items.shift()!);
                     continue;
                }

                // Perform Merge
                items.shift(); // remove base
                items.shift(); // remove mat

                let newPlus = base.plus;
                let newRank = base.rank;
                let upgraded = false;

                if (base.plus < 5) {
                    newPlus = base.plus + 1;
                    upgraded = true;
                } else {
                    // Rank Up (+5 & +5 -> Rank Up +0)
                    const nextRank = getNextRank(base.rank);
                    if (nextRank) {
                        newRank = nextRank;
                        newPlus = 0;
                        upgraded = true;
                    } else {
                        // Should have been caught by S check, but safety
                        nextPool.push(base);
                        nextPool.push(mat);
                        continue;
                    }
                }

                if (upgraded) {
                    changesMade = true;
                    const newPower = calculateItemPower(base.basePower, newRank, newPlus);
                    const newItem: Equipment = {
                        ...base,
                        rank: newRank,
                        plus: newPlus,
                        power: newPower,
                        isEquipped: base.isEquipped || mat.isEquipped // Preserve equipped status
                    };
                    nextPool.push(newItem);
                }
            }

            // Push remaining
            while (items.length > 0) {
                nextPool.push(items.shift()!);
            }
        }
        currentPool = nextPool;
    }

    if (loopCount > 1) {
         logs.push(createLog(`一括強化を実行しました (連鎖数: ${loopCount})`, 'gain'));
    }

    // Reconstruct State
    const newInventory: Equipment[] = [];
    const newEquipped: Partial<Record<EquipmentType, Equipment>> = {};

    for (const item of currentPool) {
        if (item.isEquipped) {
            newEquipped[item.type] = item;
            
            // Fix: ensure inventory also tracks equipped items to prevent disappearing
            // But we follow the established pattern: Equipped map is primary source for battle, 
            // Inventory list is for display. The App expects inventory to contain equipped items too?
            // Actually App.tsx handleEquip puts equipped items in inventory with isEquipped=true.
            newInventory.push(item);
        } else {
            newInventory.push(item);
        }
    }
    
    return { inventory: newInventory, equipped: newEquipped, logs, loopCount };
};
