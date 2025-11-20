
export enum EntityType {
    NPC = 'NPC',
    ENEMY = 'ENEMY',
    HERO = 'HERO'
}

export enum GameState {
    MENU = 'MENU',
    WORKSHOP = 'WORKSHOP',
    GALLERY = 'GALLERY',
    SELECT_HERO = 'SELECT_HERO',
    LOAD_GAME = 'LOAD_GAME',
    TOWN = 'TOWN',
    FOREST = 'FOREST',
    BATTLE = 'BATTLE',
    DIALOGUE = 'DIALOGUE'
}

export interface Stats {
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    atk: number;
    def: number;
}

export interface Entity {
    id: string;
    name: string;
    description: string;
    type: EntityType;
    imageBase64: string;
    stats: Stats;
    dialoguePrompt?: string; // For NPCs
    tags: string[];
    originalPrompt?: string; // The user input prompt used to generate this entity
}

export interface Player {
    name: string;
    stats: Stats;
    inventory: string[];
    imageBase64?: string;
}

export interface ChatMessage {
    sender: string;
    text: string;
}

export interface SaveData {
    timestamp: string;
    player: Player;
    worldNpcs: Entity[];
    worldEnemies: Entity[];
    location: string | null;
}