

import { JobType, JobData, EquipmentType, SkillData, EquipmentRank, ReincarnationUpgrades, MerchantUpgrades } from './types';

export const TICK_RATE_MS = 100;
export const BOSS_TIME_LIMIT = 30; // 30 seconds to kill boss

export const JOB_ORDER: JobType[] = [
  JobType.NOVICE,
  JobType.WARRIOR,
  JobType.PALADIN,
  JobType.PALADIN_KING,
  JobType.MAGIC_SWORDSMAN,
  JobType.MAGIC_WARRIOR,
  JobType.GREAT_MAGIC_WARRIOR,
  JobType.GOD_MAGIC_WARRIOR,
  JobType.ULTIMATE_WARRIOR,
  JobType.LEGENDARY_HERO
];

// Helper to accumulate skills
const SKILLS = {
  SLASH: { name: 'スラッシュ', description: '基本的な剣撃', triggerRate: 0.2, damageMultiplier: 1.5 },
  POWER_ATTACK: { name: 'パワーアタック', description: '力を込めた一撃', triggerRate: 0.15, damageMultiplier: 2.0 },
  HOLY_STRIKE: { name: 'ホーリーストライク', description: '聖なる光の一撃', triggerRate: 0.1, damageMultiplier: 3.0 },
  DIVINE_BURST: { name: 'ディバインバースト', description: '神聖な爆発', triggerRate: 0.08, damageMultiplier: 4.5 },
  METEOR_BREAK: { name: 'メテオブレイク', description: '隕石の如き斬撃', triggerRate: 0.05, damageMultiplier: 6.0 },
  GALAXY_SLASH: { name: 'ギャラクシースラッシュ', description: '銀河を断つ一撃', triggerRate: 0.04, damageMultiplier: 8.0 },
  VOID_CUTTER: { name: 'ヴォイドカッター', description: '虚空を切り裂く', triggerRate: 0.03, damageMultiplier: 12.0 },
  GOD_BLOW: { name: 'ゴッドブロウ', description: '神の一撃', triggerRate: 0.02, damageMultiplier: 20.0 },
  INFINITY_EDGE: { name: 'インフィニティエッジ', description: '無限の刃', triggerRate: 0.01, damageMultiplier: 50.0 },
  LEGEND_CROSS: { name: 'レジェンドクロス', description: '伝説の十字架', triggerRate: 0.01, damageMultiplier: 100.0 }
};

// Accumulate skills for higher tier jobs so they don't disappear
export const JOB_DEFINITIONS: Record<JobType, JobData> = {
  [JobType.NOVICE]: {
    name: JobType.NOVICE,
    multiplier: 1.0,
    unlockLevel: 0,
    skills: [SKILLS.SLASH]
  },
  [JobType.WARRIOR]: {
    name: JobType.WARRIOR,
    multiplier: 1.5,
    unlockLevel: 10,
    skills: [SKILLS.SLASH, SKILLS.POWER_ATTACK]
  },
  [JobType.PALADIN]: {
    name: JobType.PALADIN,
    multiplier: 2.5,
    unlockLevel: 20,
    skills: [SKILLS.SLASH, SKILLS.POWER_ATTACK, SKILLS.HOLY_STRIKE]
  },
  [JobType.PALADIN_KING]: {
    name: JobType.PALADIN_KING,
    multiplier: 4.0,
    unlockLevel: 30,
    skills: [SKILLS.SLASH, SKILLS.POWER_ATTACK, SKILLS.HOLY_STRIKE, SKILLS.DIVINE_BURST]
  },
  [JobType.MAGIC_SWORDSMAN]: {
    name: JobType.MAGIC_SWORDSMAN,
    multiplier: 7.0,
    unlockLevel: 40,
    skills: [SKILLS.SLASH, SKILLS.POWER_ATTACK, SKILLS.HOLY_STRIKE, SKILLS.DIVINE_BURST, SKILLS.METEOR_BREAK]
  },
  [JobType.MAGIC_WARRIOR]: {
    name: JobType.MAGIC_WARRIOR,
    multiplier: 12.0,
    unlockLevel: 50,
    skills: [SKILLS.SLASH, SKILLS.POWER_ATTACK, SKILLS.HOLY_STRIKE, SKILLS.DIVINE_BURST, SKILLS.METEOR_BREAK, SKILLS.GALAXY_SLASH]
  },
  [JobType.GREAT_MAGIC_WARRIOR]: {
    name: JobType.GREAT_MAGIC_WARRIOR,
    multiplier: 20.0,
    unlockLevel: 60,
    skills: [SKILLS.SLASH, SKILLS.POWER_ATTACK, SKILLS.HOLY_STRIKE, SKILLS.DIVINE_BURST, SKILLS.METEOR_BREAK, SKILLS.GALAXY_SLASH, SKILLS.VOID_CUTTER]
  },
  [JobType.GOD_MAGIC_WARRIOR]: {
    name: JobType.GOD_MAGIC_WARRIOR,
    multiplier: 50.0,
    unlockLevel: 70,
    skills: [SKILLS.SLASH, SKILLS.POWER_ATTACK, SKILLS.HOLY_STRIKE, SKILLS.DIVINE_BURST, SKILLS.METEOR_BREAK, SKILLS.GALAXY_SLASH, SKILLS.VOID_CUTTER, SKILLS.GOD_BLOW]
  },
  [JobType.ULTIMATE_WARRIOR]: {
    name: JobType.ULTIMATE_WARRIOR,
    multiplier: 150.0,
    unlockLevel: 80,
    skills: [SKILLS.SLASH, SKILLS.POWER_ATTACK, SKILLS.HOLY_STRIKE, SKILLS.DIVINE_BURST, SKILLS.METEOR_BREAK, SKILLS.GALAXY_SLASH, SKILLS.VOID_CUTTER, SKILLS.GOD_BLOW, SKILLS.INFINITY_EDGE]
  },
  [JobType.LEGENDARY_HERO]: {
    name: JobType.LEGENDARY_HERO,
    multiplier: 500.0,
    unlockLevel: 100,
    skills: [SKILLS.SLASH, SKILLS.POWER_ATTACK, SKILLS.HOLY_STRIKE, SKILLS.DIVINE_BURST, SKILLS.METEOR_BREAK, SKILLS.GALAXY_SLASH, SKILLS.VOID_CUTTER, SKILLS.GOD_BLOW, SKILLS.INFINITY_EDGE, SKILLS.LEGEND_CROSS]
  }
};

export const ENEMY_TYPES = [
  { name: 'スライム', hp: 40, gold: 2, xp: 10 },
  { name: 'ゴブリン', hp: 80, gold: 4, xp: 15 },
  { name: 'ウルフ', hp: 120, gold: 6, xp: 20 },
  { name: 'オーク', hp: 200, gold: 10, xp: 35 },
  { name: 'スケルトン', hp: 300, gold: 15, xp: 50 },
  { name: 'ゴースト', hp: 400, gold: 20, xp: 70 },
  { name: 'ゴーレム', hp: 1000, gold: 50, xp: 150 },
  { name: 'ワイバーン', hp: 1600, gold: 100, xp: 300 },
  { name: 'ドラゴン', hp: 4000, gold: 250, xp: 800 },
  { name: 'デーモン', hp: 10000, gold: 500, xp: 2000 }
];

export const BOSS_TYPES = {
  10: { name: 'ジャイアントスライム', hp: 1000, gold: 100, xp: 300 },
  20: { name: 'ゴブリンキング', hp: 2400, gold: 250, xp: 800 },
  30: { name: 'フェンリル', hp: 6000, gold: 500, xp: 1500 },
  40: { name: 'ハイオークジェネラル', hp: 12000, gold: 1000, xp: 3000 },
  50: { name: 'リッチロード', hp: 30000, gold: 2500, xp: 8000 },
  60: { name: 'エンシェントドラゴン', hp: 100000, gold: 10000, xp: 30000 },
  70: { name: 'アークデーモン', hp: 400000, gold: 40000, xp: 100000 },
  80: { name: 'カオスナイト', hp: 2000000, gold: 150000, xp: 500000 },
  90: { name: '魔王の影', hp: 10000000, gold: 500000, xp: 2000000 },
  100: { name: '真・魔王', hp: 100000000, gold: 5000000, xp: 20000000 }
} as const;

export const EQUIP_NAMES: Record<EquipmentType, string[]> = {
  [EquipmentType.WEAPON]: ['木の棒', '銅の剣', '鉄の剣', '鋼の剣', 'ミスリルの剣', 'オリハルコンの剣', 'ドラゴンスレイヤー', '魔剣グラム', '聖剣エクスカリバー', '神剣ラグナロク'],
  [EquipmentType.HELM]: ['布の帽子', '革の帽子', '鉄の兜', '鋼の兜', 'ミスリルの兜', '騎士の兜', '竜騎士の兜', '聖騎士の兜', '王者の冠', '神の冠'],
  [EquipmentType.ARMOR]: ['布の服', '革の鎧', '鎖帷子', '鉄の鎧', '鋼の鎧', 'ミスリルの鎧', 'ドラゴンメイル', '聖なる鎧', '英雄の鎧', '神の鎧'],
  [EquipmentType.SHIELD]: ['鍋の蓋', '木の盾', '革の盾', '鉄の盾', '鋼の盾', 'ミスリルの盾', '勇者の盾', 'アイギス', 'プリトウェン', '絶対防御']
};

export const RANK_DATA: Record<EquipmentRank, { color: string, multiplier: number, probNormal: number, probBoss: number }> = {
  [EquipmentRank.D]: { color: 'text-slate-200', multiplier: 1.0, probNormal: 0.96, probBoss: 0.40 },
  [EquipmentRank.C]: { color: 'text-green-400', multiplier: 128.0, probNormal: 0.025, probBoss: 0.40 },
  [EquipmentRank.B]: { color: 'text-blue-400', multiplier: 32768.0, probNormal: 0, probBoss: 0 },
  [EquipmentRank.A]: { color: 'text-red-400', multiplier: 20971520.0, probNormal: 0, probBoss: 0 },
  [EquipmentRank.S]: { color: 'text-yellow-400', multiplier: 67108864000.0, probNormal: 0, probBoss: 0 }
};

export const MERCHANT_ITEMS: { key: keyof MerchantUpgrades, name: string, baseCost: number, desc: string }[] = [
  { key: 'attackBonus', name: '攻撃力強化', baseCost: 1000, desc: '攻撃力増加' },
  { key: 'critDamage', name: '会心威力強化', baseCost: 1e7, desc: 'ベース30% + Lv×(Lv+1)×2% 増加' },
  { key: 'critRate', name: '会心率強化', baseCost: 1e10, desc: 'クリティカル率増加 (Max 50%)' },
  { key: 'weaponBoost', name: '武器研磨', baseCost: 1e11, desc: '武器効果UP' },
  { key: 'helmBoost', name: '兜改良', baseCost: 1e14, desc: '兜効果UP' },
  { key: 'armorBoost', name: '鎧補強', baseCost: 1e17, desc: '鎧効果UP' },
  { key: 'shieldBoost', name: '盾強化', baseCost: 1e23, desc: '盾効果UP' },
  { key: 'giantKilling', name: 'ジャイアントキリング', baseCost: 1e32, desc: 'ボスへのダメージ増加' },
];

export const REINCARNATION_ITEMS: { key: keyof ReincarnationUpgrades, name: string, baseCost: number, desc: string }[] = [
  { key: 'xpBoost', name: '経験の書', baseCost: 100, desc: '獲得経験値を増加' },
  { key: 'goldBoost', name: '幸運のコイン', baseCost: 100, desc: '獲得ゴールドを増加' },
  { key: 'stoneBoost', name: '転生の秘儀', baseCost: 500, desc: '獲得転生石を増加' },
  { key: 'startFloor', name: '転生階層スキップ', baseCost: 500, desc: '開始階層 +100' },
  { key: 'autoPromote', name: '自動転職', baseCost: 5000, desc: 'Lv条件を満たすと自動で転職 (習得済み)' },
  { key: 'autoEquip', name: '自動装備', baseCost: 5000, desc: '強い装備を拾ったら自動装備 (習得済み)' },
  { key: 'autoMerchant', name: '自動商人購入', baseCost: 10000000, desc: '商人画面で自動購入が可能になる (習得済み)' },
  { key: 'itemFilter', name: 'ドロップ選別', baseCost: 1000000, desc: 'ドロップする装備部位を指定可能になる (習得済み)' },
  { key: 'farming', name: '自動周回', baseCost: 100000000, desc: '指定した階層範囲を自動で周回できるようになる (習得済み)' },
  { key: 'autoEnhance', name: '自動装備強化', baseCost: 10000000, desc: '拾った装備を自動で合成・強化する (習得済み)' },
  { key: 'itemPersistence', name: '装備継承', baseCost: 0, desc: '転生時に高ランク装備を引き継ぐ (Lv1:B, Lv2:A, Lv3:S)' },
  { key: 'baseAttackBoost', name: '英雄の魂', baseCost: 1000, desc: '基礎攻撃力を増加' },
  { key: 'enemyHpDown', name: '敵HP弱体化', baseCost: 1000, desc: '敵のHPを低下' },
  { key: 'skillDamageBoost', name: 'スキル威力UP', baseCost: 2000, desc: 'スキルのダメージ倍率を増加' },
  { key: 'priceDiscount', name: '値切り上手', baseCost: 1000, desc: '商人の購入価格が安くなる' },
  { key: 'concentration', name: '集中', baseCost: 20000000, desc: '発動時、10秒間スキル発動率+30% (CT60秒)' },
  { key: 'vitalSpot', name: '急所', baseCost: 20000000, desc: '発動時、10秒間クリティカル率+20% (CT60秒)' },
  { key: 'hyperSpeed', name: '神速', baseCost: 50000000, desc: '発動時、攻撃回数が10倍になる (CT60秒)' },
  { key: 'awakening', name: '覚醒', baseCost: 1000000000, desc: '発動時、10秒間攻撃2倍・会心+25%・スキル率+15% (CT60秒)' },
];

export const GAME_MANUAL = [
  { title: '終わりのない塔へようこそ', content: '「タワー攻略者たち」は、ひたすら塔の最上階を目指して登り続ける放置系RPGです。敵を倒して経験値とゴールドを稼ぎ、キャラクターを強化しましょう。' },
  { title: 'やり込み要素：装備厳選', content: '敵は確率で装備をドロップします。同じ「銅の剣」でもランク（D〜S）や強化値（+0〜+2）が異なります。\nTierは500階ごとに切り替わり、より強力な基礎ステータスを持つ装備が手に入ります。' },
  { title: 'やり込み要素：無限の合成', content: 'ドロップするのはCランク(+2)まで。それ以上の強さを手に入れるには「合成」が必要です。\n同じ装備(+2)同士を合成すると、ランクが昇格し(+0)、飛躍的に強くなります。\n目指せ、幻のSランク装備！' },
  { title: 'やり込み要素：コレクション', content: '「せっかく拾った装備、売るのがもったいない…」そんなあなたに朗報です。\nこの世界では「所持している全ての装備」の攻撃力の20%がボーナスとして加算されます。\nインベントリをレア装備で埋め尽くし、最強のステータスを目指しましょう。' },
  { title: '転生と継承', content: '100階を超えると「転生」が可能になります。レベルは1に戻りますが、強力な「転生スキル」やステータスボーナスを得られます。\nスキル「装備継承」を取得すれば、手塩にかけて育てた高ランク装備を次の人生に持ち越すことも可能です。' },
  { title: '真の強敵', content: '500階ごとに待ち受ける「スーパーフロアボス」は通常の100倍のHPを持つ難敵です。\nしかし、彼らだけがドロップする「Aランク装備(0.1%)」を手に入れた時、あなたの冒険は新たな次元へ突入するでしょう。' }
];

export const UPDATE_HISTORY = [
  { version: '1.2.3', date: '2025-12-08', desc: 'パラメータ調整。\n・基礎クリティカル率を5%に変更\n・クリティカル威力の計算式を変更\n・セットボーナス効果の不具合を修正' },
  { version: '1.2.2', date: '2025-12-07', desc: '商人スキルのコストバランスを調整。\n・攻撃力強化などのコスト上昇率を変更 (1.2倍 -> 1.5倍)\n・基本コストを再設定' },
  { version: '1.2.1', date: '2025-12-06', desc: 'バックグラウンド時の動作停止処理を強化。\nBGMの再生処理を改善。\nゲームバランス調整（敵HP2倍、獲得Gold半減）。' },
  { version: '1.2.0', date: '2025-12-05', desc: '新転生スキル「自動装備強化」追加。\nスキル「神速」の仕様を変更（Lvに応じて効果時間が延長）。' },
  { version: '1.1.0', date: '2025-12-04', desc: 'ゲーム概要（マニュアル）を刷新。作者リンクを追加。' },
  { version: '1.0.14', date: '2025-12-03', desc: '500階毎に「スーパーフロアボス」が登場するように変更。\n・HP/XPが通常の100倍\n・0.1%の確率でAランク装備をドロップする機能を追加' },
  { version: '1.0.13', date: '2025-12-02', desc: '「コレクションボーナス」機能を実装。\n所持している全装備の攻撃力の20%がステータスに加算されるようになりました。' },
  { version: '1.0.12', date: '2025-12-01', desc: '新転生スキル「自動周回」を追加。指定した階層範囲をループできるようになります。' },
  { version: '1.0.11', date: '2025-11-30', desc: '装備強化仕様変更。\n・最大強化値を+2から+5に変更\n・ドロップ制限をCランク+2までに変更\n・ランク間の倍率を再調整 (例: C0 = D5 x 4)' },
  { version: '1.0.10', date: '2025-11-29', desc: 'ドロップ仕様変更。\n・ドロップ上限をCランク+2に変更（Bランク以上は合成のみ）\n・装備比較時の数値表記を改善' },
  { version: '1.0.9', date: '2025-11-28', desc: '新転生スキル「装備継承」を追加。特定ランク以上の装備を転生後も保持できます。\nボスドロップ仕様変更：10階毎に10個、100階毎に30個確定ドロップ。' },
  { version: '1.0.8', date: '2025-11-27', desc: '装備システム大規模改修。\n・Tier切り替えを500階ごとに変更\n・強化値を最大+2に変更\n・ドロップはBランク+2まで、A/Sは合成のみ\n・階層深度に応じてドロップ品質が向上' },
  { version: '1.0.7', date: '2025-11-26', desc: '新転生スキル「ドロップ選別」を追加。不要な装備ドロップをOFFにできます。' },
  { version: '1.0.0', date: '2025-11-20', desc: 'リリース' }
];
