

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Player, Equipment, JobType, LogEntry, EquipmentType, MerchantUpgrades, ReincarnationUpgrades, ActiveSkillsState, EquipmentRank } from '../../types';
import { Button } from '../ui/Button';
import { JOB_DEFINITIONS, RANK_DATA, MERCHANT_ITEMS, REINCARNATION_ITEMS } from '../../constants';
import { ProgressBar } from '../ui/ProgressBar';
import { calculateUpgradeCost, formatNumber, getSetBonus, getEnhancementBonusMultiplier, calculateCollectionBonus, getCollectionBonusValue } from '../../utils/mechanics';

// --- Memoized Inventory Item Component ---
interface InventoryListItemProps {
    item: Equipment;
    equippedItem: Equipment | undefined;
    onEquip: (item: Equipment) => void;
    onSynthesize: (item: Equipment) => void;
    canSynthesize: boolean;
}

const InventoryListItem = React.memo(({ item, equippedItem, onEquip, onSynthesize, canSynthesize }: InventoryListItemProps) => {
    const diff = item.power - (equippedItem?.power || 0);
    const isUpgrade = diff > 0;
    const diffColor = isUpgrade ? 'text-emerald-400' : 'text-slate-500';
    const sign = diff > 0 ? '+' : (diff < 0 ? '-' : '');
    const rankColor = item.rank ? RANK_DATA[item.rank].color : 'text-slate-200';
    
    const collectionVal = getCollectionBonusValue(item.power);

    return (
        <div className="flex items-center justify-between bg-slate-800 px-2 py-1.5 rounded hover:bg-slate-750 border border-slate-700/50">
            <div className="flex-1 min-w-0 flex items-center gap-2 text-xs overflow-hidden">
                <span className={`font-medium ${rankColor} truncate flex-shrink-0 max-w-[110px]`}>
                    [T{item.tier}]{item.name}{item.plus > 0 && `+${item.plus}`}
                </span>
                <div className="flex items-center text-slate-400 whitespace-nowrap flex-shrink-0">
                    <span>Atk {formatNumber(item.power)}</span>
                    <span className="text-[10px] text-blue-400 ml-1 font-mono">📦+{formatNumber(collectionVal)}</span>
                    {!item.isEquipped && (
                        <span className={`ml-1 ${diffColor} text-[10px]`}>
                            ({sign}{formatNumber(Math.abs(diff))})
                        </span>
                    )}
                </div>
                <span className="text-[10px] text-slate-500 whitespace-nowrap flex-shrink-0">
                    Rank {item.rank}
                </span>
            </div>
            <div className="flex gap-1 flex-shrink-0 ml-2">
                {canSynthesize && (
                    <Button 
                        size="sm" 
                        variant="success" 
                        className="h-5 text-[10px] px-1.5 py-0"
                        onClick={() => onSynthesize(item)}
                    >
                        {item.plus >= 5 ? '昇格' : '強化'}
                    </Button>
                )}
                {!item.isEquipped && (
                    <Button size="sm" className="h-5 text-[10px] px-2 py-0" onClick={() => onEquip(item)}>装備</Button>
                )}
                {item.isEquipped && (
                    <span className="text-[10px] text-emerald-500 font-bold px-1 flex items-center">E</span>
                )}
            </div>
        </div>
    );
}, (prev, next) => {
    return (
        prev.item === next.item && 
        prev.equippedItem === next.equippedItem &&
        prev.canSynthesize === next.canSynthesize
    );
});


interface ControlTabsProps {
  player: Player;
  inventory: Equipment[];
  equipped: Partial<Record<EquipmentType, Equipment>>;
  logs: LogEntry[];
  onEquip: (item: Equipment) => void;
  onJobChange: (newJob: JobType) => void;
  onBuyUpgrade: (key: keyof MerchantUpgrades) => void;
  onBuyMaxUpgrade: (key: keyof MerchantUpgrades) => void;
  onBuyReincarnationUpgrade: (key: keyof ReincarnationUpgrades) => void;
  onToggleAutoMerchant: (key: keyof MerchantUpgrades) => void;
  onActivateSkill: (skill: 'concentration' | 'vitalSpot' | 'hyperSpeed' | 'awakening') => void;
  canPromote: boolean;
  nextJob: JobType | null;
  activeSkills: ActiveSkillsState;
  totalAttack: number;
  onSynthesize: (baseItem: Equipment) => void;
  onBulkSynthesize: () => void;
  onToggleDropPreference: (type: EquipmentType) => void;
}

export const ControlTabs: React.FC<ControlTabsProps> = ({ 
  player, inventory, equipped, logs, onEquip, onJobChange, onBuyUpgrade, onBuyMaxUpgrade, onBuyReincarnationUpgrade, onToggleAutoMerchant, onActivateSkill, canPromote, nextJob, activeSkills, totalAttack, onSynthesize, onBulkSynthesize, onToggleDropPreference
}) => {
  const [activeTab, setActiveTab] = useState<'equip' | 'job' | 'skill' | 'merchant' | 'reincarnation' | 'log'>('log');
  const [equipTabFilter, setEquipTabFilter] = useState<EquipmentType>(EquipmentType.WEAPON);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (activeTab === 'log') {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, activeTab]);

  const requiredLevelForNext = nextJob ? JOB_DEFINITIONS[nextJob].unlockLevel : 0;
  const hasAutoMerchantSkill = (player.reincarnationUpgrades?.autoMerchant || 0) > 0;
  const discountLevel = player.reincarnationUpgrades?.priceDiscount || 0;
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    if (activeTab === 'reincarnation' || activeTab === 'skill') {
        const interval = setInterval(() => forceUpdate(n => n + 1), 100);
        return () => clearInterval(interval);
    }
  }, [activeTab]);

  const skillPowerLevel = player.reincarnationUpgrades?.skillDamageBoost || 0;
  const skillPowerMultiplier = 1 + ((skillPowerLevel * (skillPowerLevel + 1) * 5) / 100);
  
  const setBonus = getSetBonus(equipped);
  const setBonusAtk = setBonus.atkMult;
  const setBonusSkill = setBonus.skillMult;
  
  // Memoize Collection Bonus Calculation (Heavy operation on large inventories)
  const totalCollectionBonus = useMemo(() => calculateCollectionBonus(equipped, inventory), [equipped, inventory]);

  const activeSkillsBonus = activeSkills.awakening.isActive ? 0.15 : 0;
  const activeSkillsAttackMulti = activeSkills.awakening.isActive ? 2.0 : 1.0;

  // Pre-calculate synthesizable status for all items efficiently O(N)
  const synthesizableIds = useMemo(() => {
      const counts = new Map<string, number>();
      inventory.forEach(item => {
          // Key: type-tier-rank-plus-name
          const key = `${item.type}-${item.tier}-${item.rank}-${item.plus}-${item.name}`;
          counts.set(key, (counts.get(key) || 0) + 1);
      });
      
      const ids = new Set<string>();
      inventory.forEach(item => {
          // Check S rank limit
          if (item.rank === EquipmentRank.S && item.plus >= 5) return;
          
          const key = `${item.type}-${item.tier}-${item.rank}-${item.plus}-${item.name}`;
          if ((counts.get(key) || 0) > 1) {
              ids.add(item.id);
          }
      });
      return ids;
  }, [inventory]);

  // Filter and Sort Inventory (Memoized)
  const filteredInventory = useMemo(() => inventory.filter(item => item.type === equipTabFilter), [inventory, equipTabFilter]);
  const sortedInventory = useMemo(() => {
      return [...filteredInventory].sort((a, b) => {
          // 1. Tier Descending
          if (b.tier !== a.tier) return b.tier - a.tier;
          // 2. Rank Descending (S=4, A=3...)
          const ranks = [EquipmentRank.D, EquipmentRank.C, EquipmentRank.B, EquipmentRank.A, EquipmentRank.S];
          if (a.rank !== b.rank) return ranks.indexOf(b.rank) - ranks.indexOf(a.rank);
          // 3. Plus Value Descending
          return b.plus - a.plus;
      });
  }, [filteredInventory]);

  const renderEquipRow = (type: EquipmentType, label: string) => {
      const item = equipped[type];
      const canSynthesize = item && synthesizableIds.has(item.id);

      return (
        <tr className="border-b border-slate-700 bg-slate-800/50 hover:bg-slate-800">
            <td className="p-1.5 text-xs text-slate-400 whitespace-nowrap">{label}</td>
            <td className="p-1.5 w-full">
                {item ? (
                    <div className="flex items-center gap-2 whitespace-nowrap overflow-hidden">
                        <span className={`text-sm font-medium ${RANK_DATA[item.rank].color}`}>
                            [T{item.tier}]{item.name} {item.plus > 0 && `+${item.plus}`}
                        </span>
                        <span className="text-[10px] text-slate-500">| Rank {item.rank}</span>
                    </div>
                ) : <span className="text-slate-600 text-xs">なし</span>}
            </td>
            <td className="p-1.5 text-right font-mono text-xs text-red-300 whitespace-nowrap">
                {item ? formatNumber(item.power) : '-'}
            </td>
            <td className="p-1.5 text-center">
                {canSynthesize && (
                    <Button 
                        size="sm" 
                        variant="success" 
                        className="text-[10px] h-5 px-1.5 py-0"
                        onClick={() => onSynthesize(item!)}
                    >
                        {item!.plus >= 5 ? '昇格' : '強化'}
                    </Button>
                )}
            </td>
        </tr>
      );
  };

  return (
    <div className="bg-slate-900 border-t border-slate-700 flex flex-col flex-1 min-h-0">
      <div className="flex border-b border-slate-700 overflow-x-auto flex-shrink-0">
        {(['equip', 'job', 'skill', 'merchant', 'reincarnation', 'log'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 px-3 text-xs sm:text-sm font-medium capitalize transition-colors whitespace-nowrap
              ${activeTab === tab 
                ? 'text-indigo-400 border-b-2 border-indigo-400 bg-slate-800' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
          >
            {tab === 'equip' ? '装備' : tab === 'job' ? '職業' : tab === 'skill' ? 'スキル' : tab === 'merchant' ? '商人' : tab === 'reincarnation' ? '転生' : 'ログ'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden relative flex flex-col">
        
        {/* LOGS TAB */}
        {activeTab === 'log' && (
          <div className="flex-1 overflow-y-auto p-4 scrollbar-hide space-y-1 font-mono text-xs">
            {logs.length === 0 && <div className="text-slate-500 italic">戦闘ログはまだありません</div>}
            {logs.map(log => (
              <div key={log.id} className={`
                ${log.type === 'damage' ? 'text-slate-300' : ''}
                ${log.type === 'gain' ? 'text-amber-300' : ''}
                ${log.type === 'info' ? 'text-blue-300' : ''}
                ${log.type === 'boss' ? 'text-purple-400 font-bold' : ''}
                ${log.type === 'danger' ? 'text-red-400 font-bold' : ''}
                ${log.type === 'crit' ? 'text-yellow-400 font-bold' : ''}
              `}>
                <span className="opacity-50 mr-2">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}]</span>
                {log.message}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        )}

        {/* EQUIPMENT TAB */}
        {activeTab === 'equip' && (
          <div className="flex flex-col h-full p-4 gap-4">
            {/* Equipped Table */}
            <div className="flex-shrink-0 rounded-lg border border-slate-700 overflow-x-auto scrollbar-hide">
                <table className="min-w-full text-left">
                    <thead>
                        <tr className="bg-slate-800 text-slate-400 text-[10px]">
                            <th className="p-1.5 font-normal whitespace-nowrap w-12">部位</th>
                            <th className="p-1.5 font-normal whitespace-nowrap">装備</th>
                            <th className="p-1.5 font-normal text-right whitespace-nowrap">ATK</th>
                            <th className="p-1.5 font-normal text-center whitespace-nowrap px-2">強化</th>
                        </tr>
                    </thead>
                    <tbody>
                        {renderEquipRow(EquipmentType.WEAPON, '武器')}
                        {renderEquipRow(EquipmentType.HELM, '兜')}
                        {renderEquipRow(EquipmentType.ARMOR, '鎧')}
                        {renderEquipRow(EquipmentType.SHIELD, '盾')}
                        {/* Set Bonus Row */}
                        <tr className="bg-indigo-900/20 border-t border-slate-700">
                            <td className="p-1.5 text-[10px] text-indigo-300 font-bold whitespace-nowrap">セット</td>
                            <td colSpan={3} className="p-1.5 text-[10px]">
                                {setBonus.count >= 2 ? (
                                    <div className="flex items-center gap-2 whitespace-nowrap">
                                        <span className="font-bold text-white">Tier {setBonus.activeTier} ({setBonus.count}揃)</span>
                                        <div className="flex gap-2 text-emerald-400">
                                            <span>攻x{setBonus.atkMult}</span>
                                            {setBonus.skillMult > 1 && <span>技x{setBonus.skillMult}</span>}
                                            {setBonus.critAdd > 0 && <span>会心+{setBonus.critAdd}%</span>}
                                        </div>
                                    </div>
                                ) : (
                                    <span className="text-slate-500 italic whitespace-nowrap">同じTierを2つ以上装備で効果発動</span>
                                )}
                            </td>
                        </tr>
                        {/* Collection Bonus Row */}
                        <tr className="bg-blue-900/20 border-t border-slate-700">
                            <td className="p-1.5 text-[10px] text-blue-300 font-bold whitespace-nowrap">収集</td>
                            <td colSpan={3} className="p-1.5 text-[10px]">
                                <div className="flex items-center gap-2 whitespace-nowrap">
                                    <span className="font-bold text-white">全装備ボーナス</span>
                                    <span className="text-blue-400">📦+{formatNumber(totalCollectionBonus)}</span>
                                    <span className="text-slate-500 text-[9px]">(所持装備合計ATKの20%)</span>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Inventory Section */}
            <div className="flex-1 flex flex-col min-h-0">
              <div className="flex items-center justify-between mb-2 flex-shrink-0">
                  <h4 className="text-sm font-bold text-slate-300">インベントリ ({inventory.length})</h4>
                  <Button 
                    size="sm" 
                    variant="primary" 
                    className="text-[10px] h-6 px-2"
                    onClick={onBulkSynthesize}
                  >
                      一括強化
                  </Button>
              </div>
              
              {/* Filter Tabs */}
              <div className="flex gap-1 mb-2 flex-shrink-0">
                  {[EquipmentType.WEAPON, EquipmentType.HELM, EquipmentType.ARMOR, EquipmentType.SHIELD].map(t => (
                      <button 
                        key={t}
                        onClick={() => setEquipTabFilter(t)}
                        className={`flex-1 py-1 text-[10px] rounded border ${
                            equipTabFilter === t 
                            ? 'bg-slate-700 border-slate-500 text-white' 
                            : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700'
                        }`}
                      >
                          {t === 'WEAPON' ? '武器' : t === 'HELM' ? '兜' : t === 'ARMOR' ? '鎧' : '盾'}
                      </button>
                  ))}
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-1 scrollbar-hide">
                {filteredInventory.length === 0 && <div className="text-sm text-slate-500 text-center py-8">空っぽです</div>}
                {sortedInventory.map(item => (
                    <InventoryListItem 
                        key={item.id}
                        item={item}
                        equippedItem={equipped[item.type]}
                        onEquip={onEquip}
                        onSynthesize={onSynthesize}
                        canSynthesize={synthesizableIds.has(item.id)}
                    />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* JOB TAB */}
        {activeTab === 'job' && (
          <div className="flex-1 overflow-y-auto p-4 scrollbar-hide space-y-4">
            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 text-center">
               <div className="text-sm text-slate-400 mb-1">現在の職業</div>
               <div className="text-2xl font-bold text-violet-400 mb-1">{player.job}</div>
               <div className="text-sm text-slate-300">Lv. {player.jobLevel} / {nextJob ? JOB_DEFINITIONS[nextJob].unlockLevel : 20}</div>
               <div className="text-xs text-slate-500 mt-2">
                 攻撃力倍率: <span className="text-white">x{JOB_DEFINITIONS[player.job].multiplier.toFixed(1)}</span>
               </div>
            </div>

            {nextJob ? (
               <div className={`p-4 rounded-lg border text-center transition-all ${canPromote ? 'bg-indigo-900/30 border-indigo-500' : 'bg-slate-800/50 border-slate-700 opacity-70'}`}>
                 <div className="text-sm text-slate-400 mb-2">次のクラス</div>
                 <div className="text-lg font-bold text-white mb-2">{nextJob}</div>
                 {canPromote ? (
                   <Button variant="success" className="w-full animate-pulse" onClick={() => onJobChange(nextJob)}>
                     転職する！
                   </Button>
                 ) : (
                   <div className="text-xs text-slate-500">
                     Lv.{requiredLevelForNext} で解放されます
                   </div>
                 )}
               </div>
            ) : (
              <div className="text-center text-amber-500 font-bold py-4">
                あなたは伝説の頂点に達しました！
              </div>
            )}
          </div>
        )}

        {/* SKILL TAB */}
        {activeTab === 'skill' && (
          <div className="flex-1 overflow-y-auto p-4 scrollbar-hide space-y-3">
             {JOB_DEFINITIONS[player.job].skills.map((skill, idx) => {
               const mastery = player.skillMastery[skill.name] || { level: 0, count: 0 };
               
               const concentrationBonus = activeSkills.concentration.isActive ? 0.3 : 0;
               const effectiveRate = skill.triggerRate + (mastery.level * 0.01) + concentrationBonus + activeSkillsBonus;
               const TRIGGER_CAP = 0.5;

               let rateDisplay = "";
               let excessRateBonus = 0;
               
               if (effectiveRate > TRIGGER_CAP) {
                   const excess = Math.round((effectiveRate - TRIGGER_CAP) * 100);
                   rateDisplay = `50% (威力+${excess}%)`;
                   excessRateBonus = (effectiveRate - TRIGGER_CAP);
               } else {
                   rateDisplay = `${(effectiveRate * 100).toFixed(0)}% 発動`;
               }

               const excessMultiplier = 1.0 + excessRateBonus;
               const displayMultiplier = skill.damageMultiplier * skillPowerMultiplier * excessMultiplier * setBonusSkill;
               const estimatedDamage = Math.floor((totalAttack * activeSkillsAttackMulti) * displayMultiplier);
               
               return (
                 <div key={idx} className="bg-slate-800 p-3 rounded border border-slate-700 flex flex-col gap-2">
                   <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-indigo-300">{skill.name}</span>
                        {mastery.level > 0 && <span className="text-xs bg-indigo-900 text-indigo-200 px-1.5 rounded">Lv.{mastery.level}</span>}
                      </div>
                      <div className="text-right">
                          <span className={`text-xs px-2 py-1 rounded font-bold block ${effectiveRate > TRIGGER_CAP ? 'bg-amber-900/50 text-amber-400 border border-amber-500/50' : 'bg-slate-900 text-blue-400'}`}>
                            {rateDisplay}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                             威力: <span className="text-red-300 font-bold">x{displayMultiplier.toFixed(2)} ({formatNumber(estimatedDamage)})</span>
                          </span>
                      </div>
                   </div>
                   <div className="text-xs text-slate-400">{skill.description}</div>
                   
                   <div className="mt-1">
                      <div className="flex justify-between text-[10px] text-slate-500 mb-0.5">
                        <span>次のレベルまで</span>
                        <span>{mastery.count} / 10</span>
                      </div>
                      <ProgressBar value={mastery.count} max={10} color="bg-indigo-500" height="h-1" />
                   </div>
                 </div>
               );
             })}
          </div>
        )}

        {/* MERCHANT TAB */}
        {activeTab === 'merchant' && (
           <div className="flex-1 overflow-y-auto p-4 scrollbar-hide space-y-4">
              <div className="bg-amber-900/20 p-3 rounded border border-amber-800 text-center relative">
                <span className="text-amber-500 font-bold text-sm">💰 所持金: {formatNumber(player.gold)} G</span>
                {discountLevel > 0 && (
                     <div className="absolute right-2 top-2 text-[10px] text-emerald-400 font-mono">
                         割引: -{Math.min(99, (discountLevel * (discountLevel + 1)) / 2)}%
                     </div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3">
                {MERCHANT_ITEMS.map((item) => {
                  const currentLevel = player.merchantUpgrades?.[item.key] || 0;
                  const cost = calculateUpgradeCost(item.baseCost, currentLevel, discountLevel);
                  
                  // Crit Rate Cap Check (Max 50%)
                  const isMaxed = item.key === 'critRate' && currentLevel >= 50;
                  const canAfford = player.gold >= cost && !isMaxed;
                  
                  const getMerchantEffectDisplay = (key: keyof MerchantUpgrades, level: number) => {
                    const nextLevel = level + 1;
                    const quad = (n: number) => n * (n + 1);
                
                    switch(key) {
                      case 'attackBonus':
                        return { label: '攻撃力強化', curr: `+${quad(level) * 10}`, next: `+${quad(nextLevel) * 10}`, unit: '' };
                      case 'critRate':
                        return { label: 'クリティカル率', curr: `${Math.min(50, level)}`, next: `${Math.min(50, nextLevel)}`, unit: '%' };
                      case 'critDamage':
                        // Base 30% + Lv * (Lv+1) * 2%
                        return { label: 'クリティカル威力', curr: `+${30 + quad(level) * 2}`, next: `+${30 + quad(nextLevel) * 2}`, unit: '%' };
                      case 'giantKilling':
                        return { label: '対ボス', curr: `+${level * 2}`, next: `+${nextLevel * 2}`, unit: '%' };
                      case 'weaponBoost':
                      case 'helmBoost':
                      case 'armorBoost':
                      case 'shieldBoost':
                        return { label: '装備補正', curr: `+${quad(level)}`, next: `+${quad(nextLevel)}`, unit: '%' };
                      default:
                        return { label: '', curr: '', next: '', unit: '' };
                    }
                  };
                  
                  const effect = getMerchantEffectDisplay(item.key, currentLevel);

                  return (
                    <div key={item.key} className="bg-slate-800 p-3 rounded border border-slate-700 flex justify-between items-center gap-2">
                       <div className="flex-1">
                         <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-200 text-sm">{item.name}</span>
                            <span className="text-xs bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded">Lv.{currentLevel}</span>
                            
                            {hasAutoMerchantSkill && (
                                <label className="flex items-center gap-1 cursor-pointer ml-auto mr-2 bg-slate-900 px-2 py-1 rounded border border-slate-600 hover:border-indigo-500">
                                    <input 
                                        type="checkbox" 
                                        checked={player.autoMerchantKeys?.[item.key] || false}
                                        onChange={() => onToggleAutoMerchant(item.key)}
                                        className="accent-indigo-500 h-3 w-3"
                                    />
                                    <span className="text-[10px] text-slate-300 font-bold select-none">自動</span>
                                </label>
                            )}
                         </div>
                         <div className="text-xs text-slate-400 mt-1">{item.desc}</div>
                         
                         {effect.label && !isMaxed && (
                            <div className="text-xs font-mono mt-1 text-emerald-400 flex items-center gap-1">
                               <span>{effect.label}:</span>
                               <span className="text-white">{effect.curr}{effect.unit}</span>
                               <span className="text-slate-500">→</span>
                               <span className="font-bold text-emerald-300">{effect.next}{effect.unit}</span>
                            </div>
                         )}
                         {isMaxed && effect.label && (
                             <div className="text-xs font-mono mt-1 text-emerald-400">
                                {effect.label}: MAX ({effect.curr}{effect.unit})
                             </div>
                         )}

                       </div>

                       <div className="flex flex-col gap-1 items-end">
                            {!isMaxed && (
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    disabled={!canAfford}
                                    onClick={() => onBuyMaxUpgrade(item.key)}
                                    className={`min-w-[80px] h-6 text-[10px] ${canAfford ? 'bg-amber-800/50 hover:bg-amber-700/50 text-amber-200' : 'opacity-30'}`}
                                >
                                    全購入
                                </Button>
                            )}

                            <Button 
                                size="sm" 
                                variant={canAfford ? 'primary' : 'secondary'}
                                disabled={!canAfford}
                                onClick={() => onBuyUpgrade(item.key)}
                                repeatOnHold={true}
                                className={`min-w-[80px] text-xs flex flex-col items-center justify-center h-10 ${canAfford ? 'bg-amber-600 hover:bg-amber-500' : 'opacity-50 cursor-not-allowed'}`}
                            >
                                {isMaxed ? (
                                    <div className="font-bold text-slate-300">MAX</div>
                                ) : (
                                    <>
                                        <div>購入</div>
                                        <div className="font-mono text-[10px]">{formatNumber(cost)}G</div>
                                    </>
                                )}
                            </Button>
                       </div>
                    </div>
                  );
                })}
              </div>
           </div>
        )}

        {/* REINCARNATION TAB */}
        {activeTab === 'reincarnation' && (
           <div className="flex-1 overflow-y-auto p-4 scrollbar-hide space-y-4">
              <div className="bg-purple-900/20 p-3 rounded border border-purple-800 text-center">
                <span className="text-purple-400 font-bold text-sm">🔮 転生石: {formatNumber(player.reincarnationStones)} 個</span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {REINCARNATION_ITEMS.map((item) => {
                  const currentLevel = player.reincarnationUpgrades?.[item.key] || 0;
                  
                  const isOneTime = ['autoPromote', 'autoEquip', 'autoMerchant', 'itemFilter', 'farming', 'autoEnhance'].includes(item.key);
                  const isThreeStep = item.key === 'itemPersistence';
                  
                  // Check for 99% Cap for Price Discount and Enemy HP Down
                  const isPercentageCap = ['priceDiscount', 'enemyHpDown'].includes(item.key);
                  const percentValue = (currentLevel * (currentLevel + 1)) / 2;
                  const isCapped = isPercentageCap && percentValue >= 99;

                  const isMaxed = (isOneTime && currentLevel >= 1) || isCapped || (isThreeStep && currentLevel >= 3);

                  const cost = calculateUpgradeCost(item.baseCost, isOneTime ? 0 : currentLevel, 0, item.key);
                  const canAfford = player.reincarnationStones >= cost && !isMaxed;
                  
                  // Drop Filter Special UI
                  let customUI = null;
                  if (item.key === 'itemFilter' && currentLevel > 0) {
                      customUI = (
                          <div className="mt-2 grid grid-cols-4 gap-1">
                              {[EquipmentType.WEAPON, EquipmentType.HELM, EquipmentType.ARMOR, EquipmentType.SHIELD].map(type => {
                                  const isActive = player.dropPreferences?.[type] ?? true;
                                  const typeLabels: Record<EquipmentType, string> = { 
                                      [EquipmentType.WEAPON]: '武器', 
                                      [EquipmentType.HELM]: '兜', 
                                      [EquipmentType.ARMOR]: '鎧', 
                                      [EquipmentType.SHIELD]: '盾' 
                                  };
                                  return (
                                      <button 
                                        key={type}
                                        onClick={() => onToggleDropPreference(type)}
                                        className={`
                                            py-1 px-1 rounded text-[10px] font-bold border transition-colors
                                            ${isActive 
                                                ? 'bg-emerald-800 border-emerald-500 text-emerald-100 hover:bg-emerald-700' 
                                                : 'bg-slate-900 border-slate-700 text-slate-500 hover:bg-slate-800'
                                            }
                                        `}
                                      >
                                          {typeLabels[type]}
                                          <div className="text-[9px]">{isActive ? 'ON' : 'OFF'}</div>
                                      </button>
                                  );
                              })}
                          </div>
                      );
                  }

                  let activeSkillUI = null;
                  const activeSkillKey = item.key as keyof ActiveSkillsState;
                  if (['concentration', 'vitalSpot', 'hyperSpeed', 'awakening'].includes(item.key) && currentLevel > 0) {
                      const skillState = activeSkills[activeSkillKey];
                      const now = Date.now();
                      const timeLeft = Math.max(0, skillState.endTime - now);
                      const cooldownLeft = Math.max(0, skillState.cooldownEnd - now);
                      
                      const durationSec = item.key === 'hyperSpeed' 
                          ? 10 + ((currentLevel - 1) * 5) 
                          : 10 + currentLevel; // Other skills base logic (may differ in App.tsx)

                      activeSkillUI = (
                          <div className="mt-2 w-full">
                              {skillState.isActive ? (
                                  <div className="space-y-1">
                                      <div className="flex justify-between text-[10px] text-emerald-400 font-bold">
                                          <span>効果発動中！</span>
                                          <span>{(timeLeft / 1000).toFixed(1)}s</span>
                                      </div>
                                      <ProgressBar value={timeLeft} max={skillState.duration} color="bg-emerald-500" height="h-2" />
                                  </div>
                              ) : cooldownLeft > 0 ? (
                                  <div className="text-center text-xs text-slate-400 bg-slate-900/50 rounded py-1 border border-slate-700">
                                      再使用まで: <span className="text-white font-mono">{Math.ceil(cooldownLeft / 1000)}秒</span>
                                  </div>
                              ) : (
                                  <Button 
                                    size="sm" 
                                    onClick={() => onActivateSkill(item.key as any)}
                                    className="w-full bg-emerald-700 hover:bg-emerald-600 border-emerald-500 text-xs font-bold animate-pulse"
                                  >
                                      発動する ({durationSec}s)
                                  </Button>
                              )}
                          </div>
                      );
                  }
                  
                  const getReincarnationEffectDisplay = (key: keyof ReincarnationUpgrades, level: number) => {
                    const nextLevel = level + 1;
                    const quad = (n: number) => n * (n + 1);
                
                    switch(key) {
                        case 'priceDiscount':
                            const calcDiscount = (n: number) => Math.min(99, (n * (n + 1)) / 2);
                            return { label: '割引', curr: `-${calcDiscount(level)}`, next: `-${calcDiscount(nextLevel)}`, unit: '%' };
                        case 'xpBoost':
                            return { label: '経験値', curr: `+${quad(level)}`, next: `+${quad(nextLevel)}`, unit: '%' };
                        case 'goldBoost':
                            return { label: 'ゴールド', curr: `+${quad(level)}`, next: `+${quad(nextLevel)}`, unit: '%' };
                        case 'stoneBoost':
                            return { label: '転生石', curr: `+${quad(level)}`, next: `+${quad(nextLevel)}`, unit: '%' };
                        case 'baseAttackBoost':
                            return { label: '基礎攻撃', curr: `+${quad(level) * 50}`, next: `+${quad(nextLevel) * 50}`, unit: '' };
                        case 'enemyHpDown':
                            const calcHpDown = (n: number) => Math.min(99, (n * (n + 1)) / 2);
                            return { label: '敵HP', curr: `-${calcHpDown(level)}`, next: `-${calcHpDown(nextLevel)}`, unit: '%' };
                        case 'skillDamageBoost':
                            return { label: 'スキル威力', curr: `+${quad(level) * 5}`, next: `+${quad(nextLevel) * 5}`, unit: '%' };
                        default:
                            return null;
                    }
                  };

                  const effect = getReincarnationEffectDisplay(item.key, currentLevel);
                  let effectDisplay = null;
                  if (effect) {
                      effectDisplay = (
                        <div className="text-xs font-mono mt-1 text-emerald-400 flex items-center gap-1">
                           <span>{effect.label}:</span>
                           <span className="text-white">{effect.curr}{effect.unit}</span>
                           {!isMaxed && (
                               <>
                                   <span className="text-slate-500">→</span>
                                   <span className="font-bold text-emerald-300">{effect.next}{effect.unit}</span>
                               </>
                           )}
                           {isMaxed && <span className="text-emerald-300 ml-1">(MAX)</span>}
                        </div>
                      );
                  }

                  return (
                    <div key={item.key} className="bg-slate-800 p-3 rounded border border-slate-700 flex justify-between gap-2">
                       <div className="flex-1 flex flex-col justify-center">
                         <div className="flex items-center gap-2">
                            <span className="font-bold text-purple-200 text-sm">{item.name}</span>
                            {!isOneTime && (
                                <span className="text-xs bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded">Lv.{currentLevel}</span>
                            )}
                            {isOneTime && isMaxed && (
                                <span className="text-xs bg-green-900 text-green-400 px-1.5 py-0.5 rounded">習得済み</span>
                            )}
                         </div>
                         <div className="text-xs text-purple-300/70 mt-0.5">{item.desc}</div>
                         {effectDisplay}
                         {activeSkillUI}
                         {customUI}
                       </div>
                       
                       <div className="flex items-center">
                            <Button 
                                size="sm" 
                                variant={canAfford ? 'primary' : 'secondary'}
                                disabled={!canAfford}
                                onClick={() => onBuyReincarnationUpgrade(item.key)}
                                repeatOnHold={!isOneTime && !isThreeStep && !isMaxed}
                                className={`min-w-[80px] text-xs flex flex-col items-center justify-center h-10 ${canAfford ? 'bg-purple-600 hover:bg-purple-500' : 'opacity-50 cursor-not-allowed'}`}
                            >
                                {isMaxed ? (
                                    <div className="font-bold text-slate-300">MAX</div>
                                ) : (
                                    <>
                                        <div>習得</div>
                                        <div className="font-mono text-[10px]">{formatNumber(cost)}個</div>
                                    </>
                                )}
                            </Button>
                       </div>
                    </div>
                  );
                })}
              </div>
           </div>
        )}
      </div>
    </div>
  );
};
