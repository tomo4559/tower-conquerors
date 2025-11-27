import { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, Player, LogEntry, JobType, EquipmentRank } from '../types';
import { createLog } from '../utils/mechanics';
import { BOSS_TIME_LIMIT } from '../constants';

const INITIAL_PLAYER: Player = {
  level: 1,
  currentXp: 0,
  requiredXp: 50,
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
    weaponBoost: 0,
    helmBoost: 0,
    armorBoost: 0,
    shieldBoost: 0,
  },
  reincarnationUpgrades: {
    autoPromote: 0,
    autoEquip: 0,
    xpBoost: 0,
    goldBoost: 0,
    stoneBoost: 0,
    startFloor: 0,
    equipAProb: 0,
    equipSProb: 0,
    baseAttackBoost: 0,
    prob_slash: 0,
    prob_power_attack: 0,
    prob_holy_strike: 0,
    prob_divine: 0,
    prob_meteor: 0,
    prob_galaxy: 0,
    prob_void: 0,
    prob_god_blow: 0,
    prob_infinity: 0,
    prob_legend: 0,
  }
};

export const INITIAL_STATE: GameState = {
  player: INITIAL_PLAYER,
  enemy: null,
  inventory: [],
  equipped: {},
  logs: [],
  bossTimer: null,
  autoBattleEnabled: true,
  hardMode: false,
};

export const useGameState = () => {
  const [gameState, setGameState] = useState<GameState>(() => {
    const saved = localStorage.getItem('tower_conquerors_save_v1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Migrations
        if (!parsed.player.skillMastery) parsed.player.skillMastery = {};
        if (typeof parsed.player.reincarnationStones === 'undefined') parsed.player.reincarnationStones = 0;
        if (typeof parsed.hardMode === 'undefined') parsed.hardMode = false;
        if (!parsed.player.merchantUpgrades) parsed.player.merchantUpgrades = { ...INITIAL_PLAYER.merchantUpgrades };
        if (!parsed.player.reincarnationUpgrades) parsed.player.reincarnationUpgrades = { ...INITIAL_PLAYER.reincarnationUpgrades };
        if (typeof parsed.player.maxFloorReached === 'undefined') parsed.player.maxFloorReached = parsed.player.floor || 1;
        
        // Safe check for new keys in existing save
        const requiredReincarnationKeys = Object.keys(INITIAL_PLAYER.reincarnationUpgrades);
        requiredReincarnationKeys.forEach(key => {
            if (typeof parsed.player.reincarnationUpgrades[key] === 'undefined') {
                parsed.player.reincarnationUpgrades[key] = 0;
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
        return INITIAL_STATE;
      }
    }
    return INITIAL_STATE;
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
    INITIAL_PLAYER,
    INITIAL_STATE
  };
};