import React from 'react';
import { Player } from '../../types';
import { Button } from '../ui/Button';

interface StatusHeaderProps {
  player: Player;
  totalAttack: number;
  hardMode: boolean;
  onToggleHardMode: () => void;
  onReincarnateClick: () => void;
}

export const StatusHeader: React.FC<StatusHeaderProps> = ({ 
  player, 
  totalAttack, 
  hardMode, 
  onToggleHardMode,
  onReincarnateClick
}) => {
  const canReincarnate = player.floor > 100;

  return (
    <div className="bg-slate-900 border-b border-slate-700 p-3 sticky top-0 z-10 shadow-lg relative">
      <div className="flex justify-between items-center mb-2 px-1 gap-2">
        <h1 className="font-bold text-slate-200 text-sm hidden sm:block">タワー攻略者たち</h1>
        
        <div className="flex gap-2 ml-auto">
          {player.floor > 50 && (
             <Button 
                size="sm" 
                onClick={onReincarnateClick}
                disabled={!canReincarnate}
                className={`text-xs font-bold border transition-all duration-200 ${
                  canReincarnate 
                    ? 'bg-purple-600 hover:bg-purple-500 border-purple-400 text-white animate-pulse' 
                    : 'bg-slate-800 text-slate-500 border-slate-700 opacity-50 cursor-not-allowed'
                }`}
              >
                🔮 転生
              </Button>
          )}

          <Button 
            size="sm" 
            onClick={onToggleHardMode}
            className={`${hardMode ? 'bg-red-600 hover:bg-red-500 animate-pulse border-red-400' : 'bg-slate-700 hover:bg-slate-600'} text-xs font-bold border transition-all duration-200`}
          >
            {hardMode ? '⚠️ x10 ON' : 'x10 OFF'}
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-slate-800 p-2 rounded-lg relative overflow-hidden group">
          <div className="text-xs text-slate-400 uppercase tracking-wider">Level</div>
          <div className="text-lg font-bold text-blue-400">{player.level}</div>
        </div>
        <div className="bg-slate-800 p-2 rounded-lg">
          <div className="text-xs text-slate-400 uppercase tracking-wider">階層</div>
          <div className="text-lg font-bold text-emerald-400">{player.floor}F</div>
        </div>
        <div className="bg-slate-800 p-2 rounded-lg">
          <div className="text-xs text-slate-400 uppercase tracking-wider">攻撃力</div>
          <div className="text-lg font-bold text-red-400">{totalAttack}</div>
        </div>
        <div className="bg-slate-800 p-2 rounded-lg">
          <div className="text-xs text-slate-400 uppercase tracking-wider">ゴールド</div>
          <div className="text-lg font-bold text-amber-400">{player.gold.toLocaleString()}</div>
        </div>
      </div>
      {player.reincarnationStones > 0 && (
        <div className="mt-2 flex justify-end px-2">
           <div className="text-xs font-bold text-purple-400 flex items-center gap-1 bg-purple-900/30 px-2 py-1 rounded border border-purple-500/30">
             <span>🔮 転生石:</span>
             <span className="text-white">{player.reincarnationStones.toLocaleString()}</span>
           </div>
        </div>
      )}
    </div>
  );
};