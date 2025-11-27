import React, { useState } from 'react';
import { Player, Equipment, JobType, MerchantUpgrades, ReincarnationUpgrades } from './types';
import { JOB_DEFINITIONS, JOB_ORDER, MERCHANT_ITEMS, REINCARNATION_ITEMS, UPDATE_HISTORY, GAME_MANUAL } from './constants';
import { calculateTotalAttack, createLog, calculateReincarnationStones, calculateUpgradeCost, generateEnemy, formatNumber } from './utils/mechanics';
import { StatusHeader } from './components/panels/StatusHeader';
import { BattleView } from './components/panels/BattleView';
import { ControlTabs } from './components/panels/ControlTabs';
import { Modal } from './components/ui/Modal';
import { useGameState } from './hooks/useGameState';
import { useGameLoop } from './hooks/useGameLoop';
import { BOSS_TIME_LIMIT } from './constants';

const App: React.FC = () => {
  // Use Custom Hooks
  const { gameState, setGameState, stateRef, addLog, INITIAL_PLAYER, INITIAL_STATE } = useGameState();
  const [gameSpeed, setGameSpeed] = useState(1);
  
  useGameLoop({ stateRef, setGameState, addLog, gameSpeed });

  const [showReincarnationModal, setShowReincarnationModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);

  const toggleHardMode = () => {
    setGameState(prev => {
      const newState = !prev.hardMode;
      const newEnemy = generateEnemy(prev.player.floor, newState);
      return { 
        ...prev, 
        hardMode: newState, 
        enemy: newEnemy, 
        bossTimer: newEnemy.isBoss ? BOSS_TIME_LIMIT : null,
        logs: [...prev.logs.slice(-49), createLog(newState ? '難易度x10モード: ON！敵が強くなりました！' : '難易度x10モード: OFF', 'info')]
      };
    });
  };

  // Handlers
  const handleEquip = (item: Equipment) => {
    setGameState(prev => {
      const newEquipped = { ...prev.equipped };
      const oldItem = newEquipped[item.type];
      
      newEquipped[item.type] = { ...item, isEquipped: true };
      
      const newInventory = prev.inventory.map(i => {
        if (i.id === item.id) return { ...i, isEquipped: true };
        if (oldItem && i.id === oldItem.id) return { ...i, isEquipped: false };
        return i;
      });

      return {
        ...prev,
        equipped: newEquipped,
        inventory: newInventory,
        logs: [...prev.logs.slice(-49), createLog(`${item.name}を装備しました`, 'info')]
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

  const handleBuyUpgrade = (key: keyof MerchantUpgrades) => {
    setGameState(prev => {
      const level = prev.player.merchantUpgrades[key] || 0;
      const item = MERCHANT_ITEMS.find(i => i.key === key);
      if (!item) return prev;
      
      const cost = calculateUpgradeCost(item.baseCost, level);
      if (prev.player.gold < cost) return prev;

      return {
        ...prev,
        player: {
          ...prev.player,
          gold: prev.player.gold - cost,
          merchantUpgrades: {
            ...prev.player.merchantUpgrades,
            [key]: level + 1
          }
        },
        logs: [...prev.logs.slice(-49), createLog(`${item.name}をLv.${level + 1}に強化しました`, 'gain')]
      };
    });
  };

  const handleBuyReincarnationUpgrade = (key: keyof ReincarnationUpgrades) => {
    setGameState(prev => {
      const level = prev.player.reincarnationUpgrades[key] || 0;
      const item = REINCARNATION_ITEMS.find(i => i.key === key);
      if (!item) return prev;
      
      const cost = calculateUpgradeCost(item.baseCost, level);
      if (prev.player.reincarnationStones < cost) return prev;

      return {
        ...prev,
        player: {
          ...prev.player,
          reincarnationStones: prev.player.reincarnationStones - cost,
          reincarnationUpgrades: {
            ...prev.player.reincarnationUpgrades,
            [key]: level + 1
          }
        },
        logs: [...prev.logs.slice(-49), createLog(`${item.name}をLv.${level + 1}に強化しました`, 'gain')]
      };
    });
  };

  const confirmReincarnation = () => {
    const current = stateRef.current;
    
    // Calculate Stones with Boost
    const stoneBoost = (current.player.reincarnationUpgrades?.stoneBoost || 0) * 0.01;
    const multiplier = 1 + stoneBoost;
    const stonesToGain = calculateReincarnationStones(current.player.floor, multiplier);
    
    // Calculate Start Floor with Max Reached Limit
    const startFloorLevel = current.player.reincarnationUpgrades?.startFloor || 0;
    const targetStartFloor = 1 + (startFloorLevel * 100);
    const newFloor = Math.min(targetStartFloor, current.player.maxFloorReached || 1);

    const newPlayer: Player = {
      ...INITIAL_PLAYER,
      reincarnationStones: current.player.reincarnationStones + stonesToGain,
      reincarnationUpgrades: current.player.reincarnationUpgrades,
      merchantUpgrades: { ...INITIAL_PLAYER.merchantUpgrades },
      floor: newFloor,
      maxFloorReached: current.player.maxFloorReached, // Preserve max record
    };

    const firstEnemy = generateEnemy(newFloor, current.hardMode);

    setGameState({
      ...INITIAL_STATE,
      player: newPlayer,
      hardMode: current.hardMode, 
      enemy: firstEnemy,
      bossTimer: firstEnemy.isBoss ? BOSS_TIME_LIMIT : null,
      logs: [
        createLog(`転生しました！ 転生石 ${stonesToGain}個を獲得。`, 'info'),
        createLog(`${firstEnemy.name}が現れた！ (HP: ${firstEnemy.maxHp})`, 'info')
      ],
    });
    setShowReincarnationModal(false);
  };

  const nextJob = JOB_ORDER.indexOf(gameState.player.job) < JOB_ORDER.length - 1 
    ? JOB_ORDER[JOB_ORDER.indexOf(gameState.player.job) + 1] 
    : null;
    
  const canPromote = nextJob 
    ? gameState.player.jobLevel >= JOB_DEFINITIONS[nextJob].unlockLevel 
    : false;

  const totalAttack = calculateTotalAttack(gameState.player, gameState.equipped);
  const stoneBoost = (gameState.player.reincarnationUpgrades?.stoneBoost || 0) * 0.01;
  const currentReincarnationStones = calculateReincarnationStones(gameState.player.floor, 1 + stoneBoost);

  // Calculate potential start floor for modal display
  const startFloorLevel = gameState.player.reincarnationUpgrades?.startFloor || 0;
  const potentialStartFloor = 1 + (startFloorLevel * 100);
  const actualStartFloor = Math.min(potentialStartFloor, gameState.player.maxFloorReached || 1);

  // Status Modal Calculations
  const merchantAtk = (gameState.player.merchantUpgrades?.attackBonus || 0) * 10;
  const reincAtk = (gameState.player.reincarnationUpgrades?.baseAttackBoost || 0) * 100;
  const jobMult = JOB_DEFINITIONS[gameState.player.job].multiplier;
  const critRate = (gameState.player.merchantUpgrades?.critRate || 0);
  const critDmg = 150 + (gameState.player.merchantUpgrades?.critDamage || 0) * 10;
  const dropS = (gameState.player.reincarnationUpgrades?.equipSProb || 0);
  const dropA = (gameState.player.reincarnationUpgrades?.equipAProb || 0);

  return (
    <div className="max-w-md mx-auto h-screen flex flex-col bg-slate-950 text-slate-200 font-sans shadow-2xl overflow-hidden relative">
      <StatusHeader 
        player={gameState.player} 
        totalAttack={totalAttack} 
        hardMode={gameState.hardMode}
        onToggleHardMode={toggleHardMode}
        onReincarnateClick={() => setShowReincarnationModal(true)}
        gameSpeed={gameSpeed}
        onSetGameSpeed={setGameSpeed}
        onOpenUpdates={() => setShowHistoryModal(true)}
        onOpenHelp={() => setShowHelpModal(true)}
        onOpenStatus={() => setShowStatusModal(true)}
      />

      <BattleView 
        enemy={gameState.enemy} 
        player={gameState.player} 
        bossTimer={gameState.bossTimer}
        logs={gameState.logs}
      />

      <ControlTabs 
        player={gameState.player}
        inventory={gameState.inventory}
        equipped={gameState.equipped}
        logs={gameState.logs}
        onEquip={handleEquip}
        onJobChange={handleJobChange}
        onBuyUpgrade={handleBuyUpgrade}
        onBuyReincarnationUpgrade={handleBuyReincarnationUpgrade}
        canPromote={canPromote}
        nextJob={nextJob}
      />

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
             {stoneBoost > 0 && <span className="text-xs ml-2 text-green-400">(+{Math.round(stoneBoost*100)}%)</span>}
          </p>
          <ul className="list-disc list-inside text-slate-400 space-y-1 mt-2">
            <li>レベル、所持金、アイテム、装備が<span className="text-red-400">全てリセット</span>されます。</li>
            <li>職業は「初心者」に戻ります。</li>
            <li>転生スキルと転生石は引き継がれます。</li>
            <li>
                次の開始階層: <span className="text-white">{actualStartFloor}階</span>
                {potentialStartFloor > actualStartFloor && (
                  <div className="text-xs text-orange-400 ml-5">
                    (スキル効果: {potentialStartFloor}階ですが、過去最高到達階層 {gameState.player.maxFloorReached}階に制限されます)
                  </div>
                )}
            </li>
          </ul>
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
                    <p className="text-xs text-slate-300 leading-relaxed">{update.desc}</p>
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
                <div className="bg-slate-800 p-2 rounded col-span-2">
                    <div className="text-xs text-slate-500 mb-1">レア装備ドロップ補正 (転生スキル)</div>
                    <div className="flex gap-4">
                        <div className="text-yellow-400 font-bold">Sランク: +{dropS}%</div>
                        <div className="text-red-400 font-bold">Aランク: +{dropA}%</div>
                    </div>
                </div>
            </div>
            <div className="bg-slate-800/50 p-2 rounded text-xs text-slate-400">
                <p>※ 攻撃力計算式: (基礎 + 装備) x 職業倍率 x その他補正</p>
            </div>
         </div>
      </Modal>

    </div>
  );
};

export default App;
