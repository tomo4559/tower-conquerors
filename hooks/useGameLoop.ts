

import React, { useEffect, useRef } from 'react';
import { GameState, LogEntry, Equipment, EquipmentType } from '../types';
import { TICK_RATE_MS, BOSS_TIME_LIMIT, JOB_DEFINITIONS, JOB_ORDER, MERCHANT_ITEMS } from '../constants';
import { calculateTotalAttack, generateEnemy, generateDrop, createLog, formatNumber, calculateUpgradeCost, performBulkSynthesis, calculateCollectionBonus, getSetBonus } from '../utils/mechanics';
import { playCriticalSound } from '../utils/audio';

interface UseGameLoopProps {
  stateRef: React.MutableRefObject<GameState>;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  addLog: (message: string, type: LogEntry['type']) => void;
  gameSpeed: number;
}

export const useGameLoop = ({ stateRef, setGameState, addLog, gameSpeed }: UseGameLoopProps) => {
  const isVisible = useRef(true);
  
  // Cache for Collection Bonus (Heavy calc)
  const collectionCache = useRef({
      inventory: null as Equipment[] | null,
      equipped: null as any,
      value: 0
  });

  // Track visibility state more aggressively
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisible.current = !document.hidden;
    };
    const handleBlur = () => {
        isVisible.current = false;
    };
    const handleFocus = () => {
        isVisible.current = true;
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("blur", handleBlur);
        window.removeEventListener("focus", handleFocus);
    }
  }, []);

  useEffect(() => {
    // Standard delay calculation.
    const delay = Math.floor(1000 / gameSpeed);

    const interval = setInterval(() => {
      // Stop game loop if tab/window is hidden/blurred to prevent background battery drain and audio
      if (document.hidden || !isVisible.current) return;

      setGameState(prev => {
          if (!prev.autoBattleEnabled) return prev;
          
          let nextState = { ...prev };
          // CRITICAL: Shallow copy player to prevent mutating the reference
          nextState.player = { ...prev.player };

          // Create local mutable copies for batch processing within this tick
          // This prevents O(N^2) behavior when adding multiple drops
          let tickInventory = [...prev.inventory];
          let tickEquipped = { ...prev.equipped };
          let tickInventoryChanged = false;

          let newLogs: LogEntry[] = [];
          
          // --- ACTIVE SKILLS MANAGEMENT ---
          nextState.activeSkills = {
              concentration: { ...prev.activeSkills.concentration },
              vitalSpot: { ...prev.activeSkills.vitalSpot },
              hyperSpeed: { ...prev.activeSkills.hyperSpeed },
              awakening: { ...prev.activeSkills.awakening }
          };

          const now = Date.now();
          const activeSkillKeys = ['concentration', 'vitalSpot', 'hyperSpeed', 'awakening'] as const;
          
          activeSkillKeys.forEach(key => {
               if (nextState.activeSkills[key].isActive) {
                  if (now > nextState.activeSkills[key].endTime) {
                      nextState.activeSkills[key].isActive = false;
                      const name = key === 'concentration' ? '集中' : key === 'vitalSpot' ? '急所' : key === 'hyperSpeed' ? '神速' : '覚醒';
                      newLogs.push(createLog(`「${name}」の効果が切れました`, 'info'));
                  }
               }
          });

          // --- AUTO PROMOTE LOGIC ---
          const autoPromoteLevel = nextState.player.reincarnationUpgrades?.autoPromote || 0;
          if (autoPromoteLevel > 0) {
            const currentJobIndex = JOB_ORDER.indexOf(nextState.player.job);
            const nextJob = currentJobIndex < JOB_ORDER.length - 1 ? JOB_ORDER[currentJobIndex + 1] : null;
            
            if (nextJob) {
                const requiredLevel = JOB_DEFINITIONS[nextJob].unlockLevel;
                if (nextState.player.jobLevel >= requiredLevel) {
                     const excessLevels = Math.max(0, nextState.player.jobLevel - requiredLevel);
                     const startLevel = 1 + excessLevels;
                     
                     nextState.player.job = nextJob;
                     nextState.player.jobLevel = startLevel;
                     
                     newLogs.push(createLog(`[自動] ${nextJob}に転職しました！`, 'gain'));
                }
            }
          }

          // --- AUTO MERCHANT LOGIC ---
          const autoMerchantLevel = nextState.player.reincarnationUpgrades?.autoMerchant || 0;
          if (autoMerchantLevel > 0) {
              let upgradesChanged = false;
              // Clone merchantUpgrades to avoid mutating state if we purchase
              const newMerchantUpgrades = { ...nextState.player.merchantUpgrades };

              MERCHANT_ITEMS.forEach(item => {
                  if (nextState.player.autoMerchantKeys?.[item.key]) {
                      const currentLevel = newMerchantUpgrades[item.key] || 0;
                      // Crit Rate Cap Check
                      if (item.key === 'critRate' && currentLevel >= 50) return;

                      const discountLevel = nextState.player.reincarnationUpgrades.priceDiscount || 0;
                      const cost = calculateUpgradeCost(item.baseCost, currentLevel, discountLevel);
                      
                      if (nextState.player.gold >= cost) {
                          nextState.player.gold -= cost;
                          newMerchantUpgrades[item.key] = currentLevel + 1;
                          upgradesChanged = true;
                      }
                  }
              });

              if (upgradesChanged) {
                  nextState.player.merchantUpgrades = newMerchantUpgrades;
              }
          }

          // --- BOSS TIMER ---
          if (nextState.bossTimer !== null) {
            nextState.bossTimer -= 1;
            if (nextState.bossTimer <= 0) {
                const penalty = 9;
                const targetFloor = Math.max(1, nextState.player.floor - penalty);
                
                newLogs.push(createLog(`ボス戦の時間切れ！ ${targetFloor}階まで後退します...`, 'danger'));
                
                nextState.player.floor = targetFloor;
                
                const newEnemy = generateEnemy(targetFloor, nextState.player.reincarnationUpgrades);
                nextState.enemy = newEnemy;
                nextState.bossTimer = newEnemy.isBoss ? BOSS_TIME_LIMIT : null;
                
                return { ...nextState, logs: [...nextState.logs.slice(-49), ...newLogs] };
            }
          }

          // --- COMBAT LOGIC ---
          const attacksPerTick = nextState.activeSkills.hyperSpeed.isActive ? 10 : 1; 
          
          let totalDamageInTick = 0;
          let hitCountInTick = 0;
          let skillsTriggeredInTick: string[] = [];
          let dropsThisTick: Equipment[] = [];
          
          const isAwakeningActive = nextState.activeSkills.awakening.isActive;

          // OPTIMIZATION: Calculate Base Damage ONCE per tick
          let cachedCollectionBonus = collectionCache.current.value;
          if (collectionCache.current.inventory !== prev.inventory || collectionCache.current.equipped !== prev.equipped) {
              cachedCollectionBonus = calculateCollectionBonus(prev.equipped, prev.inventory);
              collectionCache.current = { inventory: prev.inventory, equipped: prev.equipped, value: cachedCollectionBonus };
          }
          
          const atkLv = nextState.player.merchantUpgrades?.attackBonus || 0;
          const merchantAtkBonus = atkLv * (atkLv + 1) * 10;
          
          const reincAtkLv = nextState.player.reincarnationUpgrades?.baseAttackBoost || 0;
          const reincarnationAtkBonus = reincAtkLv * (reincAtkLv + 1) * 50;

          let equipmentBonus = 0;
          const getBoost = (type: EquipmentType) => {
            if (!nextState.player.merchantUpgrades) return 0;
            let lv = 0;
            switch (type) {
              case EquipmentType.WEAPON: lv = nextState.player.merchantUpgrades.weaponBoost; break;
              case EquipmentType.HELM: lv = nextState.player.merchantUpgrades.helmBoost; break;
              case EquipmentType.ARMOR: lv = nextState.player.merchantUpgrades.armorBoost; break;
              case EquipmentType.SHIELD: lv = nextState.player.merchantUpgrades.shieldBoost; break;
            }
            return lv * (lv + 1) * 0.01;
          };

          Object.entries(prev.equipped).forEach(([type, item]) => {
            if (item) {
              const boostPercent = getBoost(type as EquipmentType);
              equipmentBonus += item.power * (1 + boostPercent);
            }
          });

          const collectionBonus = cachedCollectionBonus;

          const totalBase = nextState.player.baseAttack + merchantAtkBonus + reincarnationAtkBonus + equipmentBonus + collectionBonus;
          
          const setBonus = getSetBonus(prev.equipped);
          const jobMultiplier = JOB_DEFINITIONS[nextState.player.job].multiplier;
          
          let cachedBaseDamage = Math.floor(totalBase * jobMultiplier * setBonus.atkMult);
          
          if (isAwakeningActive) {
              cachedBaseDamage = Math.floor(cachedBaseDamage * 2.0);
          }

          let shouldAutoEnhance = false;

          for (let attackLoop = 0; attackLoop < attacksPerTick; attackLoop++) {
              if (!nextState.enemy) {
                 const newEnemy = generateEnemy(nextState.player.floor, nextState.player.reincarnationUpgrades);
                 nextState.enemy = newEnemy;
                 nextState.bossTimer = newEnemy.isBoss ? BOSS_TIME_LIMIT : null;
                 if (attackLoop === 0 || newEnemy.isBoss) {
                     newLogs.push(createLog(`${newEnemy.name}が現れた！`, 'info'));
                 }
              }

              // Attack Calculation
              let baseDamage = cachedBaseDamage;
              const jobSkills = JOB_DEFINITIONS[nextState.player.job].skills;
              let damageMultiplier = 1.0;
              
              const skillPowerLevel = nextState.player.reincarnationUpgrades?.skillDamageBoost || 0;
              const skillPowerMultiplier = 1 + ((skillPowerLevel * (skillPowerLevel + 1) * 5) / 100);
              
              const concentrationBonus = nextState.activeSkills.concentration.isActive ? 0.3 : 0;
              const awakeningTriggerBonus = isAwakeningActive ? 0.15 : 0;
              const TRIGGER_CAP = 0.5;

              // Calculate Skills
              for (let i = jobSkills.length - 1; i >= 0; i--) {
                const skill = jobSkills[i];
                const mastery = nextState.player.skillMastery[skill.name] || { level: 0, count: 0 };
                const effectiveRate = skill.triggerRate + (mastery.level * 0.01) + concentrationBonus + awakeningTriggerBonus;
                
                let isTriggered = false;
                let excessRateBonus = 0;

                if (effectiveRate > TRIGGER_CAP) {
                    excessRateBonus = effectiveRate - TRIGGER_CAP;
                    isTriggered = Math.random() < TRIGGER_CAP;
                } else {
                    isTriggered = Math.random() < effectiveRate;
                }
                
                if (isTriggered) {
                   const excessMultiplier = 1.0 + excessRateBonus;
                   const effectiveSkillMulti = skill.damageMultiplier * skillPowerMultiplier * excessMultiplier;
                   damageMultiplier *= effectiveSkillMulti;
                   if (!skillsTriggeredInTick.includes(skill.name)) skillsTriggeredInTick.push(skill.name);
                   
                   const newCount = mastery.count + 1;
                   if (newCount >= 10) {
                      nextState.player.skillMastery = {
                         ...nextState.player.skillMastery,
                         [skill.name]: { level: mastery.level + 1, count: 0 }
                      };
                      if (!newLogs.some(l => l.message.includes(`スキル【${skill.name}】`))) {
                          newLogs.push(createLog(`スキル【${skill.name}】の熟練度が上がった！(Lv.${mastery.level + 1})`, 'gain'));
                      }
                   } else {
                      nextState.player.skillMastery = {
                         ...nextState.player.skillMastery,
                         [skill.name]: { ...mastery, count: newCount }
                      };
                   }
                }
              }

              // Critical Rate Calculation
              // Base: 5% (0.05)
              let rawCritRate = 0.05 + (nextState.player.merchantUpgrades?.critRate || 0) * 0.01;
              if (setBonus.critAdd > 0) rawCritRate += (setBonus.critAdd * 0.01);
              if (nextState.activeSkills.vitalSpot.isActive) rawCritRate += 0.2;
              if (isAwakeningActive) rawCritRate += 0.25;
              
              const critRate = Math.min(1.0, rawCritRate);
              const isCrit = Math.random() < critRate;
              
              // Critical Damage Calculation
              // Base: 130% (1.3), Merchant: Lv * (Lv+1) * 2%
              const critLvl = nextState.player.merchantUpgrades?.critDamage || 0;
              const critDamageMulti = 1.3 + (critLvl * (critLvl + 1) * 0.02);
              
              let finalDamage = Math.floor(baseDamage * damageMultiplier * (isCrit ? critDamageMulti : 1));
              
              const giantKillingLevel = nextState.player.merchantUpgrades?.giantKilling || 0;
              if (nextState.enemy.isBoss && giantKillingLevel > 0) {
                  const gkMultiplier = 1 + (giantKillingLevel * 0.02);
                  finalDamage = Math.floor(finalDamage * gkMultiplier);
              }

              nextState.enemy = { ...nextState.enemy, currentHp: nextState.enemy.currentHp - finalDamage };
              
              totalDamageInTick += finalDamage;
              hitCountInTick++;

              if (attacksPerTick === 1) {
                  let msg = "";
                  if (skillsTriggeredInTick.length > 0) {
                      msg = `${skillsTriggeredInTick.join(' & ')}発動！ 敵に${formatNumber(finalDamage)}のダメージ！`;
                  } else {
                      msg = `敵に${formatNumber(finalDamage)}のダメージ`;
                  }
                  if (isCrit) {
                      msg += " (クリティカル！)";
                      playCriticalSound(); 
                  }
                  newLogs.push(createLog(msg, isCrit ? 'crit' : 'damage'));
                  skillsTriggeredInTick = [];
                  totalDamageInTick = 0;
              }

              // --- ENEMY DEATH & DROPS ---
              if (nextState.enemy.currentHp <= 0) {
                if (attacksPerTick > 1 && totalDamageInTick > 0) {
                    newLogs.push(createLog(`高速連撃！ 合計${formatNumber(totalDamageInTick)}ダメージ！`, 'damage'));
                    totalDamageInTick = 0;
                    hitCountInTick = 0;
                }

                const goldLvl = nextState.player.reincarnationUpgrades?.goldBoost || 0;
                const xpLvl = nextState.player.reincarnationUpgrades?.xpBoost || 0;
                const goldBoost = 1 + ((goldLvl * (goldLvl + 1)) / 100);
                const xpBoost = 1 + ((xpLvl * (xpLvl + 1)) / 100);

                const goldGain = Math.floor(nextState.enemy.goldReward * goldBoost);
                const xpGain = Math.floor(nextState.enemy.xpReward * xpBoost);

                nextState.player.gold += goldGain;
                nextState.player.currentXp += xpGain;
                newLogs.push(createLog(`${nextState.enemy.name}を倒した！ ${formatNumber(xpGain)}XP, ${formatNumber(goldGain)}G獲得`, 'gain'));

                if (nextState.player.currentXp >= nextState.player.requiredXp) {
                   nextState.player.level += 1;
                   nextState.player.currentXp -= nextState.player.requiredXp;
                   nextState.player.requiredXp = Math.floor(nextState.player.requiredXp * 1.3);
                   nextState.player.baseAttack += 2;
                   nextState.player.jobLevel += 1;
                   newLogs.push(createLog(`レベルアップ！ Lv.${nextState.player.level} になりました`, 'gain'));
                }

                // --- DROP GENERATION ---
                let dropCount = 1;
                let forceDrop = false;
                let allowARank = false;

                if (nextState.enemy.isBoss) {
                    if (nextState.player.floor % 500 === 0) {
                        dropCount = 50;
                        forceDrop = true;
                        allowARank = true;
                    } else if (nextState.player.floor % 100 === 0) {
                        dropCount = 30;
                        forceDrop = true;
                    } else if (nextState.player.floor % 10 === 0) {
                        dropCount = 10;
                        forceDrop = true;
                    }
                }

                let dropsAcquiredCount = 0;
                for (let i = 0; i < dropCount; i++) {
                    const drop = generateDrop(
                        nextState.player.floor, 
                        nextState.player.reincarnationUpgrades, 
                        nextState.player.dropPreferences,
                        nextState.enemy.isBoss,
                        forceDrop,
                        allowARank
                    );
                    
                    if (drop) {
                        if (allowARank && drop.rank === 'A') {
                            nextState.rareDropItem = drop;
                        }
                        dropsThisTick.push(drop);
                        dropsAcquiredCount++;
                    }
                }

                if (dropsAcquiredCount > 0) {
                     shouldAutoEnhance = true;
                     if (dropsAcquiredCount === 1) {
                        newLogs.push(createLog(`装備をドロップした！`, 'gain'));
                     } else {
                        newLogs.push(createLog(`装備を${dropsAcquiredCount}個ドロップした！`, 'gain'));
                     }
                }

                if (nextState.enemy.isBoss) {
                    newLogs.push(createLog(`ボス撃破！次の階層へ進みます`, 'boss'));
                }
                
                nextState.player.floor += 1;
                
                if (nextState.farmingMode) {
                    if (nextState.player.floor > nextState.farmingMode.max) {
                        nextState.player.floor = nextState.farmingMode.min;
                        newLogs.push(createLog(`周回設定により${nextState.farmingMode.min}階に戻ります`, 'info'));
                    }
                }

                if (nextState.player.floor > nextState.player.maxFloorReached) {
                    nextState.player.maxFloorReached = nextState.player.floor;
                }

                const nextEnemy = generateEnemy(nextState.player.floor, nextState.player.reincarnationUpgrades);
                nextState.enemy = nextEnemy;
                nextState.bossTimer = nextEnemy.isBoss ? BOSS_TIME_LIMIT : null;
                
                if (nextEnemy.isBoss) {
                     newLogs.push(createLog(`${nextState.player.floor}階のボス、${nextEnemy.name}が現れた！`, 'danger'));
                }
              }
          } // End Attack Loop

          // --- BATCH PROCESS DROPS & AUTO EQUIP ---
          if (dropsThisTick.length > 0) {
              const autoEquip = nextState.player.reincarnationUpgrades?.autoEquip || 0;
              
              dropsThisTick.forEach(drop => {
                   let equippedAuto = false;
                   if (autoEquip > 0) {
                        const currentEquip = tickEquipped[drop.type];
                        if (!currentEquip || drop.power > currentEquip.power) {
                             const newEquippedItem = { ...drop, isEquipped: true };
                             tickEquipped[drop.type] = newEquippedItem;
                             
                             if (currentEquip) {
                                 const idx = tickInventory.findIndex(i => i.id === currentEquip.id);
                                 if (idx >= 0) {
                                     tickInventory[idx] = { ...currentEquip, isEquipped: false };
                                 } else {
                                     tickInventory.push({ ...currentEquip, isEquipped: false });
                                 }
                             }
                             
                             tickInventory.push(newEquippedItem);
                             equippedAuto = true;
                        }
                   }

                   if (!equippedAuto) {
                       tickInventory.push(drop);
                   }
              });
              
              tickInventoryChanged = true;
          }

          if (attacksPerTick > 1 && totalDamageInTick > 0) {
              newLogs.push(createLog(`高速連撃！ 合計${formatNumber(totalDamageInTick)}ダメージ！`, 'damage'));
          }

          // --- BATCH SYNTHESIS ---
          if (shouldAutoEnhance && (nextState.player.reincarnationUpgrades?.autoEnhance || 0) > 0) {
               const result = performBulkSynthesis(tickInventory, tickEquipped);
               if (result.loopCount > 1) {
                   tickInventory = result.inventory;
                   tickEquipped = result.equipped;
                   newLogs.push(...result.logs);
                   tickInventoryChanged = true;
               }
          }

          if (tickInventoryChanged) {
              nextState.inventory = tickInventory;
              nextState.equipped = tickEquipped;
          }

          const finalLogs = [...nextState.logs, ...newLogs];
          if (finalLogs.length > 50) {
             nextState.logs = finalLogs.slice(finalLogs.length - 50);
          } else {
             nextState.logs = finalLogs;
          }

          return nextState;
      });
    }, delay);

    return () => clearInterval(interval);
  }, [gameSpeed]);
};
