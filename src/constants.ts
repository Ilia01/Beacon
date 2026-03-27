export const CS_THRESHOLD = 0.75;
export const GOLD_RECALL_MIN = 1300;
export const GOLD_RECALL_MAX = 1600;
export const GOLD_SITTING = 2500;

export const TAB_CHECK_INTERVAL_S = 180; // 3 min
export const VISION_CHECK_INTERVAL_S = 240; // 4 min

export const DRAGON_FIRST_SPAWN_S = 300; // 5:00
export const DRAGON_RESPAWN_S = 300; // 5 min after kill
export const BARON_FIRST_SPAWN_S = 1200; // 20:00
export const BARON_RESPAWN_S = 420; // 7 min after kill

// How many seconds before the spawn to start firing objective prompts
export const OBJECTIVE_UPCOMING_WINDOW_S = 90;

// Level spikes where trading advantage shifts meaningfully
export const TRADING_LEVEL_SPIKES: readonly number[] = [2, 3, 6, 9, 11, 16];
