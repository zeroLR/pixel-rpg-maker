
import React, { useState, useEffect, useRef } from 'react';
import { GameState, Entity, Player, EntityType, SaveData } from './types';
import { Workshop } from './components/Workshop';
import { Game } from './components/Game';
import { Gallery } from './components/Gallery';
import { Button, Card } from './components/UI';
import * as storage from './services/storageService';

const App: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [gameState, setGameState] = useState<GameState>(GameState.MENU);
    const [player, setPlayer] = useState<Player | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [storageError, setStorageError] = useState<string | null>(null);
    
    // Global Library State
    const [libraryNpcs, setLibraryNpcs] = useState<Entity[]>([]);
    const [libraryEnemies, setLibraryEnemies] = useState<Entity[]>([]);
    const [libraryHeroes, setLibraryHeroes] = useState<Entity[]>([]);
    const [labels, setLabels] = useState<string[]>([]);

    // World Configuration (Assets selected to appear in New Games)
    const [activeEntityIds, setActiveEntityIds] = useState<string[]>([]);

    // Active Game World State (Runtime)
    const [worldNpcs, setWorldNpcs] = useState<Entity[]>([]);
    const [worldEnemies, setWorldEnemies] = useState<Entity[]>([]);

    // Settings & Saves
    const [autoSave, setAutoSave] = useState(true);
    const [saveSlots, setSaveSlots] = useState<(SaveData | null)[]>([null, null, null]);

    // Initial Load
    useEffect(() => {
        const initializeApp = async () => {
            try {
                // Load Library
                const [dbLibNpcs, dbLibEnemies, dbLibHeroes, dbLabels, dbActiveIds] = await Promise.all([
                    storage.getItem<Entity[]>('pixel_rpg_library_npcs'),
                    storage.getItem<Entity[]>('pixel_rpg_library_enemies'),
                    storage.getItem<Entity[]>('pixel_rpg_library_heroes'),
                    storage.getItem<string[]>('pixel_rpg_labels'),
                    storage.getItem<string[]>('pixel_rpg_active_ids')
                ]);

                // Legacy Migration: Check for 'monsters' if 'enemies' not found
                let legacyEnemies: Entity[] | null = null;
                if (!dbLibEnemies) {
                     legacyEnemies = await storage.getItem<Entity[]>('pixel_rpg_library_monsters');
                }

                setLibraryNpcs(dbLibNpcs || []);
                setLibraryEnemies(dbLibEnemies || legacyEnemies || []);
                setLibraryHeroes(dbLibHeroes || []);
                setLabels(dbLabels || ['Fantasy', 'Sci-Fi', 'Dark', 'Boss']);
                setActiveEntityIds(dbActiveIds || []);

                // Load Save Metadata (Preview of slots)
                const slots: (SaveData | null)[] = [];
                for (let i = 1; i <= 3; i++) {
                    const data = await storage.getItem<any>(`pixel_rpg_save_${i}`);
                    if (data) {
                         // Backward compatibility for Save Data
                         if (data.worldMonsters && !data.worldEnemies) {
                             data.worldEnemies = data.worldMonsters;
                             delete data.worldMonsters;
                         }
                         slots.push(data as SaveData);
                    } else {
                        slots.push(null);
                    }
                }
                setSaveSlots(slots);

                // Load AutoSave setting
                const storedAutoSave = await storage.getItem<boolean>('pixel_rpg_autosave');
                if (storedAutoSave !== null) setAutoSave(storedAutoSave);

            } catch (e) {
                console.error("Failed to initialize app data:", e);
                setStorageError("Failed to load game data.");
            } finally {
                setLoading(false);
            }
        };

        initializeApp();
    }, []);

    // Library Persistence
    const saveToDB = async (key: string, data: any) => {
        try {
            await storage.setItem(key, data);
        } catch (e: any) {
            console.error("Storage failed", e);
            setStorageError("⚠️ Storage Error! Failed to save data.");
        }
    };

    useEffect(() => { if(!loading) saveToDB('pixel_rpg_library_npcs', libraryNpcs); }, [libraryNpcs, loading]);
    useEffect(() => { if(!loading) saveToDB('pixel_rpg_library_enemies', libraryEnemies); }, [libraryEnemies, loading]);
    useEffect(() => { if(!loading) saveToDB('pixel_rpg_library_heroes', libraryHeroes); }, [libraryHeroes, loading]);
    useEffect(() => { if(!loading) saveToDB('pixel_rpg_labels', labels); }, [labels, loading]);
    useEffect(() => { if(!loading) saveToDB('pixel_rpg_autosave', autoSave); }, [autoSave, loading]);
    useEffect(() => { if(!loading) saveToDB('pixel_rpg_active_ids', activeEntityIds); }, [activeEntityIds, loading]);

    // --- Workshop Handlers ---
    const handleAddToLibrary = (entity: Entity) => {
        if (entity.type === EntityType.NPC) setLibraryNpcs(prev => [...prev, entity]);
        else if (entity.type === EntityType.ENEMY) setLibraryEnemies(prev => [...prev, entity]);
        else if (entity.type === EntityType.HERO) setLibraryHeroes(prev => [...prev, entity]);
    };

    const handleAddToWorld = (entity: Entity) => {
        // Add to Library first if not exists (implicitly handled by Save to Gallery, but here we just enable it)
        handleAddToLibrary(entity);
        
        if (entity.type !== EntityType.HERO) {
            setActiveEntityIds(prev => prev.includes(entity.id) ? prev : [...prev, entity.id]);
        } else {
            alert("Heroes cannot be added as NPCs/Enemies. Save to Gallery and select 'Start New Adventure'!");
        }
    };

    // --- Gallery Handlers ---
    const handleDeleteFromLibrary = (ids: string[]) => {
        const filterFn = (e: Entity) => !ids.includes(e.id);
        setLibraryNpcs(prev => prev.filter(filterFn));
        setLibraryEnemies(prev => prev.filter(filterFn));
        setLibraryHeroes(prev => prev.filter(filterFn));
        
        // Also remove from active configuration
        setActiveEntityIds(prev => prev.filter(id => !ids.includes(id)));
    };

    const handleToggleWorldStatus = (entities: Entity[], shouldAdd: boolean) => {
        const targetIds = entities.map(e => e.id);
        setActiveEntityIds(prev => {
            if (shouldAdd) {
                // Add unique IDs
                const next = new Set(prev);
                targetIds.forEach(id => next.add(id));
                return Array.from(next);
            } else {
                // Remove IDs
                return prev.filter(id => !targetIds.includes(id));
            }
        });
    };

    // --- Game Flow ---

    const handleSelectHero = (hero: Entity) => {
        // Initialize New Game
        const newPlayer: Player = {
            name: hero.name,
            stats: { ...hero.stats },
            inventory: [],
            imageBase64: hero.imageBase64
        };
        setPlayer(newPlayer);
        
        // Initialize World from Configuration (activeEntityIds)
        const initialNpcs = libraryNpcs.filter(e => activeEntityIds.includes(e.id));
        const initialEnemies = libraryEnemies.filter(e => activeEntityIds.includes(e.id));
        
        setWorldNpcs(initialNpcs);
        setWorldEnemies(initialEnemies);
        setGameState(GameState.TOWN);
    };

    const handleSaveGame = async (slotId: number) => {
        if (!player) return;
        const data: SaveData = {
            timestamp: new Date().toLocaleString(),
            player,
            worldNpcs,
            worldEnemies,
            location: 'TOWN' 
        };
        await storage.setItem(`pixel_rpg_save_${slotId}`, data);
        
        // Update slots preview
        setSaveSlots(prev => {
            const next = [...prev];
            next[slotId - 1] = data;
            return next;
        });

        if(slotId !== 1) alert(`Game saved to Slot ${slotId}!`);
    };

    const handleLoadGame = (slotId: number) => {
        const data = saveSlots[slotId - 1];
        if (!data) return;

        setPlayer(data.player);
        setWorldNpcs(data.worldNpcs);
        setWorldEnemies(data.worldEnemies);
        setGameState(GameState.TOWN); 
    };

    // Auto Save Logic (Slot 1)
    useEffect(() => {
        if (autoSave && player && (gameState === GameState.TOWN || gameState === GameState.FOREST)) {
             // Simple autosave on state change/navigation
             handleSaveGame(1);
        }
    }, [gameState, player, autoSave]);

    // --- Labels ---
    const handleCreateLabel = (l: string) => !labels.includes(l) && setLabels([...labels, l]);
    const handleDeleteLabel = (l: string) => setLabels(labels.filter(x => x !== l));

    // --- Import / Export ---
    const handleExportData = () => {
        const data = {
            libraryNpcs,
            libraryEnemies,
            libraryHeroes,
            labels,
            activeEntityIds,
            saveSlots,
            autoSave
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pixel_rpg_data_${new Date().getTime()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const raw = event.target?.result as string;
                const data = JSON.parse(raw);
                
                setLoading(true);
                
                // Update States
                if (data.libraryNpcs) setLibraryNpcs(data.libraryNpcs);
                if (data.libraryEnemies) setLibraryEnemies(data.libraryEnemies);
                // Legacy check during import
                if (!data.libraryEnemies && data.libraryMonsters) setLibraryEnemies(data.libraryMonsters);

                if (data.libraryHeroes) setLibraryHeroes(data.libraryHeroes);
                if (data.labels) setLabels(data.labels);
                if (data.activeEntityIds) setActiveEntityIds(data.activeEntityIds);
                if (data.autoSave !== undefined) setAutoSave(data.autoSave);
                
                // Handle Save Slots
                if (data.saveSlots && Array.isArray(data.saveSlots)) {
                    // Normalize Save Data
                    const normalizedSlots = data.saveSlots.map((slot: any) => {
                        if (slot && slot.worldMonsters && !slot.worldEnemies) {
                            slot.worldEnemies = slot.worldMonsters;
                        }
                        return slot;
                    });
                    setSaveSlots(normalizedSlots);
                    for (let i = 0; i < normalizedSlots.length; i++) {
                        await storage.setItem(`pixel_rpg_save_${i + 1}`, normalizedSlots[i]);
                    }
                }

                alert("Game Data Imported Successfully!");
            } catch (err) {
                console.error("Import failed", err);
                alert("Failed to import data. File might be corrupted.");
            } finally {
                setLoading(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    // --- Render ---

    if (loading) {
        return (
             <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center text-yellow-400 font-mono">
                <div className="text-2xl animate-pulse mb-4">LOADING WORLD...</div>
            </div>
        );
    }

    // Sub-screen: Select Hero
    if (gameState === GameState.SELECT_HERO) {
        return (
            <Gallery 
                entities={libraryHeroes}
                worldEntityIds={new Set()}
                onDelete={() => {}} // Disable delete in selection mode
                onToggleWorldStatus={() => {}}
                onBack={() => setGameState(GameState.MENU)}
                onSelect={handleSelectHero}
                selectionMode={true}
            />
        );
    }

    // Sub-screen: Load Game
    if (gameState === GameState.LOAD_GAME) {
         return (
            <div className="min-h-screen bg-[#1a1a2e] p-8 flex flex-col items-center animate-fade-in">
                <h2 className="text-3xl text-yellow-400 pixel-font mb-8">Load Adventure</h2>
                <div className="grid gap-6 w-full max-w-2xl">
                    {saveSlots.map((slot, index) => (
                        <Card key={index} className="relative">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl text-white font-bold mb-1">
                                        Slot {index + 1} {index === 0 && <span className="text-xs text-yellow-500 ml-2">(AUTO)</span>}
                                    </h3>
                                    {slot ? (
                                        <div className="text-sm text-slate-400">
                                            <p>Hero: <span className="text-white">{slot.player.name}</span></p>
                                            <p>Saved: {slot.timestamp}</p>
                                        </div>
                                    ) : (
                                        <p className="text-slate-600 italic">Empty Slot</p>
                                    )}
                                </div>
                                {slot && (
                                    <Button onClick={() => handleLoadGame(index + 1)} variant="primary">
                                        LOAD
                                    </Button>
                                )}
                            </div>
                        </Card>
                    ))}
                </div>
                <Button onClick={() => setGameState(GameState.MENU)} variant="secondary" className="mt-8">Back</Button>
            </div>
         );
    }

    const renderMenu = () => (
        <div className="flex flex-col items-center justify-center h-full space-y-8 p-4 animate-fade-in relative">
            <div className="text-center space-y-2">
                <h1 className="text-4xl md:text-6xl text-yellow-400 text-shadow pixel-font tracking-wider">PIXEL RPG MAKER</h1>
                <p className="text-slate-400 font-mono">Create Assets. Play Adventure.</p>
            </div>

            <div className="flex flex-col gap-4 w-full max-w-md">
                <Button onClick={() => setGameState(GameState.SELECT_HERO)} className="text-xl py-4 border-yellow-600 text-yellow-100">
                    Start New Adventure
                </Button>
                <Button onClick={() => setGameState(GameState.LOAD_GAME)} className="text-xl py-4" variant="secondary">
                    Load Adventure
                </Button>
                <div className="h-px bg-slate-700 my-2" />
                <Button onClick={() => setGameState(GameState.WORKSHOP)} className="text-xl py-4" variant="primary">
                    Asset Workshop
                </Button>
                <Button onClick={() => setGameState(GameState.GALLERY)} className="text-xl py-4" variant="secondary">
                    Asset Gallery
                </Button>
                
                <div className="flex gap-2 pt-2">
                    <Button onClick={handleExportData} variant="secondary" className="flex-1 text-sm">
                        Export Data
                    </Button>
                    <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="flex-1 text-sm">
                        Import Data
                    </Button>
                    <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleImportData}
                        className="hidden"
                        accept=".json"
                    />
                </div>
            </div>

            <div className="w-full max-w-md border-t border-slate-700 pt-4 mt-2">
                <div className="flex justify-center items-center gap-2 mb-4">
                     <label className="text-slate-400 text-sm flex items-center cursor-pointer select-none">
                        <input 
                            type="checkbox" 
                            checked={autoSave} 
                            onChange={e => setAutoSave(e.target.checked)}
                            className="mr-2 w-4 h-4 accent-yellow-500"
                        />
                        Enable Auto-Save (Slot 1)
                     </label>
                </div>
            </div>
            
            <div className="text-xs text-slate-600 flex flex-col items-center gap-1">
                <span>Library: {libraryHeroes.length} Heroes, {libraryNpcs.length} NPCs, {libraryEnemies.length} Enemies</span>
                <span>World Config: {activeEntityIds.length} Entities Active</span>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#1a1a2e] text-slate-200 selection:bg-yellow-500 selection:text-black overflow-hidden flex flex-col">
            {storageError && (
                <div className="bg-red-600 text-white text-center p-2 text-sm font-bold animate-pulse border-b-2 border-red-800 z-50">
                    {storageError}
                </div>
            )}
            
            {gameState === GameState.MENU && renderMenu()}
            
            {gameState === GameState.WORKSHOP && (
                <Workshop 
                    onAddToLibrary={handleAddToLibrary}
                    onAddToWorld={handleAddToWorld}
                    onBack={() => setGameState(GameState.MENU)} 
                    availableLabels={labels}
                    onCreateLabel={handleCreateLabel}
                    onDeleteLabel={handleDeleteLabel}
                />
            )}

            {gameState === GameState.GALLERY && (
                <Gallery 
                    entities={[...libraryNpcs, ...libraryEnemies, ...libraryHeroes]}
                    worldEntityIds={new Set(activeEntityIds)}
                    onDelete={handleDeleteFromLibrary}
                    onToggleWorldStatus={handleToggleWorldStatus}
                    onBack={() => setGameState(GameState.MENU)}
                />
            )}

            {(gameState === GameState.TOWN || gameState === GameState.FOREST || gameState === GameState.BATTLE) && player && (
                <Game 
                    player={player}
                    updatePlayer={setPlayer}
                    npcs={worldNpcs}
                    enemies={worldEnemies}
                    onExit={() => {
                        setGameState(GameState.MENU);
                        if(autoSave) handleSaveGame(1); // Auto save on exit
                    }}
                    onSave={handleSaveGame}
                />
            )}
        </div>
    );
};

export default App;
