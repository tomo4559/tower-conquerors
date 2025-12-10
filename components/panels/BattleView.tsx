
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
  onEnemyClick: () => void;
}

// --- Visual Asset Components ---

const Stars = () => (
  <div className="absolute inset-0 pointer-events-none z-0">
     {[...Array(30)].map((_, i) => (
       <div key={i} className="absolute bg-white rounded-full opacity-80 animate-pulse"
            style={{
              top: `${Math.random() * 60}%`,
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 2 + 1}px`,
              height: `${Math.random() * 2 + 1}px`,
              animationDelay: `${Math.random() * 3}s`,
              boxShadow: '0 0 4px white'
            }}
       />
     ))}
  </div>
);

// CSS Shapes for environments
const Mountain = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
    <div className={`absolute bottom-0 w-0 h-0 border-l-[transparent] border-r-[transparent] border-b-current ${className}`} 
         style={{ borderLeftWidth: '50px', borderRightWidth: '50px', borderBottomWidth: '100px', ...style }} />
);

const Tree = ({ className, style }: { className?: string, style?: React.CSSProperties }) => (
    <div className={`absolute bottom-0 flex flex-col items-center ${className}`} style={style}>
        <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-b-[40px] border-l-transparent border-r-transparent border-b-current translate-y-2 z-10" />
        <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-b-[40px] border-l-transparent border-r-transparent border-b-current translate-y-1 z-10" />
        <div className="w-2 h-4 bg-yellow-900 opacity-60" />
    </div>
);

const BackgroundScene = ({ floor }: { floor: number }) => {
    const cycle = Math.floor((floor - 1) / 100) % 10;
    const isNight = floor > 1000;
    
    // Base Environment Renderers
    const renderScene = () => {
        switch(cycle) {
            case 0: // Grassland (1-100)
                return (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-b from-sky-300 to-sky-100" />
                        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-emerald-500 rounded-t-[50%] scale-125 translate-y-4" />
                        <div className="absolute bottom-0 right-[-20%] w-[80%] h-2/3 bg-emerald-400 rounded-full opacity-60" />
                        <div className="absolute top-10 left-10 w-20 h-10 bg-white/40 blur-xl rounded-full" />
                        <div className="absolute top-20 right-20 w-32 h-12 bg-white/30 blur-xl rounded-full" />
                    </>
                );
            case 1: // Forest (101-200)
                return (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-b from-teal-800 to-emerald-900" />
                        <div className="absolute bottom-0 inset-x-0 h-1/4 bg-emerald-950" />
                        {/* Trees Back */}
                        <Tree className="text-emerald-800 left-[10%] scale-150 bottom-8" />
                        <Tree className="text-emerald-800 left-[30%] scale-125 bottom-10" />
                        <Tree className="text-emerald-800 left-[80%] scale-150 bottom-8" />
                        {/* Trees Front */}
                        <Tree className="text-emerald-700 left-[5%] scale-110 bottom-2" />
                        <Tree className="text-emerald-700 left-[85%] scale-125 bottom-4" />
                    </>
                );
            case 2: // Lake (201-300)
                return (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-b from-sky-200 via-white to-sky-100" />
                        {/* Mountains */}
                        <Mountain className="text-slate-300/80 left-[10%] scale-150 bottom-[30%]" />
                        <Mountain className="text-slate-400/80 left-[60%] scale-125 bottom-[30%]" />
                        {/* Lake */}
                        <div className="absolute bottom-0 inset-x-0 h-[40%] bg-gradient-to-b from-blue-400 to-blue-600" />
                        <div className="absolute bottom-[35%] inset-x-0 h-2 bg-white/30 blur-sm" />
                        {/* Reflections */}
                        <div className="absolute bottom-4 left-10 w-20 h-1 bg-white/20 rounded-full" />
                        <div className="absolute bottom-10 right-20 w-32 h-1 bg-white/20 rounded-full" />
                    </>
                );
            case 3: // Desert (301-400)
                return (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-b from-orange-300 to-amber-100" />
                        <div className="absolute top-4 right-8 w-16 h-16 bg-yellow-100 rounded-full blur-md opacity-80" />
                        <div className="absolute bottom-0 right-0 w-[70%] h-1/2 bg-amber-400 rounded-tl-full opacity-90" />
                        <div className="absolute bottom-0 left-0 w-[60%] h-1/3 bg-amber-500 rounded-tr-full" />
                    </>
                );
            case 4: // Highlands (401-500)
                return (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-b from-slate-300 to-stone-200" />
                        <Mountain className="text-stone-500 left-[-10%] scale-[3] bottom-0" />
                        <Mountain className="text-stone-400 right-[-20%] scale-[2.5] bottom-0" />
                        <div className="absolute top-0 inset-x-0 h-20 bg-gradient-to-b from-slate-400/50 to-transparent" />
                    </>
                );
            case 5: // Lighthouse / Coast (501-600)
                return (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-b from-slate-700 via-slate-600 to-blue-900" />
                        <div className="absolute bottom-0 inset-x-0 h-1/3 bg-blue-950/80 backdrop-blur-sm" />
                        {/* Lighthouse structure hint */}
                        <div className="absolute bottom-10 right-10 w-8 h-40 bg-slate-800" />
                        <div className="absolute top-[30%] right-[38px] w-20 h-96 bg-yellow-200/20 rotate-[60deg] blur-md transform-origin-top-left" />
                    </>
                );
            case 6: // Beach (601-700)
                return (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-b from-cyan-300 to-blue-200" />
                        <div className="absolute bottom-[30%] inset-x-0 h-[20%] bg-blue-500" />
                        <div className="absolute bottom-0 inset-x-0 h-[30%] bg-[#f2d2a9]" />
                        {/* Waves */}
                        <div className="absolute bottom-[30%] inset-x-0 h-2 bg-white/60 wave-pattern" />
                    </>
                );
            case 7: // Volcano (701-800)
                return (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-b from-red-950 to-orange-900" />
                        <Mountain className="text-stone-900 left-[20%] scale-[4] bottom-[-20px]" />
                        {/* Lava */}
                        <div className="absolute bottom-0 left-[45%] w-10 h-full bg-gradient-to-t from-orange-500 to-transparent opacity-60 blur-md" />
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAuMDUiLz4KPC9zdmc+')] opacity-20" />
                    </>
                );
            case 8: // Graveyard (801-900)
                return (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-b from-indigo-950 to-slate-900" />
                        <div className="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-black to-transparent opacity-80" />
                        {/* Graves */}
                        <div className="absolute bottom-4 left-10 w-8 h-12 bg-slate-700 rounded-t-lg border-2 border-slate-600" />
                        <div className="absolute bottom-2 left-24 w-6 h-8 bg-slate-800 rounded-t-lg rotate-6" />
                        <div className="absolute bottom-6 right-20 w-10 h-14 bg-slate-700 rounded-t-lg border-2 border-slate-600" />
                        {/* Fog */}
                        <div className="absolute bottom-0 inset-x-0 h-32 bg-slate-500/20 blur-xl" />
                    </>
                );
            case 9: // Demon World (901-1000)
                return (
                    <>
                        <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-950 via-black to-purple-900" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl animate-pulse" />
                        {/* Weird geometry */}
                        <div className="absolute top-10 left-10 w-20 h-20 border border-purple-500/30 rotate-45" />
                        <div className="absolute bottom-10 right-10 w-32 h-32 border border-red-500/20 rounded-full" />
                    </>
                );
            default:
                return <div className="absolute inset-0 bg-slate-800" />;
        }
    };

    return (
        <div className="absolute inset-0 w-full h-full overflow-hidden transition-all duration-1000">
            {renderScene()}
            {isNight && (
                <>
                    <div className="absolute inset-0 bg-indigo-950/70 mix-blend-multiply pointer-events-none z-0" />
                    <Stars />
                </>
            )}
        </div>
    );
};

// --- Main Component ---

export const BattleView: React.FC<BattleViewProps> = ({ enemy, player, bossTimer, logs, onEnemyClick }) => {
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
    // Optimized: Only check very recent logs and cap total effects aggressively
    // Check last 20 logs to ensure we don't miss things in high-speed mode
    const recentLogs = logs.slice(-20);
    const newEffects: typeof effects = [];

    recentLogs.forEach(log => {
        if (processedLogIdsRef.current.has(log.id)) return;
        
        // Mark as processed
        processedLogIdsRef.current.add(log.id);

        // Memory management for the set
        if (processedLogIdsRef.current.size > 200) {
            const first = processedLogIdsRef.current.values().next().value;
            if (first) processedLogIdsRef.current.delete(first);
        }

        // 1. Detect skill trigger
        if (log.message.includes('発動！')) {
            const skillName = log.message.split('と')[0].split('が')[0];
            newEffects.push({ 
                id: log.id + '_skill', 
                text: skillName, 
                color: 'text-indigo-200 drop-shadow-md',
                className: 'animate-float-skill' 
            });
        }
        
        // 2. Detect Damage Number
        const damageMatch = log.message.match(/敵に\s*([0-9\.kMGgTPEZYaa-zz]+)\s*のダメージ/);
        if (damageMatch) {
            const damage = damageMatch[1];
            const isCrit = log.type === 'crit';
            
            newEffects.push({
                id: log.id + '_dmg',
                text: damage, 
                color: isCrit ? 'text-yellow-300 font-black text-3xl drop-shadow-md' : 'text-white font-bold text-2xl drop-shadow-md',
                className: 'animate-damage-pop',
                style: { marginTop: '20px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }
            });

            if (isCrit) {
                newEffects.push({
                    id: log.id + '_crit_text',
                    text: 'CRITICAL!',
                    color: 'text-red-400 font-bold text-lg drop-shadow-md',
                    className: 'animate-float-skill',
                    style: { marginTop: '-20px' }
                });
            }
        }
    });

    if (newEffects.length > 0) {
        setEffects(prev => {
            // Strictly limit max effects to prevent freezing
            const MAX_EFFECTS = 10;
            const updated = [...prev, ...newEffects];
            return updated.slice(-MAX_EFFECTS);
        });
        
        // Optimized cleanup: remove only these specific effects after delay
        // Using a single cleanup timeout for the batch is more efficient than one per item
        setTimeout(() => {
            const idsToRemove = new Set(newEffects.map(e => e.id));
            setEffects(prev => prev.filter(e => !idsToRemove.has(e.id)));
        }, 800);
    }
  }, [logs]);

  const getAreaName = (floor: number) => {
      const names = ['草原', '森', '湖', '砂漠', '高原', '灯台', 'ビーチ', '火山', '墓場', '魔界'];
      const cycle = Math.floor((floor - 1) / 100) % 10;
      const isNight = floor > 1000;
      return names[cycle] + (isNight ? '(夜)' : '');
  };

  const isFloorBoss = player.floor % 100 === 0;
  const isSuperFloorBoss = player.floor % 500 === 0;

  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-700 m-2 shadow-inner h-44 flex flex-col transition-colors duration-1000`}>
      
      {/* Dynamic Background Layer */}
      <BackgroundScene floor={player.floor} />

      {/* Background Overlay for UI Contrast (Subtle gradient from bottom) */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none z-0"></div>

      {/* Area Name Badge */}
      <div className="absolute top-2 left-2 z-10">
         <div className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/40 text-white/90 backdrop-blur-sm border border-white/20 shadow-lg">
            {getAreaName(player.floor)}
         </div>
      </div>

      {/* Boss Overlay */}
      {enemy?.isBoss && bossTimer !== null && (
        <div className="absolute top-1 right-2 left-2 z-20 flex justify-end">
           <div className={`w-1/3 p-2 rounded-lg border backdrop-blur-sm shadow-xl 
             ${isSuperFloorBoss ? 'bg-red-900/90 border-red-500/80 shadow-red-500/50' : 
               isFloorBoss ? 'bg-purple-900/80 border-purple-500/50' : 'bg-slate-900/80 border-slate-700/50'}`}>
             <div className={`text-right font-mono font-bold text-xs 
               ${bossTimer < 10 ? 'text-red-500 animate-pulse' : 
                 isSuperFloorBoss ? 'text-yellow-200 drop-shadow-md tracking-tighter' : 
                 isFloorBoss ? 'text-yellow-300 drop-shadow-md' : 'text-slate-200 drop-shadow-md'}`}>
               {isSuperFloorBoss ? 'SUPER FLOOR BOSS' : isFloorBoss ? 'FLOOR BOSS' : 'BOSS'}: {bossTimer.toFixed(0)}s
             </div>
             <ProgressBar value={bossTimer} max={BOSS_TIME_LIMIT} color={bossTimer < 10 ? 'bg-red-500' : isSuperFloorBoss ? 'bg-yellow-500' : isFloorBoss ? 'bg-purple-500' : 'bg-amber-500'} className="mt-0.5" height="h-1" />
           </div>
        </div>
      )}

      {/* Content Area */}
      <div className="mt-7 flex-1 flex flex-col justify-center relative z-10 px-3">
        {!enemy ? (
            <div className="flex items-center justify-center h-full">
                <div className="text-white/80 font-bold animate-pulse drop-shadow-md">
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
                            className={`absolute ${effect.className} whitespace-nowrap ${effect.color}`}
                            style={effect.style}
                        >
                            {effect.text}
                        </div>
                    ))}
                </div>

                {/* Main Row */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div 
                        onClick={onEnemyClick}
                        className={`w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center text-2xl shadow-lg border-2 transition-transform bg-slate-900/60 cursor-pointer active:scale-95 select-none
                        ${enemy.isBoss 
                            ? isSuperFloorBoss
                                ? 'border-yellow-400 shadow-yellow-500/80 scale-110 animate-pulse'
                                : isFloorBoss 
                                    ? 'border-purple-500/80 shadow-purple-500/50' 
                                    : 'border-red-500/80' 
                            : 'border-slate-400/50'}
                        ${isDamaged ? 'animate-shake bg-red-900/80 border-white' : ''}
                    `}>
                        {enemy.isBoss ? (isSuperFloorBoss ? '👹' : isFloorBoss ? '👿' : '👹') : '👾'}
                    </div>
                    <div className="min-w-0">
                        <div className={`font-bold text-base truncate drop-shadow-md ${enemy.isBoss ? (isFloorBoss ? 'text-purple-300' : 'text-red-300') : 'text-white'}`} style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                            {enemy.name}
                        </div>
                        {enemy.isBoss && (
                            <div className={`text-[10px] font-bold animate-pulse ${isSuperFloorBoss ? 'text-yellow-200' : isFloorBoss ? 'text-purple-200' : 'text-red-200'}`}>
                                {isSuperFloorBoss ? '⭐ SUPER FLOOR BOSS ⭐' : isFloorBoss ? 'FLOOR BOSS' : 'BOSS'}
                            </div>
                        )}
                    </div>
                    </div>
                    <div className="text-white/80 text-xs font-black italic px-1 flex-shrink-0 drop-shadow-lg">VS</div>
                    <div className="text-right flex-shrink-0">
                    <div className="text-sm font-bold text-white drop-shadow-md whitespace-nowrap" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                        {player.job}
                    </div>
                    <div className="text-xs text-white/90 drop-shadow">Lv.{player.jobLevel}</div>
                    </div>
                </div>

                {/* Bars Area */}
                <div className="mt-3 space-y-2 bg-black/40 p-2 rounded-lg backdrop-blur-[2px] border border-white/5">
                    <ProgressBar 
                    value={enemy.currentHp} 
                    max={enemy.maxHp} 
                    displayValue={`${formatNumber(enemy.currentHp)} / ${formatNumber(enemy.maxHp)}`}
                    color={enemy.isBoss && isSuperFloorBoss ? "bg-yellow-600" : enemy.isBoss && isFloorBoss ? "bg-purple-600" : "bg-red-500"} 
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
                        className="w-full opacity-90"
                        label=""
                    />
                    <div className="flex justify-end text-[10px] text-slate-300 mt-0.5 font-mono">
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
