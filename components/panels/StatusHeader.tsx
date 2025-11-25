import React from 'react';
import { Player } from '../../types';

interface StatusHeaderProps {
  player: Player;
  totalAttack: number;
}

export const StatusHeader: React.FC<StatusHeaderProps> = ({ player, totalAttack }) => {
  return (
    <div className="bg-slate-900 border-b border-slate-700 p-4 sticky top-0 z-10 shadow-lg">
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-slate-800 p-2 rounded-lg">
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
    </div>
  );
};