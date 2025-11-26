import React, { useState, useEffect, useRef } from 'react';
import { Player, Equipment, JobType, LogEntry, EquipmentType, JobData, MerchantUpgrades } from '../../types';
import { Button } from '../ui/Button';
import { JOB_DEFINITIONS, JOB_ORDER, RANK_DATA, MERCHANT_ITEMS } from '../../constants';
import { ProgressBar } from '../ui/ProgressBar';
import { calculateUpgradeCost } from '../../utils/mechanics';

interface ControlTabsProps {
  player: Player;
  inventory: Equipment[];
  equipped: Partial<Record<EquipmentType, Equipment>>;
  logs: LogEntry[];
  onEquip: (item: Equipment) => void;
  onJobChange: (newJob: JobType) => void;
  onBuyUpgrade: (key: keyof MerchantUpgrades) => void;
  canPromote: boolean;
  nextJob: JobType | null;
}

export const ControlTabs: React.FC<ControlTabsProps> = ({ 
  player, inventory, equipped, logs, onEquip, onJobChange, onBuyUpgrade, canPromote, nextJob
}) => {
  const [activeTab, setActiveTab] = useState<'equip' | 'job' | 'skill' | 'merchant' | 'log'>('log');
  const logEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (activeTab === 'log') {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, activeTab]);

  const requiredLevelForNext = nextJob ? JOB_DEFINITIONS[nextJob].unlockLevel : 0;

  return (
    <div className="bg-slate-900 border-t border-slate-700 flex flex-col h-[400px]">
      {/* Tabs */}
      <div className="flex border-b border-slate-700 overflow-x-auto">
        {(['equip', 'job', 'skill', 'merchant', 'log'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 px-3 text-xs sm:text-sm font-medium capitalize transition-colors whitespace-nowrap
              ${activeTab === tab 
                ? 'text-indigo-400 border-b-2 border-indigo-400 bg-slate-800' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
          >
            {tab === 'equip' ? '装備' : tab === 'job' ? '職業' : tab === 'skill' ? 'スキル' : tab === 'merchant' ? '商人' : 'ログ'}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
        
        {/* LOGS TAB */}
        {activeTab === 'log' && (
          <div className="space-y-1 font-mono text-xs">
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
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-800 p-2 rounded border border-slate-700">
                <div className="text-xs text-slate-500">武器</div>
                <div className={`font-medium text-sm ${equipped[EquipmentType.WEAPON] ? RANK_DATA[equipped[EquipmentType.WEAPON]!.rank].color : 'text-slate-300'}`}>
                    {equipped[EquipmentType.WEAPON]?.name || 'なし'}
                </div>
                <div className="text-xs text-slate-400">Atk +{equipped[EquipmentType.WEAPON]?.power || 0}</div>
              </div>
              <div className="bg-slate-800 p-2 rounded border border-slate-700">
                <div className="text-xs text-slate-500">兜</div>
                <div className={`font-medium text-sm ${equipped[EquipmentType.HELM] ? RANK_DATA[equipped[EquipmentType.HELM]!.rank].color : 'text-slate-300'}`}>
                    {equipped[EquipmentType.HELM]?.name || 'なし'}
                </div>
                <div className="text-xs text-slate-400">Atk +{equipped[EquipmentType.HELM]?.power || 0}</div>
              </div>
              <div className="bg-slate-800 p-2 rounded border border-slate-700">
                <div className="text-xs text-slate-500">鎧</div>
                <div className={`font-medium text-sm ${equipped[EquipmentType.ARMOR] ? RANK_DATA[equipped[EquipmentType.ARMOR]!.rank].color : 'text-slate-300'}`}>
                    {equipped[EquipmentType.ARMOR]?.name || 'なし'}
                </div>
                <div className="text-xs text-slate-400">Atk +{equipped[EquipmentType.ARMOR]?.power || 0}</div>
              </div>
              <div className="bg-slate-800 p-2 rounded border border-slate-700">
                <div className="text-xs text-slate-500">盾</div>
                <div className={`font-medium text-sm ${equipped[EquipmentType.SHIELD] ? RANK_DATA[equipped[EquipmentType.SHIELD]!.rank].color : 'text-slate-300'}`}>
                    {equipped[EquipmentType.SHIELD]?.name || 'なし'}
                </div>
                <div className="text-xs text-slate-400">Atk +{equipped[EquipmentType.SHIELD]?.power || 0}</div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-300 mb-2">インベントリ ({inventory.length})</h4>
              <div className="space-y-2">
                {inventory.length === 0 && <div className="text-sm text-slate-500">空っぽです</div>}
                {inventory.map(item => {
                  const equippedItem = equipped[item.type];
                  const diff = item.power - (equippedItem?.power || 0);
                  const isUpgrade = diff > 0;
                  const isDowngrade = diff < 0;
                  const diffColor = isUpgrade ? 'text-emerald-400' : isDowngrade ? 'text-red-400' : 'text-slate-500';
                  const sign = isUpgrade ? '+' : '';
                  
                  const rankColor = item.rank ? RANK_DATA[item.rank].color : 'text-slate-200';

                  return (
                    <div key={item.id} className="flex items-center justify-between bg-slate-800 p-2 rounded hover:bg-slate-750 border border-slate-700/50">
                      <div>
                        <div className={`text-sm font-medium ${rankColor}`}>{item.name}</div>
                        <div className="text-xs text-slate-500">
                          {item.type} | Atk +{item.power}
                          {!item.isEquipped && (
                            <span className={`ml-2 font-bold ${diffColor}`}>
                              ({sign}{diff})
                            </span>
                          )}
                        </div>
                      </div>
                      {!item.isEquipped && (
                        <Button size="sm" onClick={() => onEquip(item)}>装備</Button>
                      )}
                      {item.isEquipped && (
                        <span className="text-xs text-emerald-500 font-bold px-3">E</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* JOB TAB */}
        {activeTab === 'job' && (
          <div className="space-y-4">
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
          <div className="space-y-3">
             {JOB_DEFINITIONS[player.job].skills.map((skill, idx) => {
               const mastery = player.skillMastery[skill.name] || { level: 0, count: 0 };
               const effectiveRate = skill.triggerRate + (mastery.level * 0.01);
               
               return (
                 <div key={idx} className="bg-slate-800 p-3 rounded border border-slate-700 flex flex-col gap-2">
                   <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-indigo-300">{skill.name}</span>
                        {mastery.level > 0 && <span className="text-xs bg-indigo-900 text-indigo-200 px-1.5 rounded">Lv.{mastery.level}</span>}
                      </div>
                      <span className="text-xs bg-slate-900 px-2 py-1 rounded text-blue-400 font-bold">
                        {(effectiveRate * 100).toFixed(0)}% 発動
                      </span>
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
           <div className="space-y-4">
              <div className="bg-amber-900/20 p-3 rounded border border-amber-800 text-center">
                <span className="text-amber-500 font-bold text-sm">💰 所持金: {player.gold.toLocaleString()} G</span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {MERCHANT_ITEMS.map((item) => {
                  const currentLevel = player.merchantUpgrades?.[item.key] || 0;
                  const cost = calculateUpgradeCost(item.baseCost, currentLevel);
                  const canAfford = player.gold >= cost;

                  return (
                    <div key={item.key} className="bg-slate-800 p-3 rounded border border-slate-700 flex justify-between items-center gap-2">
                       <div className="flex-1">
                         <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-200 text-sm">{item.name}</span>
                            <span className="text-xs bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded">Lv.{currentLevel}</span>
                         </div>
                         <div className="text-xs text-slate-400 mt-0.5">{item.desc}</div>
                       </div>
                       <Button 
                         size="sm" 
                         variant={canAfford ? 'primary' : 'secondary'}
                         disabled={!canAfford}
                         onClick={() => onBuyUpgrade(item.key)}
                         className={`min-w-[80px] text-xs flex flex-col items-center justify-center h-10 ${canAfford ? 'bg-amber-600 hover:bg-amber-500' : 'opacity-50 cursor-not-allowed'}`}
                       >
                         <div>購入</div>
                         <div className="font-mono text-[10px]">{cost.toLocaleString()}G</div>
                       </Button>
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