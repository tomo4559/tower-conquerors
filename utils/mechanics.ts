import { ENEMY_TYPES, BOSS_TYPES, JOB_DEFINITIONS, EQUIP_NAMES } from '../constants';
import { Player, Enemy, Equipment, EquipmentType, JobType, LogEntry } from '../types';

export const calculateTotalAttack = (player: Player, equipped: Partial<Record<EquipmentType, Equipment>>): number => {
  let equipmentBonus = 0;
  Object.values(equipped).forEach(item => {
    if (item) equipmentBonus += item.power;
  });

  const jobMultiplier = JOB_DEFINITIONS[player.job].multiplier;
  return Math.floor((player.baseAttack + equipmentBonus) * jobMultiplier);
};

export const generateEnemy = (floor: number): Enemy => {
  if (floor % 10 === 0) {
    const bossData = BOSS_TYPES[floor as keyof typeof BOSS_TYPES] || BOSS_TYPES[100]; // Fallback to last boss
    
    // Base linear scaler (roughly doubles stats by floor 100 compared to floor 50)
    const baseScaler = Math.max(1, floor / 50);

    // Tier scaler: Multiplies strength by 2 for every 100 floors passed
    // 1-100: 2^0 = 1x
    // 101-200: 2^1 = 2x
    // 201-300: 2^2 = 4x
    // 301-400: 2^3 = 8x
    const tierScaler = Math.pow(2, Math.floor((floor - 1) / 100));
    
    const totalScaler = baseScaler * tierScaler;

    return {
      name: bossData.name,
      maxHp: Math.floor(bossData.hp * totalScaler),
      currentHp: Math.floor(bossData.hp * totalScaler),
      goldReward: Math.floor(bossData.gold * totalScaler),
      xpReward: Math.floor(bossData.xp * totalScaler),
      isBoss: true
    };
  }

  // Cyclical enemies every 20 floors or so, but scaling
  const typeIndex = Math.floor(((floor - 1) % 20) / 2); 
  const baseEnemy = ENEMY_TYPES[Math.min(typeIndex, ENEMY_TYPES.length - 1)];
  
  // Scale based on loops
  const loop = Math.floor((floor - 1) / 20) + 1;
  
  return {
    name: `${baseEnemy.name} Lv${floor}`,
    maxHp: Math.floor(baseEnemy.hp * loop * 1.2),
    currentHp: Math.floor(baseEnemy.hp * loop * 1.2),
    goldReward: Math.floor(baseEnemy.gold * loop),
    xpReward: Math.floor(baseEnemy.xp * loop),
    isBoss: false
  };
};

export const generateDrop = (floor: number): Equipment | null => {
  // 30% chance to drop
  if (Math.random() > 0.3) return null;

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
  
  // Final power calculation: Base * Quality * Bonus + Flat Bonus (to ensure +1 is always > +0 even at low levels)
  const finalPower = Math.floor((basePower * quality * plusMultiplier) + plus);

  const displayName = plus > 0 ? `${name} +${plus}` : name;

  return {
    id: Math.random().toString(36).substring(7),
    name: displayName,
    type,
    power: finalPower,
    isEquipped: false
  };
};

export const createLog = (message: string, type: LogEntry['type']): LogEntry => ({
  id: Math.random().toString(36).substring(7),
  message,
  type,
  timestamp: Date.now()
});