import React, { useEffect } from 'react';
import { GameState, LogEntry, ReincarnationUpgrades, JobType } from '../types';
import { TICK_RATE_MS, BOSS_TIME_LIMIT, JOB_DEFINITIONS, SKILL_REINCARNATION_MAP, JOB_ORDER } from '../constants';
import { calculateTotalAttack, generateEnemy, generateDrop, createLog, formatNumber } from '../utils/mechanics';

interface UseGameLoopProps {
  stateRef: React.MutableRefObject<GameState>;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  addLog: (message: string, type: LogEntry['type']) => void;
  gameSpeed: number;
}

export const useGameLoop = ({ stateRef, setGameState, addLog, gameSpeed }: UseGameLoopProps) => {
  useEffect(() => {
    const interval = setInterval(() => {
      const current = stateRef.current;
      if (!current.autoBattleEnabled) return;

      // --- AUTO PROMOTE LOGIC ---
      const autoPromoteLevel = current.player.reincarnationUpgrades?.autoPromote || 0;
      if (autoPromoteLevel > 0) {
        const currentJobIndex = JOB_ORDER.indexOf(current.player.job);
        const nextJob = currentJobIndex < JOB_ORDER.length - 1 ? JOB_ORDER[currentJobIndex + 1] : null;
        
        // Check if next job exists, if we have unlocked auto-promote for that tier, and if we meet level requirements
        if (nextJob && autoPromoteLevel >= (currentJobIndex + 1)) {
            const requiredLevel = JOB_DEFINITIONS[nextJob].unlockLevel;
            if (current.player.jobLevel >= requiredLevel) {
                 const excessLevels = Math.max(0, current.player.jobLevel - requiredLevel);
                 const startLevel = 1 + excessLevels;
                 
                 setGameState(prev => ({
                    ...prev,
                    player: {
                        ...prev.player,
                        job: nextJob,
                        jobLevel: startLevel
                    },
                    logs: [...prev.logs.slice(-49), createLog(`[自動] ${nextJob}に転職しました！`, 'gain')]
                 }));
                 // Skip the rest of this tick to allow state to settle
                 return;
            }
        }
      }

      // 1. Generate Enemy if needed
      let enemy = current.enemy;
      if (!enemy) {
        enemy = generateEnemy(current.player.floor, current.hardMode);
        setGameState(prev => ({ 
          ...prev, 
          enemy, 
          bossTimer: enemy?.isBoss ? BOSS_TIME_LIMIT : null,
          logs: [...prev.logs.slice(-49), createLog(`${enemy?.name}が現れた！ (HP: ${enemy?.maxHp})`, 'info')]
        }));
        return;
      }

      // 2. Boss Timer Logic
      if (enemy.isBoss && current.bossTimer !== null) {
        // Adjust timer reduction based on speed to keep "real seconds" consistent if we want to speed up battle?
        // OR simply speed up the clock. Usually x2 speed means 1 second passes in 0.5s real time.
        // So we reduce the timer by 1 'game second'.
        const newTimer = current.bossTimer - 1; 
        if (newTimer <= 0) {
          setGameState(prev => ({
            ...prev,
            player: { ...prev.player, floor: 1 },
            enemy: null, 
            bossTimer: null,
            logs: [...prev.logs.slice(-49), createLog(`時間切れ！ボス戦に失敗しました。1階に戻ります...`, 'danger')]
          }));
          return;
        }
        setGameState(prev => ({ ...prev, bossTimer: newTimer }));
      }

      // 3. Combat Logic
      const totalAttack = calculateTotalAttack(current.player, current.equipped);
      const jobData = JOB_DEFINITIONS[current.player.job];
      let damageMultiplier = 0;
      let triggeredSkills: string[] = [];
      let didCrit = false;

      // Skill Check
      jobData.skills.forEach(skill => {
         const mastery = current.player.skillMastery[skill.name] || { level: 0, count: 0 };
         
         // Get specific skill boost from reincarnation
         const skillKey = SKILL_REINCARNATION_MAP[skill.name];
         const reincarnationBonus = skillKey 
            ? (current.player.reincarnationUpgrades[skillKey] as number || 0) * 0.01 
            : 0;

         const effectiveRate = skill.triggerRate + (mastery.level * 0.01) + reincarnationBonus;
         
         if (Math.random() < effectiveRate) {
           damageMultiplier += skill.damageMultiplier;
           triggeredSkills.push(skill.name);
           
           // Update Mastery
           const newCount = mastery.count + 1;
           const newMastery = newCount >= 10 
             ? { level: mastery.level + 1, count: 0 } 
             : { level: mastery.level, count: newCount };
            
           setGameState(prev => ({
             ...prev,
             player: {
               ...prev.player,
               skillMastery: {
                 ...prev.player.skillMastery,
                 [skill.name]: newMastery
               }
             }
           }));
           
           if (newCount >= 10) {
             // Use generic addLog here since skill mastery update is separate from main battle loop state often
             addLog(`${skill.name}のレベルが上がった！(Lv.${mastery.level + 1}) 発動率UP！`, 'gain');
           }
         }
      });

      if (damageMultiplier === 0) damageMultiplier = 1.0;

      // Crit Check
      const critRate = (current.player.merchantUpgrades?.critRate || 0) * 0.01;
      if (Math.random() < critRate) {
        didCrit = true;
        const critDmgBonus = (current.player.merchantUpgrades?.critDamage || 0) * 0.10;
        damageMultiplier *= (1.5 + critDmgBonus);
      }

      // Damage Calculation
      const variance = 0.8 + Math.random() * 0.4;
      const damage = Math.floor(totalAttack * damageMultiplier * variance);
      const newEnemyHp = Math.max(0, enemy.currentHp - damage);
      
      let attackMsg = '';
      if (triggeredSkills.length > 0) {
        attackMsg = `${triggeredSkills.join('と')}が発動！ `;
      } else {
        attackMsg = '攻撃！ ';
      }
      if (didCrit) attackMsg += 'クリティカル！ ';
      attackMsg += `敵に ${formatNumber(damage)} のダメージを与えた！`;

      // Construct Damage Log Object
      const damageLog = createLog(attackMsg, didCrit ? 'crit' : 'damage');

      if (newEnemyHp <= 0) {
        // --- ENEMY DEFEATED ---
        const xpBoost = 1 + ((current.player.reincarnationUpgrades?.xpBoost || 0) * 0.01);
        const goldBoost = 1 + ((current.player.reincarnationUpgrades?.goldBoost || 0) * 0.01);

        const earnedXp = Math.floor(enemy.xpReward * xpBoost);
        const earnedGold = Math.floor(enemy.goldReward * goldBoost);
        
        const drop = generateDrop(current.player.floor, current.player.reincarnationUpgrades, enemy.isBoss);

        let newPlayer = { ...current.player };
        newPlayer.currentXp += earnedXp;
        newPlayer.gold += earnedGold;
        
        let logMsg = `${enemy.name}を倒した！ ${earnedXp} EXPと ${earnedGold} Gを獲得。`;
        
        // Level Up Logic
        let leveledUp = false;
        while (newPlayer.currentXp >= newPlayer.requiredXp) {
          newPlayer.level++;
          newPlayer.jobLevel++; // Increment Job Level
          newPlayer.currentXp -= newPlayer.requiredXp;
          newPlayer.requiredXp = 50 * newPlayer.level;
          newPlayer.baseAttack += 2;
          newPlayer.maxHp += 10;
          leveledUp = true;
        }

        if (leveledUp) {
          logMsg += ` レベルアップ！(Lv.${newPlayer.level})`;
        }

        // --- ITEM DROP & AUTO EQUIP LOGIC ---
        const newInventory = [...current.inventory];
        let newEquipped = { ...current.equipped };
        let dropMsg = '';

        if (drop) {
           const autoEquipEnabled = (current.player.reincarnationUpgrades?.autoEquip || 0) > 0;
           let autoEquipped = false;

           if (autoEquipEnabled) {
               const currentEquip = newEquipped[drop.type];
               const currentPower = currentEquip ? currentEquip.power : 0;
               if (drop.power > currentPower) {
                   // Add old item to inventory (marked as not equipped) if it existed
                   if (currentEquip) {
                       newInventory.unshift({ ...currentEquip, isEquipped: false });
                   }
                   
                   // Equip new item
                   newEquipped[drop.type] = { ...drop, isEquipped: true };
                   // Add new item to inventory list as equipped for visibility
                   newInventory.unshift({ ...drop, isEquipped: true });
                   
                   dropMsg = ` 戦利品: ${drop.name} (自動装備！)`;
                   autoEquipped = true;
               }
           }

           if (!autoEquipped) {
               newInventory.unshift(drop);
               dropMsg = ` 戦利品: ${drop.name}`;
           }

           // Limit inventory size
           if (newInventory.length > 50) newInventory.pop(); 
        }

        // --- IMMEDIATE RESPAWN ---
        const nextFloor = current.player.floor + 1;
        // UPDATE MAX FLOOR
        newPlayer.maxFloorReached = Math.max(newPlayer.maxFloorReached || 1, nextFloor);

        const nextEnemy = generateEnemy(nextFloor, current.hardMode);
        const spawnLogMsg = `${nextEnemy.name}が現れた！ (HP: ${nextEnemy.maxHp})`;
        const spawnLog = createLog(spawnLogMsg, 'info');

        // Bundle Logs: Damage -> Kill -> Drop -> Spawn
        const newLogs = [damageLog, createLog(logMsg, 'gain')];
        if (dropMsg) newLogs.push(createLog(dropMsg, 'gain'));
        newLogs.push(spawnLog);

        setGameState(prev => ({
          ...prev,
          player: { ...newPlayer, floor: nextFloor },
          enemy: nextEnemy,
          bossTimer: nextEnemy.isBoss ? BOSS_TIME_LIMIT : null,
          inventory: newInventory,
          equipped: newEquipped,
          // Append newLogs to the list, keeping strict limit
          logs: [...prev.logs.slice(-(50 - newLogs.length)), ...newLogs]
        }));

      } else {
        // Enemy Still Alive
        setGameState(prev => ({
          ...prev,
          enemy: { ...enemy!, currentHp: newEnemyHp },
          logs: [...prev.logs.slice(-49), damageLog]
        }));
      }

    }, TICK_RATE_MS / gameSpeed);

    return () => clearInterval(interval);
  }, [addLog, stateRef, setGameState, gameSpeed]);
};