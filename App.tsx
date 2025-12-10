

import React, { useState, useEffect } from 'react';
import { Player, Equipment, JobType, MerchantUpgrades, ReincarnationUpgrades, EquipmentRank, EquipmentType, FarmingMode } from './types';
import { JOB_DEFINITIONS, JOB_ORDER, MERCHANT_ITEMS, REINCARNATION_ITEMS, UPDATE_HISTORY, GAME_MANUAL, RANK_DATA } from './constants';
import { calculateTotalAttack, createLog, calculateReincarnationStones, calculateUpgradeCost, generateEnemy, generateDrop, formatNumber, calculateItemPower, getNextRank, performBulkSynthesis, getSetBonus } from './utils/mechanics';
import { StatusHeader } from './components/panels/StatusHeader';
import { BattleView } from './components/panels/BattleView';
import { ControlTabs } from './components/panels/ControlTabs';
import { Modal } from './components/ui/Modal';
import { useGameState, getInitialPlayer } from './hooks/useGameState';
import { useGameLoop } from './hooks/useGameLoop';
import { BOSS_TIME_LIMIT } from './constants';
import { LogEntry } from './types';
import { initAudio, playBGM, toggleBGM, getBgmError, resetBgmError, setAudioVisibility } from './utils/audio';

const BGM_URL_NORMAL = "https://freetomo.com/game/tower/bgm/01_morning.mp3";
const BGM_URL_BOSS = "https://freetomo.com/game/tower/bgm/02_boss.mp3";

export const App: React.FC = () => {
  // Use Custom Hooks
  const { gameState, setGameState, stateRef, addLog, INITIAL_STATE } = useGameState();
  const [gameSpeed, setGameSpeed] = useState(1);
  const [reincarnationStartFloor, setReincarnationStartFloor] = useState(1);
  
  // Audio State
  const [isBgmMuted, setIsBgmMuted] = useState(true);
  const [bgmError, setBgmError] = useState(false);

  // Determine current BGM based on floor
  // Boss BGM plays during the last 100 floors of a 500-floor tier (e.g., 401-500, 901-1000)
  const currentBgmUrl = ((floor: number) => {
      const mod = (floor - 1) % 500;
      return mod >= 400 ? BGM_URL_BOSS : BGM_URL_NORMAL;
  })(gameState.player.floor);

  // Handle visibility change to stop audio when backgrounded
  useEffect(() => {
      const handleVisibilityChange = () => {
          const isVisible = !document.hidden;
          setAudioVisibility(isVisible);
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);
      return () => {
          document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
  }, []);

  // Auto-switch BGM when floor changes trigger a track change
  useEffect(() => {
      if (!bgmError) {
          // playBGM handles updating the source if it changed, even if muted.
          // It returns false if autoplay was blocked or failed, but we ignore autoplay blocks here
          // as they will be resolved on next user interaction.
          playBGM(currentBgmUrl).catch(() => {});
      }
  }, [currentBgmUrl, bgmError]);

  // Developer Mode State
  const [showDevControls, setShowDevControls] = useState(false);
  const [devClicks, setDevClicks] = useState(0);

  useGameLoop({ stateRef, setGameState, addLog, gameSpeed });

  const [showReincarnationModal, setShowReincarnationModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showFarmingModal, setShowFarmingModal] = useState(false);

  // Handlers
  const handleEnemyClick = () => {
    if (showDevControls) return;
    const newCount = devClicks + 1;
    setDevClicks(newCount);
    if (newCount >= 5) {
      setShowDevControls(true);
      addLog('開発者モードが有効になりました', 'info');
    }
  };

  const handleGlobalClick = () => {
    // Initialize audio on first interaction (for SFX)
    initAudio();
    
    // Attempt BGM Playback if not playing
    if (!isBgmMuted && !bgmError) {
        playBGM(currentBgmUrl).then((success) => {
            if (!success && getBgmError()) {
                setBgmError(true);
            }
        });
    }
  };

  const handleToggleBgm = () => {
      if (bgmError) {
          // Retry
          resetBgmError();
          setBgmError(false);
          playBGM(currentBgmUrl).then((success) => {
              if (!success && getBgmError()) {
                  setBgmError(true);
                  addLog('BGMの読み込みに失敗しました', 'danger');
              }
          });
      } else {
          const newMuted = !isBgmMuted;
          setIsBgmMuted(newMuted);
          toggleBGM(newMuted);
      }
  };

  const handleEquip = (item: Equipment) => {
    setGameState(prev => {
      const newEquipped = { ...prev.equipped };
      const oldItem = newEquipped[item.type];
      
      // 1. Equip the new item
      newEquipped[item.type] = { ...item, isEquipped: true };
      
      let newInventory = [...prev.inventory];

      // 2. Mark the new item as equipped in inventory (or add if missing for robustness)
      const newItemIndex = newInventory.findIndex(i => i.id === item.id);
      if (newItemIndex >= 0) {
          newInventory[newItemIndex] = { ...item, isEquipped: true };
      } else {
          newInventory.push({ ...item, isEquipped: true });
      }

      // 3. Handle the old item (unequip it)
      if (oldItem) {
          const oldItemIndex = newInventory.findIndex(i => i.id === oldItem.id);
          if (oldItemIndex >= 0) {
              newInventory[oldItemIndex] = { ...oldItem, isEquipped: false };
          } else {
              // Crucial Fix: If old item is not in inventory array (e.g. from bulk synth separation), add it back
              newInventory.push({ ...oldItem, isEquipped: false });
          }
      }

      return {
        ...prev,
        equipped: newEquipped,
        inventory: newInventory,
        logs: [...prev.logs.slice(-49), createLog(`${item.name}を装備しました`, 'info')]
      };
    });
  };

  const handleSynthesize = (baseItem: Equipment) => {
      setGameState(prev => {
          // Find the first material that matches
          const material = prev.inventory.find(i => 
             i.id !== baseItem.id && // Not self
             i.type === baseItem.type &&
             i.tier === baseItem.tier &&
             i.rank === baseItem.rank &&
             i.plus === baseItem.plus &&
             i.name === baseItem.name
          );

          if (!material) {
              return prev;
          }

          let newPlus = baseItem.plus;
          let newRank = baseItem.rank;
          let msg = "";

          // New Logic: Max +5. +5 & +5 = Next Rank +0
          if (baseItem.plus < 5) {
              // Normal enhancement (+0->+1, ..., +4->+5)
              newPlus = baseItem.plus + 1;
              msg = `${baseItem.name}を +${newPlus} に強化しました！`;
          } else {
              // Rank Up logic (Current +5, Material +5)
              if (baseItem.rank === EquipmentRank.S) return prev; // Cannot upgrade S+5
              
              const nextRank = getNextRank(baseItem.rank);
              if (nextRank) {
                  newRank = nextRank;
                  newPlus = 0; // Reset plus
                  msg = `${baseItem.name}のランクが ${newRank} に昇格しました！`;
              } else {
                  return prev;
              }
          }

          const newPower = calculateItemPower(baseItem.basePower, newRank, newPlus);
          const updatedItem: Equipment = { ...baseItem, rank: newRank, plus: newPlus, power: newPower };
          
          let newEquipped = { ...prev.equipped };
          let newInventory = [...prev.inventory];
          
          // Remove material
          newInventory = newInventory.filter(i => i.id !== material.id);

          // Update base item
          if (updatedItem.isEquipped) {
              newEquipped[updatedItem.type] = updatedItem;
              newInventory = newInventory.map(i => i.id === updatedItem.id ? updatedItem : i);
          } else {
              newInventory = newInventory.map(i => i.id === updatedItem.id ? updatedItem : i);
          }

          return {
              ...prev,
              equipped: newEquipped,
              inventory: newInventory,
              logs: [...prev.logs.slice(-49), createLog(msg, 'gain')]
          };
      });
  };

  const handleBulkSynthesize = () => {
    setGameState(prev => {
        const result = performBulkSynthesis(prev.inventory, prev.equipped);
        
        let logs = result.logs;
        if (result.loopCount <= 1) {
            logs = [createLog(`強化できる装備がありませんでした`, 'info')];
        }

        return {
            ...prev,
            inventory: result.inventory,
            equipped: result.equipped,
            logs: [...prev.logs.slice(-49), ...logs]
        };
    });
  };

  const handleJobChange = (newJob: JobType) => {
    setGameState(prev => {
        const requiredLevel = JOB_DEFINITIONS[newJob].unlockLevel;
        const excessLevels = Math.max(0, prev.player.jobLevel - requiredLevel);
        const startLevel = 1 + excessLevels;

        return {
          ...prev,
          player: {
            ...prev.player,
            job: newJob,
            jobLevel: startLevel
          },
          logs: [...prev.logs.slice(-49), createLog(`${newJob}に転職しました！`, 'gain')]
        };
    });
  };

  const handleToggleAutoMerchant = (key: keyof MerchantUpgrades) => {
    setGameState(prev => ({
      ...prev,
      player: {
        ...prev.player,
        autoMerchantKeys: {
          ...prev.player.autoMerchantKeys,
          [key]: !prev.player.autoMerchantKeys[key]
        }
      }
    }));
  };

  const handleToggleDropPreference = (type: EquipmentType) => {
      setGameState(prev => ({
          ...prev,
          player: {
              ...prev.player,
              dropPreferences: {
                  ...prev.player.dropPreferences,
                  [type]: !prev.player.dropPreferences?.[type]
              }
          }
      }));
  };

  const handleBuyUpgrade = (key: keyof MerchantUpgrades) => {
    setGameState(prev => {
      const level = prev.player.merchantUpgrades[key] || 0;
      const item = MERCHANT_ITEMS.find(i => i.key === key);
      if (!item) return prev;
      
      const discountLevel = prev.player.reincarnationUpgrades.priceDiscount || 0;
      const cost = calculateUpgradeCost(item.baseCost, level, discountLevel);
      
      if (key === 'critRate' && level >= 50) return prev;

      if (prev.player.gold < cost) return prev;

      return {
        ...prev,
        player: {
          ...prev.player,
          gold: prev.player.gold - cost,
          merchantUpgrades: {
            ...prev.player.merchantUpgrades,
            [key]: level + 1
          },
        },
        logs: [...prev.logs.slice(-49), createLog(`${item.name}をLv.${level + 1}に強化しました`, 'gain')]
      };
    });
  };

  const handleBuyMaxUpgrade = (key: keyof MerchantUpgrades) => {
    setGameState(prev => {
      let currentGold = prev.player.gold;
      let currentLevel = prev.player.merchantUpgrades[key] || 0;
      const discountLevel = prev.player.reincarnationUpgrades.priceDiscount || 0;
      const item = MERCHANT_ITEMS.find(i => i.key === key);
      if (!item) return prev;

      let levelsToBuy = 0;
      
      while (true) {
        if (key === 'critRate' && (currentLevel + levelsToBuy) >= 50) break;

        const nextCost = calculateUpgradeCost(item.baseCost, currentLevel + levelsToBuy, discountLevel);
        
        if (currentGold >= nextCost) {
          currentGold -= nextCost;
          levelsToBuy++;
        } else {
          break;
        }
      }

      if (levelsToBuy === 0) return prev;

      return {
        ...prev,
        player: {
          ...prev.player,
          gold: currentGold,
          merchantUpgrades: {
            ...prev.player.merchantUpgrades,
            [key]: currentLevel + levelsToBuy
          }
        },
        logs: [...prev.logs.slice(-49), createLog(`${item.name}を +${levelsToBuy} (Lv.${currentLevel + levelsToBuy}) 強化しました`, 'gain')]
      };
    });
  };

  const handleBuyReincarnationUpgrade = (key: keyof ReincarnationUpgrades) => {
    setGameState(prev => {
      const level = prev.player.reincarnationUpgrades[key] || 0;
      const item = REINCARNATION_ITEMS.find(i => i.key === key);
      if (!item) return prev;
      
      const cost = calculateUpgradeCost(item.baseCost, level, 0, key);
      if (prev.player.reincarnationStones < cost) return prev;

      let newAutoMerchantKeys = prev.player.autoMerchantKeys;
      if (key === 'autoMerchant') {
          newAutoMerchantKeys = {};
          MERCHANT_ITEMS.forEach(item => {
              newAutoMerchantKeys[item.key] = true;
          });
      }

      return {
        ...prev,
        player: {
          ...prev.player,
          reincarnationStones: prev.player.reincarnationStones - cost,
          reincarnationUpgrades: {
            ...prev.player.reincarnationUpgrades,
            [key]: level + 1
          },
          autoMerchantKeys: newAutoMerchantKeys
        },
        logs: [...prev.logs.slice(-49), createLog(`${item.name}をLv.${level + 1}に強化しました`, 'gain')]
      };
    });
  };

  const handleActivateSkill = (skillName: 'concentration' | 'vitalSpot' | 'hyperSpeed' | 'awakening') => {
      setGameState(prev => {
          const now = Date.now();
          // @ts-ignore
          const level = prev.player.reincarnationUpgrades[skillName] || 0;
          if (level === 0) return prev;
          
          // @ts-ignore
          const skillState = prev.activeSkills[skillName];
          if (now < skillState.cooldownEnd) return prev;

          let durationSec = 10 + (level * 1);
          let cooldownSec = 60;
          let logMsg = '';

          if (skillName === 'hyperSpeed') {
             // New Logic: Lv1=10s, +5s per additional level
             durationSec = 10 + ((level - 1) * 5); 
             cooldownSec = 60;
             logMsg = `「神速」を発動！${durationSec}秒間、攻撃速度が10倍になります！`;
          } else if (skillName === 'concentration') {
             logMsg = '「集中」を発動！スキル発動率+30%';
          } else if (skillName === 'vitalSpot') {
             logMsg = '「急所」を発動！クリティカル率+20%';
          } else if (skillName === 'awakening') {
             logMsg = '「覚醒」を発動！攻撃2倍・会心+25%・スキル率+15%';
          }

          const durationMs = durationSec * 1000;
          
          return {
              ...prev,
              activeSkills: {
                  ...prev.activeSkills,
                  [skillName]: {
                      isActive: true,
                      endTime: now + durationMs,
                      cooldownEnd: now + (cooldownSec * 1000), 
                      duration: durationMs
                  }
              },
              logs: [...prev.logs.slice(-49), createLog(logMsg, 'info')]
          };
      });
  };

  const maxStartFloorPossible = (() => {
    const startFloorLevel = gameState.player.reincarnationUpgrades?.startFloor || 0;
    const potentialStartFloor = 1 + (startFloorLevel * 100);
    const maxReached = gameState.player.maxFloorReached || 1;
    const maxAllowedStartFloor = Math.floor((maxReached - 1) / 100) * 100 + 1;
    return Math.min(potentialStartFloor, maxAllowedStartFloor);
  })();

  const handleOpenReincarnation = () => {
      setReincarnationStartFloor(maxStartFloorPossible);
      setShowReincarnationModal(true);
  };

  const confirmReincarnation = () => {
    const current = stateRef.current;
    
    const stoneLvl = current.player.reincarnationUpgrades?.stoneBoost || 0;
    const stoneBoostPercent = (stoneLvl * (stoneLvl + 1));
    const multiplier = 1 + (stoneBoostPercent / 100);
    
    const stonesToGain = calculateReincarnationStones(current.player.floor, multiplier);
    
    const newFloor = Math.min(reincarnationStartFloor, maxStartFloorPossible);

    const initialPlayer = getInitialPlayer();

    // --- ITEM INHERITANCE LOGIC ---
    const persistenceLevel = current.player.reincarnationUpgrades.itemPersistence || 0;
    let preservedInventory: Equipment[] = [];
    let initialEquipped: Partial<Record<EquipmentType, Equipment>> = {};
    
    if (persistenceLevel > 0) {
        const allItems = [...current.inventory, ...Object.values(current.equipped).filter((i): i is Equipment => !!i)];
        
        // Step 1: Filter eligible items and unequip them by default
        preservedInventory = allItems.filter(item => {
            if (item.rank === EquipmentRank.S && persistenceLevel >= 3) return true;
            if (item.rank === EquipmentRank.A && persistenceLevel >= 2) return true;
            if (item.rank === EquipmentRank.B && persistenceLevel >= 1) return true;
            return false;
        }).map(item => ({ ...item, isEquipped: false }));

        // Step 2: If Auto Equip is active, automatically equip the best items from preserved inventory
        if ((current.player.reincarnationUpgrades.autoEquip || 0) > 0) {
             const bestItems: Partial<Record<EquipmentType, Equipment>> = {};
             
             // Find best item for each type
             preservedInventory.forEach(item => {
                 const currentBest = bestItems[item.type];
                 if (!currentBest || item.power > currentBest.power) {
                     bestItems[item.type] = item;
                 }
             });
             
             // Update preservedInventory to reflect equipped status
             preservedInventory = preservedInventory.map(item => {
                 if (bestItems[item.type]?.id === item.id) {
                     const equippedItem = { ...item, isEquipped: true };
                     initialEquipped[item.type] = equippedItem;
                     return equippedItem;
                 }
                 return item;
             });
        }
    }
    // -----------------------------

    const newPlayer: Player = {
      ...initialPlayer,
      reincarnationStones: current.player.reincarnationStones + stonesToGain,
      reincarnationUpgrades: current.player.reincarnationUpgrades,
      autoMerchantKeys: current.player.autoMerchantKeys, 
      dropPreferences: current.player.dropPreferences,

      merchantUpgrades: { ...initialPlayer.merchantUpgrades },
      floor: newFloor,
      maxFloorReached: current.player.maxFloorReached,
    };

    const firstEnemy = generateEnemy(newFloor, current.player.reincarnationUpgrades);

    setGameState({
      ...INITIAL_STATE,
      player: newPlayer,
      enemy: firstEnemy,
      inventory: preservedInventory, // Restore inherited items
      equipped: initialEquipped, // Best items equipped if auto-equip enabled
      bossTimer: firstEnemy.isBoss ? BOSS_TIME_LIMIT : null,
      logs: [
        createLog(`転生しました！ 転生石 ${stonesToGain}個を獲得。`, 'info'),
        createLog(`${firstEnemy.name}が現れた！ (HP: ${firstEnemy.maxHp})`, 'info'),
        ...(preservedInventory.length > 0 ? [createLog(`スキル効果により装備を${preservedInventory.length}個継承しました`, 'info')] : [])
      ],
      activeSkills: { ...INITIAL_STATE.activeSkills },
      farmingMode: null,
      rareDropItem: null
    });
    setShowReincarnationModal(false);
  };
  
  const handleSetFarmingMode = (mode: FarmingMode | null) => {
      setGameState(prev => ({
          ...prev,
          farmingMode: mode,
          logs: [...prev.logs.slice(-49), createLog(`周回モードを「${mode ? `${mode.min}-${mode.max}階` : '通常'}」に設定しました`, 'info')]
      }));
      setShowFarmingModal(false);
  };

  const nextJob = JOB_ORDER.indexOf(gameState.player.job) < JOB_ORDER.length - 1 
    ? JOB_ORDER[JOB_ORDER.indexOf(gameState.player.job) + 1] 
    : null;
    
  const canPromote = nextJob 
    ? gameState.player.jobLevel >= JOB_DEFINITIONS[nextJob].unlockLevel 
    : false;

  const totalAttack = calculateTotalAttack(gameState.player, gameState.equipped, gameState.inventory);
  
  const stoneLvl = gameState.player.reincarnationUpgrades?.stoneBoost || 0;
  const stoneBoostPercent = (stoneLvl * (stoneLvl + 1));
  const currentReincarnationStones = calculateReincarnationStones(gameState.player.floor, 1 + (stoneBoostPercent / 100));

  const atkLv = gameState.player.merchantUpgrades?.attackBonus || 0;
  const merchantAtk = atkLv * (atkLv + 1) * 10;
  
  const reincAtkLv = gameState.player.reincarnationUpgrades?.baseAttackBoost || 0;
  const reincAtk = reincAtkLv * (reincAtkLv + 1) * 50;
  
  const jobMult = JOB_DEFINITIONS[gameState.player.job].multiplier;
  
  // Calculate Crit Rate & Damage for Modal Display
  const setBonus = getSetBonus(gameState.equipped);
  const critRate = 5 + Math.min(50, (gameState.player.merchantUpgrades?.critRate || 0)) + (setBonus.critAdd || 0);
  
  const critLvl = gameState.player.merchantUpgrades?.critDamage || 0;
  const critDmg = 130 + (critLvl * (critLvl + 1) * 2); 
  
  return (
    <div className="max-w-md mx-auto h-screen flex flex-col bg-slate-950 text-slate-200 font-sans shadow-2xl overflow-hidden relative" onClick={handleGlobalClick}>
      <StatusHeader 
        player={gameState.player} 
        totalAttack={totalAttack} 
        onReincarnateClick={handleOpenReincarnation}
        onOpenUpdates={() => setShowHistoryModal(true)}
        onOpenHelp={() => setShowHelpModal(true)}
        onOpenStatus={() => setShowStatusModal(true)}
        onOpenFarming={() => setShowFarmingModal(true)}
        farmingMode={gameState.farmingMode}
        gameSpeed={gameSpeed}
        onSpeedChange={setGameSpeed}
        showDevControls={showDevControls}
        isBgmMuted={isBgmMuted}
        bgmError={bgmError}
        onToggleBgm={handleToggleBgm}
      />

      <BattleView 
        enemy={gameState.enemy} 
        player={gameState.player} 
        bossTimer={gameState.bossTimer}
        logs={gameState.logs}
        onEnemyClick={handleEnemyClick}
      />

      <ControlTabs 
        player={gameState.player}
        inventory={gameState.inventory}
        equipped={gameState.equipped}
        logs={gameState.logs}
        onEquip={handleEquip}
        onJobChange={handleJobChange}
        onBuyUpgrade={handleBuyUpgrade}
        onBuyMaxUpgrade={handleBuyMaxUpgrade}
        onBuyReincarnationUpgrade={handleBuyReincarnationUpgrade}
        onToggleAutoMerchant={handleToggleAutoMerchant}
        onActivateSkill={handleActivateSkill}
        activeSkills={gameState.activeSkills}
        canPromote={canPromote}
        nextJob={nextJob}
        totalAttack={totalAttack}
        onSynthesize={handleSynthesize}
        onBulkSynthesize={handleBulkSynthesize}
        onToggleDropPreference={handleToggleDropPreference}
      />

      {/* Farming Mode Modal */}
      <Modal
        isOpen={showFarmingModal}
        title="周回設定"
        onConfirm={() => setShowFarmingModal(false)}
        onCancel={() => setShowFarmingModal(false)}
        confirmLabel="閉じる"
        cancelLabel=""
      >
          <div className="space-y-2">
             <p className="text-xs text-slate-400 mb-2">
                 自動周回する階層を設定します。<br/>
                 設定した上限階層のボスを倒すと、下限階層に戻ります。<br/>
                 ※到達済みの階層のみ選択可能です。
             </p>
             <button
                onClick={() => handleSetFarmingMode(null)}
                className={`w-full p-2 text-sm rounded border ${!gameState.farmingMode ? 'bg-cyan-900 border-cyan-500 text-cyan-100' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}
             >
                 通常周回 (無限登頂)
             </button>
             
             <div className="max-h-[200px] overflow-y-auto space-y-1 pr-1 scrollbar-hide mt-2">
                 {Array.from({ length: Math.ceil(gameState.player.maxFloorReached / 100) }).map((_, i) => {
                     const min = i * 100 + 1;
                     const max = (i + 1) * 100;
                     
                     const isSelectable = gameState.player.maxFloorReached >= max;
                     
                     if (!isSelectable) return null;

                     const isSelected = gameState.farmingMode?.min === min && gameState.farmingMode?.max === max;

                     return (
                         <button
                            key={min}
                            onClick={() => handleSetFarmingMode({ min, max })}
                            className={`w-full p-2 text-sm rounded border ${isSelected ? 'bg-cyan-900 border-cyan-500 text-cyan-100' : 'bg-slate-800 border-slate-700 hover:bg-slate-700'}`}
                         >
                             {min}階 ～ {max}階
                         </button>
                     );
                 })}
                 {gameState.player.maxFloorReached < 100 && (
                     <div className="text-xs text-slate-500 text-center py-2">
                         100階到達後に選択可能になります
                     </div>
                 )}
             </div>
          </div>
      </Modal>

      {/* Rare Drop Modal */}
      <Modal
        isOpen={!!gameState.rareDropItem}
        title="🎉 Aランク装備ドロップ！ 🎉"
        onConfirm={() => setGameState(prev => ({...prev, rareDropItem: null}))}
        onCancel={() => setGameState(prev => ({...prev, rareDropItem: null}))}
        confirmLabel="最高だ！"
        cancelLabel=""
      >
        <div className="text-center space-y-4">
             <div className="text-6xl animate-bounce">💎</div>
             <p className="text-yellow-200 font-bold">
                 スーパーフロアボスから<br/>奇跡のドロップを獲得しました！
             </p>
             {gameState.rareDropItem && (
                 <div className="bg-slate-800 p-4 rounded border-2 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]">
                     <div className={`text-lg font-bold ${RANK_DATA[gameState.rareDropItem.rank].color}`}>
                        [T{gameState.rareDropItem.tier}] {gameState.rareDropItem.name}
                     </div>
                     <div className="text-sm text-slate-300 mt-1">
                         Rank <span className="text-red-400 font-bold">A</span>
                     </div>
                     <div className="text-xl font-mono text-red-300 font-bold mt-2">
                         Atk: {formatNumber(gameState.rareDropItem.power)}
                     </div>
                 </div>
             )}
             <p className="text-xs text-slate-400">
                 確率はわずか0.1%です。<br/>大切に使いましょう！
             </p>
        </div>
      </Modal>

      {/* Reincarnation Modal */}
      <Modal
        isOpen={showReincarnationModal}
        title="転生の儀"
        onConfirm={confirmReincarnation}
        onCancel={() => setShowReincarnationModal(false)}
        confirmLabel="転生する"
      >
        <div className="space-y-3 text-sm">
          <p>現在の階層: <span className="font-bold text-white">{gameState.player.floor}階</span></p>
          <p className="text-purple-300 font-bold text-lg border-b border-purple-800 pb-2">
             獲得転生石: {formatNumber(currentReincarnationStones)} 個
             {stoneBoostPercent > 0 && <span className="text-xs ml-2 text-green-400">(+{stoneBoostPercent}%)</span>}
          </p>
          <ul className="list-disc list-inside text-slate-400 space-y-1 mt-2">
            <li>レベル、所持金、アイテム、装備が<span className="text-red-400">全てリセット</span>されます。</li>
            <li>職業は「初心者」に戻ります。</li>
            <li>転生スキルと転生石は引き継がれます。</li>
          </ul>
          
          <div className="bg-slate-800 p-2 rounded border border-slate-700 mt-2">
             <label className="block text-xs text-slate-400 mb-1">開始階層を選択</label>
             <select 
               value={reincarnationStartFloor} 
               onChange={(e) => setReincarnationStartFloor(Number(e.target.value))}
               className="w-full bg-slate-900 border border-slate-600 rounded p-1 text-white text-sm focus:outline-none focus:border-purple-500"
             >
                {Array.from({ length: Math.floor((maxStartFloorPossible - 1) / 100) + 1 }, (_, i) => {
                    const floor = 1 + i * 100;
                    return <option key={floor} value={floor}>{floor}階からスタート</option>
                })}
             </select>
             {/* Info about why it is capped */}
             <div className="text-[10px] text-slate-500 mt-1">
                上限: {maxStartFloorPossible}階 
                (スキル: {1 + ((gameState.player.reincarnationUpgrades?.startFloor || 0) * 100)}階 / 実績: {Math.floor(((gameState.player.maxFloorReached || 1) - 1) / 100) * 100 + 1}階)
             </div>
          </div>

          <p className="mt-4 font-bold text-center text-red-400">本当によろしいですか？</p>
        </div>
      </Modal>

      {/* History Modal */}
      <Modal
        isOpen={showHistoryModal}
        title="更新履歴"
        onConfirm={() => setShowHistoryModal(false)}
        onCancel={() => setShowHistoryModal(false)}
        confirmLabel="閉じる"
        cancelLabel=""
      >
         <div className="max-h-[300px] overflow-y-auto space-y-4 pr-2 scrollbar-hide">
            {UPDATE_HISTORY.map((update, i) => (
                <div key={i} className="border-b border-slate-700 pb-2 last:border-0">
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-indigo-400">{update.version}</span>
                        <span className="text-xs text-slate-500">{update.date}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{update.desc}</p>
                </div>
            ))}
         </div>
      </Modal>

      {/* Overview/Help Modal */}
      <Modal
        isOpen={showHelpModal}
        title="ゲーム概要"
        onConfirm={() => setShowHelpModal(false)}
        onCancel={() => setShowHelpModal(false)}
        confirmLabel="閉じる"
        cancelLabel=""
      >
         <div className="max-h-[300px] overflow-y-auto space-y-4 pr-2 scrollbar-hide">
            {GAME_MANUAL.map((section, i) => (
                <div key={i} className="bg-slate-800 p-3 rounded">
                    <h4 className="font-bold text-emerald-400 text-sm mb-1">{section.title}</h4>
                    <p className="text-xs text-slate-300 leading-relaxed">{section.content}</p>
                </div>
            ))}
         </div>
      </Modal>

      {/* Status Modal */}
      <Modal
        isOpen={showStatusModal}
        title="詳細ステータス"
        onConfirm={() => setShowStatusModal(false)}
        onCancel={() => setShowStatusModal(false)}
        confirmLabel="閉じる"
        cancelLabel=""
      >
         <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800 p-2 rounded">
                    <div className="text-xs text-slate-500">基礎攻撃力 (Lv + 補正)</div>
                    <div className="font-bold text-white">
                        {formatNumber(gameState.player.baseAttack + merchantAtk + reincAtk)}
                        <span className="text-[10px] text-slate-400 ml-1">
                            (Base:{gameState.player.baseAttack} + M:{merchantAtk} + R:{reincAtk})
                        </span>
                    </div>
                </div>
                <div className="bg-slate-800 p-2 rounded">
                    <div className="text-xs text-slate-500">職業倍率</div>
                    <div className="font-bold text-violet-400">x{jobMult.toFixed(1)} <span className="text-xs text-slate-400">({gameState.player.job})</span></div>
                </div>
                <div className="bg-slate-800 p-2 rounded">
                    <div className="text-xs text-slate-500">クリティカル率</div>
                    <div className="font-bold text-yellow-400">{critRate}%</div>
                </div>
                <div className="bg-slate-800 p-2 rounded">
                    <div className="text-xs text-slate-500">クリティカル倍率</div>
                    <div className="font-bold text-orange-400">{critDmg}%</div>
                </div>
            </div>
            <div className="bg-slate-800/50 p-2 rounded text-xs text-slate-400">
                <p>※ 攻撃力計算式: (基礎 + 商人補正 + 転生補正 + 装備 + コレクション) × 職業倍率</p>
                <p>※ コレクションボーナス: 所持している全装備の攻撃力の1/5が加算されます。</p>
            </div>
         </div>
      </Modal>
    </div>
  );
};
