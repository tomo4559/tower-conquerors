import React, { useState, useEffect, useRef } from 'react';
import { Enemy, Player, LogEntry } from '../../types';
import { ProgressBar } from '../ui/ProgressBar';
import { BOSS_TIME_LIMIT } from '../../constants';
import { formatNumber } from '../../utils/mechanics';

interface BattleViewProps {
  enemy: Enemy | null;
  player: Player;
  bossTimer: number | null;
  logs: LogEntry[]; // Receive full log array
}

export const BattleView: React.FC<BattleViewProps> = ({ enemy, player, bossTimer, logs }) => {
  const [isDamaged, setIsDamaged] = useState(false);
  const [effects, setEffects] = useState<{id: string, text: string, color: string, className?: string, style?: React.CSSProperties}[]>([]);
  const prevHpRef = useRef(enemy?.currentHp);
  const processedLogIdsRef = useRef<Set<string>>(new Set());

  // Damage Shake Effect (HP Bar)
  useEffect(() => {
    if (enemy && prevHpRef.current !== undefined) {
       if (enemy.currentHp < prevHpRef.current) {
         setIsDamaged(true);
         const timer = setTimeout(() => setIsDamaged(false), 200);
         return () => clearTimeout(timer);
       }
    }
    prevHpRef.current = enemy?.currentHp;
  }, [enemy?.currentHp]);

  // Skill & Damage Popup Effect
  useEffect(() => {
    // Scan recent logs (last 5) to ensure we don't miss damage logs that came in the same batch as kill logs
    const recentLogs = logs.slice(-5);
    const newEffects: typeof effects = [];

    recentLogs.forEach(log => {
        if (processedLogIdsRef.current.has(log.id)) return;
        
        // Mark as processed
        processedLogIdsRef.current.add(log.id);

        // Memory management for the set
        if (processedLogIdsRef.current.size > 100) {
            const first = processedLogIdsRef.current.values().next().value;
            if (first) processedLogIdsRef.current.delete(first);
        }

        // 1. Detect skill trigger
        if (log.message.includes('発動！')) {
            const skillName = log.message.split('と')[0].split('が')[0];
            newEffects.push({ 
                id: log.id + '_skill', 
                text: skillName, 
                color: 'text-indigo-300',
                className: 'animate-float-skill' 
            });
        }
        
        // 2. Detect Damage Number
        const damageMatch = log.message.match(/敵に\s*([0-9\.kMG]+)\s*のダメージ/);
        if (damageMatch) {
            const damage = damageMatch[1];
            const isCrit = log.type === 'crit';
            
            newEffects.push({
                id: log.id + '_dmg',
                text: damage, // Keep damage numbers raw for popups usually, or format? Let's keep raw for clarity or format if very large.
                color: isCrit ? 'text-yellow-400 font-black text-3xl' : 'text-white font-bold text-2xl',
                className: 'animate-damage-pop',
                style: { marginTop: '20px', textShadow: '2px 2px 0 #000' }
            });

            if (isCrit) {
                newEffects.push({
                    id: log.id + '_crit_text',
                    text: 'CRITICAL!',
                    color: 'text-red-500 font-bold text-lg',
                    className: 'animate-float-skill',
                    style: { marginTop: '-20px' }
                });
            }
        }
    });

    if (newEffects.length > 0) {
        setEffects(prev => [...prev, ...newEffects]);
        
        setTimeout(() => {
            setEffects(prev => prev.filter(e => !newEffects.find(ne => ne.id === e.id)));
        }, 800);
    }
  }, [logs]);

  return (
    <div className="p-3 relative overflow-hidden bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl border border-slate-700 m-2 shadow-inner h-44 flex flex-col">
      {/* Boss Overlay */}
      {enemy?.isBoss && bossTimer !== null && (
        <div className="absolute top-1 right-2 left-2 z-10 opacity-90">
           <div className={`text-center font-mono font-bold text-sm ${bossTimer < 10 ? 'text-red-500 animate-pulse' : 'text-slate-200'}`}>
             BOSS: {bossTimer.toFixed(0)}s
           </div>
           <ProgressBar value={bossTimer} max={BOSS_TIME_LIMIT} color={bossTimer < 10 ? 'bg-red-500' : 'bg-amber-500'} className="mt-0.5" height="h-1" />
        </div>
      )}

      {/* Content Area */}
      <div className="mt-7 flex-1 flex flex-col justify-center relative">
        {!enemy ? (
            <div className="flex items-center justify-center h-full">
                <div className="text-slate-500 font-bold animate-pulse">
                    敵を探しています...
                </div>
            </div>
        ) : (
            <>
                {/* Visual Effects Overlay */}
                <div className="absolute top-0 left-0 w-full h-full pointer-events-none flex justify-center items-center z-20">
                    {effects.map(effect => (
                        <div 
                            key={effect.id} 
                            className={`absolute ${effect.className} shadow-black drop-shadow-md whitespace-nowrap ${effect.color}`}
                            style={effect.style}
                        >
                            {effect.text}
                        </div>
                    ))}
                </div>

                {/* Main Row */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className={`w-10 h-10 flex-shrink-0 rounded-full flex items-center justify-center text-lg shadow-md border transition-transform
                        ${enemy.isBoss ? 'bg-red-900/80 border-red-500' : 'bg-slate-700 border-slate-600'}
                        ${isDamaged ? 'animate-shake bg-red-600 border-white' : ''}
                    `}>
                        {enemy.isBoss ? '👹' : '👾'}
                    </div>
                    <div className={`font-bold text-sm truncate ${enemy.isBoss ? 'text-red-400' : 'text-slate-200'}`}>
                        {enemy.name}
                    </div>
                    </div>
                    <div className="text-slate-600 text-xs font-black italic px-1 flex-shrink-0">VS</div>
                    <div className="text-right flex-shrink-0">
                    <div className="text-sm font-medium text-blue-300 whitespace-nowrap">
                        {player.job} <span className="text-xs text-slate-400">({player.jobLevel})</span>
                    </div>
                    </div>
                </div>

                {/* Bars Area */}
                <div className="mt-3 space-y-2">
                    <ProgressBar 
                    value={enemy.currentHp} 
                    max={enemy.maxHp} 
                    color="bg-red-500" 
                    className="w-full" 
                    label="HP"
                    height="h-3"
                    />
                    <div className="pt-1">
                    <ProgressBar 
                        value={player.currentXp} 
                        max={player.requiredXp} 
                        color="bg-blue-500" 
                        height="h-1.5"
                        className="w-full opacity-80"
                        label=""
                    />
                    <div className="flex justify-end text-[10px] text-slate-500 mt-0.5">
                        EXP: {formatNumber(Math.floor(player.currentXp))} / {formatNumber(player.requiredXp)}
                    </div>
                    </div>
                </div>
            </>
        )}
      </div>
    </div>
  );
};