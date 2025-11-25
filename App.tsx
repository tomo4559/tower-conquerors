import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, Player, Enemy, Equipment, LogEntry, JobType, EquipmentType } from './types';
import { TICK_RATE_MS, ENEMY_TYPES, JOB_DEFINITIONS, BOSS_TIME_LIMIT } from './constants';
import { calculateTotalAttack, generateEnemy, generateDrop, createLog } from './utils/mechanics';
import { StatusHeader } from './components/panels/StatusHeader';
import { BattleView } from './components/panels/BattleView';
import { ControlTabs } from './components/panels/ControlTabs';

// Initial State
const INITIAL_PLAYER: Player = {
  level: 1,
  currentXp: 0,
  requiredXp: 50, // Reduced from 100 for faster early game
  job: JobType.NOVICE,
  jobLevel: 1,
  gold: 0,
  floor: 1,
  baseAttack: 10,
  maxHp: 100,
  skillMastery: {}, // Initialize empty
};

const INITIAL_STATE: GameState = {
  player: INITIAL_PLAYER,
  enemy: null,
  inventory: [],
  equipped: {},
  logs: [],
  bossTimer: null,
  autoBattleEnabled: true,
};

const App: React.FC = () => {
  // State management
  const [gameState, setGameState] = useState<GameState>(() => {
    const saved = localStorage.getItem('tower_conquerors_save_v1');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migration for older saves that might miss skillMastery
      if (!parsed.player.skillMastery) {
        parsed.player.skillMastery = {};
      }
      return parsed;
    }
    return INITIAL_STATE;
  });

  const stateRef = useRef(gameState); // Ref to access latest state in interval without dependencies

  // Sync ref
  useEffect(() => {
    stateRef.current = gameState;
    localStorage.setItem('tower_conquerors_save_v1', JSON.stringify(gameState));
  }, [gameState]);

  // Actions
  const addLog = useCallback((message: string, type: LogEntry['type']) => {
    setGameState(prev => ({
      ...prev,
      logs: [...prev.logs.slice(-49), createLog(message, type)] // Keep last 50
    }));
  }, []);

  const handleEquip = (item: Equipment) => {
    setGameState(prev => {
      // Remove currently equipped of same type if any
      const newInventory = prev.inventory.map(i => 
        i.type === item.type ? { ...i, isEquipped: false } : i
      );
      
      // Equip new item
      const itemIndex = newInventory.findIndex(i => i.id === item.id);
      if (itemIndex > -1) {
        newInventory[itemIndex].isEquipped = true;
      }

      return {
        ...prev,
        inventory: newInventory,
        equipped: {
          ...prev.equipped,
          [item.type]: item
        }
      };
    });
    addLog(`${item.name} を装備しました`, 'info');
  };

  const handleJobChange = (newJob: JobType) => {
    setGameState(prev => {
      // Carry over levels logic
      // Requirement is Lv 20.
      // If current is 22, start at 2.
      // Formula: Math.max(1, prev.player.jobLevel - 20)
      const startJobLevel = Math.max(1, prev.player.jobLevel - 20);

      return {
        ...prev,
        player: {
          ...prev.player,
          job: newJob,
          jobLevel: startJobLevel
        }
      };
    });
    addLog(`${newJob} に転職しました！`, 'gain');
  };

  // Game Loop
  useEffect(() => {
    const interval = setInterval(() => {
      const current = stateRef.current;
      if (!current.autoBattleEnabled) return;

      let updates: Partial<GameState> = {};
      let logQueue: LogEntry[] = [];

      // 1. Ensure Enemy Exists
      let enemy = current.enemy;
      if (!enemy || enemy.currentHp <= 0) {
        // If boss failed (timer ran out), we might need to reset floor logic here
        // But simplifying: next enemy is generated immediately
        enemy = generateEnemy(current.player.floor);
        updates.enemy = enemy;
        
        if (enemy.isBoss) {
          updates.bossTimer = BOSS_TIME_LIMIT;
          logQueue.push(createLog(`${current.player.floor}階のボス ${enemy.name} が現れた！`, 'boss'));
        } else {
          updates.bossTimer = null; // Ensure timer is clear for non-boss
          // logQueue.push(createLog(`${enemy.name} が現れた`, 'info')); // Too spammy
        }
      }

      // 2. Battle Logic
      if (enemy && enemy.currentHp > 0) {
        // Boss Timer Check
        if (enemy.isBoss && current.bossTimer !== null) {
            if (current.bossTimer <= 0) {
                // Fail
                logQueue.push(createLog(`時間切れ！ ${enemy.name} に敗北しました...`, 'danger'));
                updates.enemy = null;
                updates.bossTimer = null;
                updates.player = {
                    ...current.player,
                    floor: Math.max(1, current.player.floor - 1)
                };
                setGameState(prev => ({ ...prev, ...updates, logs: [...prev.logs, ...logQueue].slice(-50) }));
                return; // End tick
            } else {
                updates.bossTimer = current.bossTimer - (TICK_RATE_MS / 1000);
            }
        }

        // Player Attacks
        const totalAttack = calculateTotalAttack(current.player, current.equipped);
        
        // Skill Check
        const jobData = JOB_DEFINITIONS[current.player.job];
        let totalDamageMult = 0;
        let triggeredSkills: string[] = [];
        let newSkillMastery = { ...current.player.skillMastery };

        // Check ALL skills (allow multiple to trigger)
        for (const skill of jobData.skills) {
           const mastery = newSkillMastery[skill.name] || { level: 0, count: 0 };
           const effectiveRate = skill.triggerRate + (mastery.level * 0.01); // +1% per level

           if (Math.random() < effectiveRate) {
             totalDamageMult += skill.damageMultiplier;
             triggeredSkills.push(skill.name);
             
             // Update Mastery
             let nextCount = mastery.count + 1;
             let nextLevel = mastery.level;
             
             if (nextCount >= 10) {
                 nextCount = 0;
                 nextLevel += 1;
                 logQueue.push(createLog(`${skill.name}のレベルが ${nextLevel} に上がった！ (発動率+1%)`, 'info'));
             }
             
             newSkillMastery[skill.name] = { level: nextLevel, count: nextCount };
           }
        }

        // If no skills triggered, use base damage (1.0)
        if (triggeredSkills.length === 0) {
            totalDamageMult = 1.0;
        }

        // Random variance 0.8 - 1.2
        const variance = 0.8 + Math.random() * 0.4;
        const damage = Math.floor(totalAttack * totalDamageMult * variance);
        
        const newEnemyHp = Math.max(0, enemy.currentHp - damage);
        updates.enemy = { ...enemy, currentHp: newEnemyHp };
        
        // Update player if mastery changed
        if (triggeredSkills.length > 0) {
            updates.player = { ...current.player, skillMastery: newSkillMastery };
            const skillNames = triggeredSkills.join('、');
            logQueue.push(createLog(`${skillNames} 発動！ ${enemy.name} に ${damage} ダメージ`, 'damage'));
        } else {
            logQueue.push(createLog(`${enemy.name} に ${damage} ダメージ`, 'damage'));
        }

        // 3. Enemy Defeated Logic
        if (newEnemyHp <= 0) {
             logQueue.push(createLog(`${enemy.name} を倒した！`, 'gain'));
             logQueue.push(createLog(`${enemy.goldReward}G と ${enemy.xpReward}EXP を獲得`, 'gain'));

             // Rewards
             let newPlayer = updates.player || { ...current.player };
             newPlayer.gold += enemy.goldReward;
             newPlayer.currentXp += enemy.xpReward;
             
             // Level Up Loop
             while (newPlayer.currentXp >= newPlayer.requiredXp) {
                 newPlayer.currentXp -= newPlayer.requiredXp;
                 newPlayer.level += 1;
                 newPlayer.jobLevel += 1; // Job levels up with player
                 newPlayer.baseAttack += 2; // Stat growth
                 // Easier leveling curve: 50 * level instead of 100 * level
                 newPlayer.requiredXp = 50 * newPlayer.level;
                 logQueue.push(createLog(`レベルアップ！ Lv.${newPlayer.level} になった！ (Job Lv.${newPlayer.jobLevel})`, 'gain'));
             }

             // Advance Floor
             newPlayer.floor += 1;
             updates.player = newPlayer;

             // Drops
             const droppedItem = generateDrop(newPlayer.floor - 1); // Drop from the floor we just beat
             if (droppedItem) {
                 updates.inventory = [droppedItem, ...current.inventory];
                 logQueue.push(createLog(`レアアイテム: ${droppedItem.name} を手に入れた！`, 'info'));
             }

             // Clear enemy for next tick regeneration
             // Note: We leave updates.enemy as the dead enemy for this render frame so UI shows 0 HP
             // Next tick will generate new enemy
        }
      }

      // Apply Updates
      setGameState(prev => {
        // Merge logs
        const mergedLogs = [...prev.logs, ...logQueue].slice(-50);
        
        return {
            ...prev,
            ...updates,
            logs: mergedLogs
        };
      });

    }, TICK_RATE_MS);

    return () => clearInterval(interval);
  }, []);

  const totalAttack = calculateTotalAttack(gameState.player, gameState.equipped);
  const canPromote = gameState.player.jobLevel >= 20;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 max-w-md mx-auto shadow-2xl overflow-hidden flex flex-col">
       <StatusHeader player={gameState.player} totalAttack={totalAttack} />
       
       <div className="flex-1 overflow-y-auto">
          <BattleView 
            enemy={gameState.enemy} 
            player={gameState.player} 
            bossTimer={gameState.bossTimer}
          />
       </div>

       <ControlTabs 
         player={gameState.player}
         inventory={gameState.inventory}
         equipped={gameState.equipped}
         logs={gameState.logs}
         onEquip={handleEquip}
         onJobChange={handleJobChange}
         canPromote={canPromote}
       />
    </div>
  );
};

export default App;