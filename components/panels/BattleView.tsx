import React from 'react';
import { Enemy, Player } from '../../types';
import { ProgressBar } from '../ui/ProgressBar';

interface BattleViewProps {
  enemy: Enemy | null;
  player: Player;
  bossTimer: number | null;
}

export const BattleView: React.FC<BattleViewProps> = ({ enemy, player, bossTimer }) => {
  if (!enemy) return <div className="p-8 text-center text-slate-500">敵を探しています...</div>;

  return (
    <div className="p-3 relative overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl border border-slate-700 m-2 shadow-inner">
      {/* Boss Overlay */}
      {enemy.isBoss && bossTimer !== null && (
        <div className="absolute top-1 right-2 left-2 z-10 opacity-90">
           <div className={`text-center font-mono font-bold text-sm ${bossTimer < 15 ? 'text-red-500 animate-pulse' : 'text-slate-200'}`}>
             BOSS: {bossTimer.toFixed(0)}s
           </div>
           <ProgressBar value={bossTimer} max={60} color={bossTimer < 15 ? 'bg-red-500' : 'bg-amber-500'} className="mt-0.5" height="h-1" />
        </div>
      )}

      {/* Main Row: Icon Name VS Job(Lv) */}
      <div className={`flex items-center justify-between gap-2 ${enemy.isBoss && bossTimer ? 'mt-6' : ''}`}>
        
        {/* Left: Enemy Icon & Name */}
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center text-lg shadow-md border 
            ${enemy.isBoss ? 'bg-red-900/80 border-red-500 animate-bounce' : 'bg-slate-700 border-slate-600'}`}>
            {enemy.isBoss ? '👹' : '👾'}
          </div>
          <div className={`font-bold text-sm truncate ${enemy.isBoss ? 'text-red-400' : 'text-slate-200'}`}>
            {enemy.name}
          </div>
        </div>

        {/* Center: VS */}
        <div className="text-slate-600 text-xs font-black italic px-1 flex-shrink-0">VS</div>

        {/* Right: Job (Lv) */}
        <div className="text-right flex-shrink-0">
           <div className="text-sm font-medium text-blue-300 whitespace-nowrap">
             {player.job} <span className="text-xs text-slate-400">({player.jobLevel})</span>
           </div>
        </div>
      </div>

      {/* Bars Area */}
      <div className="mt-3 space-y-2">
         {/* Enemy HP */}
         <ProgressBar 
          value={enemy.currentHp} 
          max={enemy.maxHp} 
          color="bg-red-500" 
          className="w-full" 
          label="HP"
          height="h-3"
        />
        
        {/* Player EXP - simplified label/display for compact view */}
        <div className="pt-1">
          <ProgressBar 
              value={player.currentXp} 
              max={player.requiredXp} 
              color="bg-blue-500" 
              height="h-1.5"
              className="w-full opacity-80"
              label="" /* Removing label inside to save space, or keep it if needed */
          />
          <div className="flex justify-end text-[10px] text-slate-500 mt-0.5">
            EXP: {Math.floor(player.currentXp)} / {player.requiredXp}
          </div>
        </div>
      </div>
    </div>
  );
};