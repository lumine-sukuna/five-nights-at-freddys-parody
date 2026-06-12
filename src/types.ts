export enum GameState {
  MENU = 'MENU',
  INTRO = 'INTRO',
  PLAYING = 'PLAYING',
  JUMPSCARED = 'JUMPSCARED',
  OUTOFPOWER = 'OUTOFPOWER',
  VICTORY = 'VICTORY',
  GAME_OVER = 'GAME_OVER',
  UNITY_CODE = 'UNITY_CODE'
}

export type AnimatronicType = 'BLINKY' | 'ZIGGY' | 'SIRENA' | 'GLITCHER';

export interface Animatronic {
  id: AnimatronicType;
  name: string;
  nameUk: string;
  description: string;
  avatarColor: string;
  behaviorUk: string;
  behaviorEn: string;
  currentCam: string; // e.g. 'STAGE', 'HALL_L', 'OFFICE'
  aiLevel: number; // 0-20 difficulty
  movementTimer: number; // time left before next potential move
  path: string[]; // sequence of cams
  attackDoor: 'LEFT' | 'RIGHT' | 'CENTER';
  lastMoveStatus: 'STATIONARY' | 'MOVED' | 'ATTACKING';
}

export interface CameraDefinition {
  id: string;
  name: string;
  nameUk: string;
  description: string;
}

export const CAMERAS: CameraDefinition[] = [
  { id: 'STAGE', name: 'CAM 1 - Show Stage', nameUk: 'КАМ 1 - Головна Сцена', description: 'Showroom with animatronics' },
  { id: 'DINING', name: 'CAM 2 - Dining Area', nameUk: 'КАМ 2 - Обедіння Зона', description: 'Left path pathway area' },
  { id: 'ARCADE', name: 'CAM 3 - Arcade Hall', nameUk: 'КАМ 3 - Зала Автоматів', description: 'Right path pathway area' },
  { id: 'KIDS_PLAY', name: 'CAM 4 - Kids Fun Zone', nameUk: 'КАМ 4 - Дитяча Зона', description: 'Slow characters route' },
  { id: 'BACKSTAGE', name: 'CAM 5 - Backstage Loft', nameUk: 'КАМ 5 - Закулісся', description: 'Storage and spare parts' },
  { id: 'VENT_L', name: 'CAM 6 - Left Air Vent', nameUk: 'КАМ 6 - Ліва Вентиляція', description: 'leads directly to Left doorway' },
  { id: 'VENT_R', name: 'CAM 7 - Right Air Vent', nameUk: 'КАМ 7 - Права Вентиляція', description: 'leads directly to Right doorway' },
  { id: 'PRIZE', name: 'CAM 8 - The Glitch Corner', nameUk: 'КАМ 8 - Куточок Тіней', description: 'The puppet/glitcher chamber' },
];

export interface SavedProgress {
  unlockedNight: number; // 1 to 6
  highscoreSeconds: number;
}
