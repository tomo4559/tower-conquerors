import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, Player, LogEntry, JobType, EquipmentRank, EquipmentType } from '../types';
import { createLog } from '../utils/mechanics';
import { BOSS_TIME_LIMIT } from '../constants';

export const getInitialPlayer = (): Player => ({
  level: 1,
  currentXp: 0,
  requiredXp: 40,
  job: JobType.NOVICE,
  jobLevel: 1,
  gold: 0,
  floor: 1,
  maxFloorReached: 1,
  baseAttack: 10,
  maxHp: 100,
  skillMastery: {},
  reincarnationStones: 0,
  merchantUpgrades: {
    attackBonus: 0,
    critRate: 0,
    critDamage: 0,
    giantKilling: 0,
    weaponBoost: 0,
    helmBoost: 0,
    armorBoost: 0,
    shieldBoost: 0,
  },
  reincarnationUpgrades: {
    autoPromote: 0,
    autoEquip: 0,
    autoMerchant: 0,
    itemFilter: 0,
    farming: 0,
    autoEnhance: 0,
    xpBoost: 0,
    goldBoost: 0,
    stoneBoost: 0,
    startFloor: 0,
    baseAttackBoost: 0,
    enemyHpDown: 0,
    skillDamageBoost: 0,
    priceDiscount: 0,
    concentration: 0,
    vitalSpot: 0,
    hyperSpeed: 0,
    awakening: 0,
    itemPersistence: 0,
  },
  autoMerchantKeys: {},
  dropPreferences: {
      [EquipmentType.WEAPON]: true,
      [EquipmentType.HELM]: true,
      [EquipmentType.ARMOR]: true,
      [EquipmentType.SHIELD]: true,
  }
});

export const getInitialState = (): GameState => ({
  player: getInitialPlayer(),
  enemy: null,
  inventory: [],
  equipped: {},
  logs: [],
  bossTimer: null,
  autoBattleEnabled: true,
  activeSkills: {
    concentration: { isActive: false, endTime: 0, cooldownEnd: 0, duration: 0 },
    vitalSpot: { isActive: false, endTime: 0, cooldownEnd: 0, duration: 0 },
    hyperSpeed: { isActive: false, endTime: 0, cooldownEnd: 0, duration: 0 },
    awakening: { isActive: false, endTime: 0, cooldownEnd: 0, duration: 0 }
  },
  farmingMode: null,
  rareDropItem: null
});

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>(() => {
    const saved = localStorage.getItem('tower_conquerors_save_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migrations
        if (!parsed.player.skillMastery) parsed.player.skillMastery = {};
        if (typeof parsed.player.reincarnationStones === 'undefined') parsed.player.reincarnationStones = 0;
        
        const initialPlayer = getInitialPlayer();

        if (!parsed.player.merchantUpgrades) parsed.player.merchantUpgrades = { ...initialPlayer.merchantUpgrades };
        if (!parsed.player.reincarnationUpgrades) parsed.player.reincarnationUpgrades = { ...initialPlayer.reincarnationUpgrades };
        if (typeof parsed.player.maxFloorReached === 'undefined') parsed.player.maxFloorReached = parsed.player.floor || 1;
        if (!parsed.player.autoMerchantKeys) parsed.player.autoMerchantKeys = {};
        if (!parsed.activeSkills) parsed.activeSkills = { ...getInitialState().activeSkills };
        if (typeof parsed.farmingMode === 'undefined') parsed.farmingMode = null;
        if (!parsed.player.dropPreferences) parsed.player.dropPreferences = { ...initialPlayer.dropPreferences };
        if (typeof parsed.rareDropItem === 'undefined') parsed.rareDropItem = null;
        
        // Safe check for new keys in existing save
        const requiredReincarnationKeys = Object.keys(initialPlayer.reincarnationUpgrades);
        requiredReincarnationKeys.forEach(key => {
            // @ts-ignore
            if (typeof parsed.player.reincarnationUpgrades[key] === 'undefined') {
                // @ts-ignore
                parsed.player.reincarnationUpgrades[key] = 0;
            }
        });
        
        // Ensure giantKilling exists in merchantUpgrades
        if (typeof parsed.player.merchantUpgrades.giantKilling === 'undefined') {
            parsed.player.merchantUpgrades.giantKilling = 0;
        }
        
        // Ensure activeSkills structure
        ['concentration', 'vitalSpot', 'hyperSpeed', 'awakening'].forEach(skill => {
             // @ts-ignore
             if (!parsed.activeSkills[skill]) {
                 // @ts-ignore
                 parsed.activeSkills[skill] = { isActive: false, endTime: 0, cooldownEnd: 0, duration: 0 };
             }
        });

        // Equipment Rank Migration
        if (parsed.inventory) {
          parsed.inventory.forEach((item: any) => { if (!item.rank) item.rank = EquipmentRank.D; });
        }
        if (parsed.equipped) {
          Object.values(parsed.equipped).forEach((item: any) => { if (item && !item.rank) item.rank = EquipmentRank.D; });
        }
        return parsed;
      } catch (e) {
        console.error("Failed to load save", e);
        return getInitialState();
      }
    }
    return getInitialState();
  });

  const stateRef = useRef(gameState);

  useEffect(() => {
    stateRef.current = gameState;
    localStorage.setItem('tower_conquerors_save_v1', JSON.stringify(gameState));
  }, [gameState]);

  const addLog = useCallback((message: string, type: LogEntry['type']) => {
    setGameState(prev => ({
      ...prev,
      logs: [...prev.logs.slice(-49), createLog(message, type)]
    }));
  }, []);

  return { 
    gameState, 
    setGameState, 
    stateRef, 
    addLog,
    getInitialPlayer, 
    INITIAL_STATE: getInitialState()
  };
};