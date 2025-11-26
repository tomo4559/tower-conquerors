import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, Player, Enemy, Equipment, LogEntry, JobType, EquipmentType, EquipmentRank, MerchantUpgrades } from './types';
import { TICK_RATE_MS, ENEMY_TYPES, JOB_DEFINITIONS, BOSS_TIME_LIMIT, JOB_ORDER, MERCHANT_ITEMS } from './constants';
import { calculateTotalAttack, generateEnemy, generateDrop, createLog, calculateReincarnationStones, calculateUpgradeCost } from './utils/mechanics';
import { StatusHeader } from './components/panels/StatusHeader';
import { BattleView } from './components/panels/BattleView';
import { ControlTabs } from './components/panels/ControlTabs';
import { Modal } from './components/ui/Modal';

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
  reincarnationStones: 0,
  merchantUpgrades: {
    attackBonus: 0,
    critRate: 0,
    critDamage: 0,
    weaponBoost: 0,
    helmBoost: 0,
    armorBoost: 0,
    shieldBoost: 0,
  }
};

const INITIAL_STATE: GameState = {
  player: INITIAL_PLAYER,
  enemy: null,
  inventory: [],
  equipped: {},
  logs: [],
  bossTimer: null,
  autoBattleEnabled: true,
  hardMode: false,
};

const App: React.FC = () => {
  // State management
  const [gameState, setGameState] = useState<GameState>(() => {
    const saved = localStorage.getItem('tower_conquerors_save_v1');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migration for older saves
      if (!parsed.player.skillMastery) {
        parsed.player.skillMastery = {};
      }
      if (typeof parsed.player.reincarnationStones === 'undefined') {
        parsed.player.reincarnationStones = 0;
      }
      if (typeof parsed.hardMode === 'undefined') {
        parsed.hardMode = false;
      }
      if (!parsed.player.merchantUpgrades) {
        parsed.player.merchantUpgrades = { ...INITIAL_PLAYER.merchantUpgrades };
      }
      
      // Equipment Rank Migration
      if (parsed.inventory) {
        parsed.inventory.forEach((item: any) => {
          if (!item.rank) item.rank = EquipmentRank.D;
        });
      }
      if (parsed.equipped) {
        Object.values(parsed.equipped).forEach((item: any) => {
          if (item && !item.rank) item.rank = EquipmentRank.D;
        });
      }

      return parsed;
    }
    return INITIAL_STATE;
  });

  const [showReincarnationModal, setShowReincarnationModal] = useState(false);
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

  const toggleHardMode = () => {
    setGameState(prev => {
      const newState = !prev.hardMode;
      // Force enemy regeneration next tick to apply mode immediately
      return { 
        ...prev, 
        hardMode: newState, 
        enemy: null, 
        bossTimer: null,
        logs: [...prev.logs.slice(-49), createLog(newState ? '難易度x10モード: ON！敵が強くなりました！' : '難易度x10モード: OFF', 'info')]
      };
    });
  };

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
      // Requirement depends on the target job definition
      const requiredLv = JOB_DEFINITIONS[newJob].unlockLevel;
      const startJobLevel = Math.max(1, prev.player.jobLevel - requiredLv);

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

  // Merchant Logic
  const handleBuyUpgrade = (key: keyof MerchantUpgrades) => {
    setGameState(prev => {
      const upgradeItem = MERCHANT_ITEMS.find(i => i.key === key);
      if (!upgradeItem) return prev;

      const currentLevel = prev.player.merchantUpgrades[key] || 0;
      const cost = calculateUpgradeCost(upgradeItem.baseCost, currentLevel);

      if (prev.player.gold < cost) return prev; // Should be handled by UI disabled state too

      return {
        ...prev,
        player: {
          ...prev.player,
          gold: prev.player.gold - cost,
          merchantUpgrades: {
            ...prev.player.merchantUpgrades,
            [key]: currentLevel + 1
          }
        },
        logs: [...prev.logs.slice(-49), createLog(`${upgradeItem.name} を Lv.${currentLevel + 1} に強化しました`, 'gain')]
      };
    });
  };

  // Reincarnation Logic
  const handleReincarnateClick = () => {
    setShowReincarnationModal(true);
  };

  const confirmReincarnation = () => {
    const current = stateRef.current;
    const stonesToGain = calculateReincarnationStones(current.player.floor);
    const totalStones = current.player.reincarnationStones + stonesToGain;

    // Reset Game State but keep stones
    const newState: GameState = {
      ...INITIAL_STATE,
      player: {
        ...INITIAL_PLAYER,
        reincarnationStones: totalStones,
        // Merchant upgrades reset on reincarnation (they cost gold, and gold resets)
        merchantUpgrades: { ...INITIAL_PLAYER.merchantUpgrades } 
      },
      // Preserve hard mode setting? Maybe reset to false for safety
      hardMode: false,
      logs: [createLog(`転生しました！ ${stonesToGain}個の転生石を獲得。新たな冒険の始まりです！`, 'boss')]
    };

    setGameState(newState);
    setShowReincarnationModal(false);
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
        enemy = generateEnemy(current.player.floor, current.hardMode);
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

        // Critical Hit Logic
        // Base Crit 5% + Merchant Bonus
        const baseCritRate = 0.05;
        const merchantCritRate = (current.player.merchantUpgrades?.critRate || 0) * 0.01;
        const finalCritRate = baseCritRate + merchantCritRate;
        
        let isCrit = false;
        let critMultiplier = 1.0;

        if (Math.random() < finalCritRate) {
            isCrit = true;
            // Base Crit Damage 150% + Merchant Bonus
            const baseCritDmg = 1.5;
            const merchantCritDmg = (current.player.merchantUpgrades?.critDamage || 0) * 0.1;
            critMultiplier = baseCritDmg + merchantCritDmg;
        }

        // Random variance 0.8 - 1.2
        const variance = 0.8 + Math.random() * 0.4;
        
        // Final Damage
        const damage = Math.floor(totalAttack * totalDamageMult * critMultiplier * variance);
        
        const newEnemyHp = Math.max(0, enemy.currentHp - damage);
        updates.enemy = { ...enemy, currentHp: newEnemyHp };
        
        // Update player if mastery changed
        if (triggeredSkills.length > 0) {
            updates.player = { ...current.player, skillMastery: newSkillMastery };
        }
        
        // Log damage
        let msg = `${enemy.name} に ${damage} ダメージ`;
        let type: LogEntry['type'] = 'damage';
        
        if (isCrit) {
            msg += ' (クリティカル！)';
            type = 'crit';
        }
        
        if (triggeredSkills.length > 0) {
            msg = `${triggeredSkills.join('、')} 発動！ ` + msg;
            // Keep damage type unless crit overrides visual priority? Crit yellow is nice.
        }
        
        logQueue.push(createLog(msg, type));

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
             // Pass enemy.isBoss to drop generator for rank logic
             const droppedItem = generateDrop(newPlayer.floor - 1, enemy.isBoss); 
             if (droppedItem) {
                 updates.inventory = [droppedItem, ...current.inventory];
                 // Show rank in log if it's special
                 const rankMsg = droppedItem.rank === EquipmentRank.D ? '' : ` [Rank:${droppedItem.rank}]`;
                 logQueue.push(createLog(`レアアイテム: ${droppedItem.name}${rankMsg} を手に入れた！`, 'info'));
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
  
  const nextJobIndex = JOB_ORDER.indexOf(gameState.player.job) + 1;
  const nextJob = nextJobIndex < JOB_ORDER.length ? JOB_ORDER[nextJobIndex] : null;
  const requiredLv = nextJob ? JOB_DEFINITIONS[nextJob].unlockLevel : 0;
  const canPromote = nextJob ? gameState.player.jobLevel >= requiredLv : false;

  const stonesToGain = calculateReincarnationStones(gameState.player.floor);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 max-w-md mx-auto shadow-2xl overflow-hidden flex flex-col relative">
       <StatusHeader 
         player={gameState.player} 
         totalAttack={totalAttack} 
         hardMode={gameState.hardMode}
         onToggleHardMode={toggleHardMode}
         onReincarnateClick={handleReincarnateClick}
        />
       
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
         onBuyUpgrade={handleBuyUpgrade}
         canPromote={canPromote}
         nextJob={nextJob}
       />

       <Modal 
         isOpen={showReincarnationModal} 
         title="転生の儀" 
         onConfirm={confirmReincarnation}
         onCancel={() => setShowReincarnationModal(false)}
         confirmLabel="転生する"
       >
         <div className="space-y-3 text-sm">
           <p className="text-purple-300 font-bold">
             {stonesToGain}個の転生石を獲得して1階に戻ります。
           </p>
           <div className="bg-slate-800 p-3 rounded border border-slate-700 text-slate-400">
             <ul className="list-disc pl-4 space-y-1">
               <li>すべてのステータスが初期化されます</li>
               <li>装備、ゴールド、職業レベルは失われます</li>
               <li>商人での強化もリセットされます</li>
               <li>転生石は次回に引き継がれます</li>
             </ul>
           </div>
           <p className="text-center font-bold mt-2">よろしいですか？</p>
         </div>
       </Modal>
    </div>
  );
};

export default App;