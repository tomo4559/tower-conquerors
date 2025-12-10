import React from 'react';
import { Player, FarmingMode } from '../../types';
import { Button } from '../ui/Button';
import { formatNumber } from '../../utils/mechanics';

interface StatusHeaderProps {
  player: Player;
  totalAttack: number;
  onReincarnateClick: () => void;
  onOpenUpdates: () => void;
  onOpenHelp: () => void;
  onOpenStatus: () => void;
  onOpenFarming: () => void;
  farmingMode: FarmingMode | null;
  gameSpeed: number;
  onSpeedChange: (speed: number) => void;
  showDevControls: boolean;
  isBgmMuted: boolean;
  bgmError: boolean;
  onToggleBgm: () => void;
}

export const StatusHeader: React.FC<StatusHeaderProps> = ({ 
  player, 
  totalAttack, 
  onReincarnateClick,
  onOpenUpdates,
  onOpenHelp,
  onOpenStatus,
  onOpenFarming,
  farmingMode,
  gameSpeed,
  onSpeedChange,
  showDevControls,
  isBgmMuted,
  bgmError,
  onToggleBgm
}) => {
  const canReincarnate = player.floor > 100;
  const hasFarmingSkill = (player.reincarnationUpgrades?.farming || 0) > 0;

  return (
    <div className="bg-slate-900 border-b border-slate-700 p-2 sticky top-0 z-10 shadow-lg relative">
      <div className="flex flex-wrap justify-between items-center mb-2 px-1 gap-1">
        <div className="flex items-center gap-2">
            <h1 className="font-bold text-slate-200 text-xs leading-tight whitespace-pre-wrap">タワー{'\n'}攻略者たち</h1>
            <a 
                href="https://freetomo.com/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="px-2 py-1 bg-slate-800 text-slate-200 text-[10px] font-bold rounded hover:bg-slate-700 border border-slate-700 transition-colors flex items-center justify-center leading-tight whitespace-pre-wrap"
            >
                作{'\n'}者
            </a>
        </div>
        
        <div className="flex gap-1 ml-auto items-center">
          {/* Speed Controls - Only in Dev Mode */}
          {showDevControls && (
            <div className="flex bg-slate-800 rounded p-0.5 border border-slate-700 mr-1">
                <button
                    onClick={() => onSpeedChange(gameSpeed === 50 ? 1 : 50)}
                    className={`px-2 py-1 text-[10px] font-bold rounded leading-tight transition-colors ${
                    gameSpeed === 50 
                        ? 'bg-indigo-600 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                    }`}
                >
                    x50
                </button>
            </div>
          )}

          {/* BGM Toggle */}
          <button 
             onClick={onToggleBgm} 
             title={bgmError ? "再生エラー (クリックで再試行)" : (isBgmMuted ? "BGM ON" : "BGM OFF")}
             className={`w-8 h-8 rounded flex items-center justify-center border transition-colors ${
                bgmError 
                    ? 'bg-red-900/30 border-red-500/50 text-red-400 hover:bg-red-900/50' 
                    : isBgmMuted 
                        ? 'bg-slate-800 border-slate-600 text-slate-500 hover:bg-slate-700' 
                        : 'bg-indigo-900/30 border-indigo-500/50 text-indigo-400 hover:bg-indigo-900/50'
             }`}
          >
             {bgmError ? '♪!' : isBgmMuted ? '♪×' : '♪'}
          </button>

          {/* Utility Buttons */}
          <div className="flex gap-1 mr-1">
             <button onClick={onOpenUpdates} className="px-2 py-1 bg-slate-800 text-slate-400 text-[10px] rounded hover:bg-slate-700 border border-slate-700 leading-tight whitespace-pre-wrap">更新{'\n'}履歴</button>
             <button onClick={onOpenHelp} className="px-2 py-1 bg-slate-800 text-slate-400 text-[10px] rounded hover:bg-slate-700 border border-slate-700 leading-tight whitespace-pre-wrap">概{'\n'}要</button>
             <button onClick={onOpenStatus} className="px-2 py-1 bg-slate-800 text-slate-400 text-[10px] rounded hover:bg-slate-700 border border-slate-700 leading-tight whitespace-pre-wrap">状{'\n'}態</button>
          </div>

          {hasFarmingSkill && (
              <Button 
                size="sm" 
                onClick={onOpenFarming}
                className={`text-[10px] h-auto py-1 px-2 font-bold border transition-all duration-200 leading-tight whitespace-pre-wrap ${farmingMode ? 'bg-cyan-700 hover:bg-cyan-600 border-cyan-500' : 'bg-slate-800 hover:bg-slate-700 border-slate-600'}`}
              >
                 周{'\n'}回
              </Button>
          )}

          {player.floor > 50 && (
             <Button 
                size="sm" 
                onClick={onReincarnateClick}
                disabled={!canReincarnate}
                className={`text-[10px] h-auto py-1 px-2 font-bold border transition-all duration-200 leading-tight whitespace-pre-wrap ${
                  canReincarnate 
                    ? 'bg-purple-600 hover:bg-purple-500 border-purple-400 text-white animate-pulse' 
                    : 'bg-slate-800 text-slate-500 border-slate-700 opacity-50 cursor-not-allowed'
                }`}
              >
                転{'\n'}生
              </Button>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex gap-1 text-center">
        {/* Level - Compact */}
        <div className="bg-slate-800 p-1 rounded-lg w-14 shrink-0 flex flex-col justify-center">
          <div className="text-[9px] text-slate-400 uppercase tracking-wider leading-none mb-0.5">Lv</div>
          <div className="text-sm font-bold text-blue-400 leading-tight">{player.level}</div>
        </div>

        {/* Floor - Compact */}
        <div className="bg-slate-800 p-1 rounded-lg w-14 shrink-0 flex flex-col justify-center">
          <div className="text-[9px] text-slate-400 uppercase tracking-wider leading-none mb-0.5">階層</div>
          <div className="text-sm font-bold text-emerald-400 leading-tight">{player.floor}F</div>
        </div>

        {/* Attack - Flexible */}
        <div className="bg-slate-800 p-1 rounded-lg flex-1 min-w-[60px] flex flex-col justify-center">
          <div className="text-[9px] text-slate-400 uppercase tracking-wider leading-none mb-0.5">攻撃力</div>
          <div className="text-base font-bold text-red-400 leading-tight">{formatNumber(totalAttack)}</div>
        </div>

        {/* Gold - Flexible */}
        <div className="bg-slate-800 p-1 rounded-lg flex-1 min-w-[60px] flex flex-col justify-center">
          <div className="text-[9px] text-slate-400 uppercase tracking-wider leading-none mb-0.5">Gold</div>
          <div className="text-base font-bold text-amber-400 leading-tight">{formatNumber(player.gold)}</div>
        </div>
        
        {/* Reincarnation Stones - Flexible (Next to Gold) */}
        {player.reincarnationStones > 0 && (
            <div className="bg-slate-800 p-1 rounded-lg flex-1 min-w-[60px] flex flex-col justify-center border border-purple-900/50">
                <div className="text-[9px] text-purple-300 uppercase tracking-wider leading-none mb-0.5">転生石</div>
                <div className="text-base font-bold text-purple-400 leading-tight">{formatNumber(player.reincarnationStones)}</div>
            </div>
        )}
      </div>
    </div>
  );
};