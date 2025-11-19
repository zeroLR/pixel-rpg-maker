
import React, { useState, useEffect, useRef } from 'react';
import { GameState, Entity, Player, EntityType } from './types';
import { Workshop } from './components/Workshop';
import { Game } from './components/Game';
import { Gallery } from './components/Gallery';
import { Button, Card } from './components/UI';
import * as storage from './services/storageService';

const INITIAL_PLAYER: Player = {
    name: "Hero",
    stats: {
        hp: 100,
        maxHp: 100,
        mp: 100,
        maxMp: 100,
        atk: 10,
        def: 10
    },
    inventory: []
};

const App: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [gameState, setGameState] = useState<GameState>(GameState.MENU);
    const [player, setPlayer] = useState<Player>(INITIAL_PLAYER);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [storageError, setStorageError] = useState<string | null>(null);
    
    // State - Initialized empty, populates via useEffect
    const [libraryNpcs, setLibraryNpcs] = useState<Entity[]>([]);
    const [libraryMonsters, setLibraryMonsters] = useState<Entity[]>([]);
    const [worldNpcs, setWorldNpcs] = useState<Entity[]>([]);
    const [worldMonsters, setWorldMonsters] = useState<Entity[]>([]);
    const [labels, setLabels] = useState<string[]>([]);

    // Initial Load & Migration Effect
    useEffect(() => {
        const initializeApp = async () => {
            try {
                // Try load from IDB
                const [dbLibNpcs, dbLibMonsters, dbWorldNpcs, dbWorldMonsters, dbLabels] = await Promise.all([
                    storage.getItem<Entity[]>('pixel_rpg_library_npcs'),
                    storage.getItem<Entity[]>('pixel_rpg_library_monsters'),
                    storage.getItem<Entity[]>('pixel_rpg_world_npcs'),
                    storage.getItem<Entity[]>('pixel_rpg_world_monsters'),
                    storage.getItem<string[]>('pixel_rpg_labels')
                ]);

                // Checks for data existence
                const hasDBData = dbLibNpcs || dbLibMonsters || dbLabels;

                if (!hasDBData) {
                    console.log("No IDB data found. Checking LocalStorage for migration...");
                    // Migration Logic: Pull from localStorage if IDB is empty
                    const lsLibNpcs = localStorage.getItem('pixel_rpg_library_npcs') || localStorage.getItem('pixel_rpg_npcs');
                    const lsLibMonsters = localStorage.getItem('pixel_rpg_library_monsters') || localStorage.getItem('pixel_rpg_monsters');
                    const lsWorldNpcs = localStorage.getItem('pixel_rpg_world_npcs');
                    const lsWorldMonsters = localStorage.getItem('pixel_rpg_world_monsters');
                    const lsLabels = localStorage.getItem('pixel_rpg_labels');

                    const cleanParse = (str: string | null, fallback: any) => str ? JSON.parse(str) : fallback;

                    const migratedLibNpcs = cleanParse(lsLibNpcs, []);
                    const migratedLibMonsters = cleanParse(lsLibMonsters, []);
                    const migratedWorldNpcs = cleanParse(lsWorldNpcs, []);
                    const migratedWorldMonsters = cleanParse(lsWorldMonsters, []);
                    const migratedLabels = cleanParse(lsLabels, ['Fantasy', 'Sci-Fi', 'Cute', 'Dark', 'Boss']);

                    // Set State
                    setLibraryNpcs(migratedLibNpcs);
                    setLibraryMonsters(migratedLibMonsters);
                    setWorldNpcs(migratedWorldNpcs);
                    setWorldMonsters(migratedWorldMonsters);
                    setLabels(migratedLabels);

                    // Save to IDB immediately
                    await Promise.all([
                        storage.setItem('pixel_rpg_library_npcs', migratedLibNpcs),
                        storage.setItem('pixel_rpg_library_monsters', migratedLibMonsters),
                        storage.setItem('pixel_rpg_world_npcs', migratedWorldNpcs),
                        storage.setItem('pixel_rpg_world_monsters', migratedWorldMonsters),
                        storage.setItem('pixel_rpg_labels', migratedLabels)
                    ]);
                    
                    // Optional: Clear localStorage after successful migration to free up space?
                    // keeping it for now as backup or manually cleared.
                } else {
                    // Normal Load
                    setLibraryNpcs(dbLibNpcs || []);
                    setLibraryMonsters(dbLibMonsters || []);
                    setWorldNpcs(dbWorldNpcs || []);
                    setWorldMonsters(dbWorldMonsters || []);
                    setLabels(dbLabels || ['Fantasy', 'Sci-Fi', 'Cute', 'Dark', 'Boss']);
                }

            } catch (e) {
                console.error("Failed to initialize app data:", e);
                setStorageError("Failed to load game data.");
            } finally {
                setLoading(false);
            }
        };

        initializeApp();
    }, []);

    // Helper for safe storage (async)
    const saveToDB = async (key: string, data: any) => {
        try {
            await storage.setItem(key, data);
        } catch (e: any) {
            console.error("Storage failed", e);
            setStorageError("⚠️ Storage Error! Failed to save data to IndexedDB.");
        }
    };

    // Persistence Effects - using separate effects to avoid saving everything on one change
    // Note: We add a check for !loading to avoid saving empty initial states over existing data
    useEffect(() => { if(!loading) saveToDB('pixel_rpg_library_npcs', libraryNpcs); }, [libraryNpcs, loading]);
    useEffect(() => { if(!loading) saveToDB('pixel_rpg_library_monsters', libraryMonsters); }, [libraryMonsters, loading]);
    useEffect(() => { if(!loading) saveToDB('pixel_rpg_world_npcs', worldNpcs); }, [worldNpcs, loading]);
    useEffect(() => { if(!loading) saveToDB('pixel_rpg_world_monsters', worldMonsters); }, [worldMonsters, loading]);
    useEffect(() => { if(!loading) saveToDB('pixel_rpg_labels', labels); }, [labels, loading]);

    // Workshop Handlers
    const handleAddToLibrary = (entity: Entity) => {
        if (entity.type === EntityType.NPC) {
            setLibraryNpcs(prev => [...prev, entity]);
        } else {
            setLibraryMonsters(prev => [...prev, entity]);
        }
    };

    const handleAddToWorld = (entity: Entity) => {
        if (entity.type === EntityType.NPC) {
            setWorldNpcs(prev => [...prev, entity]);
        } else {
            setWorldMonsters(prev => [...prev, entity]);
        }
    };

    // Gallery Handlers
    const handleDeleteFromLibrary = (ids: string[]) => {
        setLibraryNpcs(prev => prev.filter(e => !ids.includes(e.id)));
        setLibraryMonsters(prev => prev.filter(e => !ids.includes(e.id)));
        setWorldNpcs(prev => prev.filter(e => !ids.includes(e.id)));
        setWorldMonsters(prev => prev.filter(e => !ids.includes(e.id)));
        setStorageError(null); 
    };

    const handleToggleWorldStatus = (entities: Entity[], shouldAdd: boolean) => {
        entities.forEach(entity => {
            if (shouldAdd) {
                const isNpc = entity.type === EntityType.NPC;
                const list = isNpc ? worldNpcs : worldMonsters;
                if (!list.find(e => e.id === entity.id)) {
                    if (isNpc) setWorldNpcs(prev => [...prev, entity]);
                    else setWorldMonsters(prev => [...prev, entity]);
                }
            } else {
                if (entity.type === EntityType.NPC) {
                    setWorldNpcs(prev => prev.filter(e => e.id !== entity.id));
                } else {
                    setWorldMonsters(prev => prev.filter(e => e.id !== entity.id));
                }
            }
        });
    };

    const handleCreateLabel = (label: string) => {
        if (!labels.includes(label)) {
            setLabels([...labels, label]);
        }
    };

    const handleDeleteLabel = (label: string) => {
        setLabels(labels.filter(l => l !== label));
    };

    // Import/Export
    const handleExportData = () => {
        const data = {
            timestamp: new Date().toISOString(),
            labels,
            libraryNpcs,
            libraryMonsters
        };
        
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `pixel-rpg-library-${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const content = e.target?.result as string;
                const data = JSON.parse(content);
                
                let addedCount = 0;

                // Merge Labels
                if (Array.isArray(data.labels)) {
                    setLabels(prev => Array.from(new Set([...prev, ...data.labels])));
                }

                // Merge Library NPCs
                if (Array.isArray(data.libraryNpcs) || Array.isArray(data.npcs)) {
                    const source = data.libraryNpcs || data.npcs;
                    setLibraryNpcs(prev => {
                        const existingIds = new Set(prev.map(p => p.id));
                        const newItems = source.filter((i: Entity) => !existingIds.has(i.id));
                        addedCount += newItems.length;
                        return [...prev, ...newItems];
                    });
                }

                // Merge Library Monsters
                if (Array.isArray(data.libraryMonsters) || Array.isArray(data.monsters)) {
                    const source = data.libraryMonsters || data.monsters;
                    setLibraryMonsters(prev => {
                        const existingIds = new Set(prev.map(p => p.id));
                        const newItems = source.filter((i: Entity) => !existingIds.has(i.id));
                        addedCount += newItems.length;
                        return [...prev, ...newItems];
                    });
                }

                alert(`Import successful! Merged ${addedCount} new assets to Library.`);
                setStorageError(null);
            } catch (err) {
                console.error(err);
                alert("Failed to parse JSON file.");
            }
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const renderMenu = () => (
        <div className="flex flex-col items-center justify-center h-full space-y-8 p-4 animate-fade-in relative">
            <div className="text-center space-y-2">
                <h1 className="text-4xl md:text-6xl text-yellow-400 text-shadow pixel-font tracking-wider">PIXEL RPG MAKER</h1>
                <p className="text-slate-400 font-mono">Powered by Google Gemini</p>
            </div>

            <div className="flex flex-col gap-4 w-full max-w-md">
                <Button onClick={() => setGameState(GameState.WORKSHOP)} className="text-xl py-4">
                    Asset Workshop
                </Button>
                <Button onClick={() => setGameState(GameState.GALLERY)} className="text-xl py-4" variant="secondary">
                    Asset Gallery
                </Button>
                <Button onClick={() => setGameState(GameState.TOWN)} className="text-xl py-4" variant="success">
                    Start Adventure
                </Button>
            </div>

            <Card title="Hero Status" className="w-full max-w-md">
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                         <span className="text-slate-300">Name:</span>
                         <input 
                            value={player.name} 
                            onChange={(e) => setPlayer({...player, name: e.target.value})}
                            className="bg-slate-900 border-b border-slate-500 text-right w-32 focus:outline-none focus:border-yellow-400"
                         />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <label className="text-sm text-slate-400">
                            ATK ({player.stats.atk})
                            <input 
                                type="range" min="5" max="50" 
                                value={player.stats.atk} 
                                onChange={(e) => setPlayer({...player, stats: {...player.stats, atk: parseInt(e.target.value)}})}
                                className="w-full accent-yellow-500"
                            />
                        </label>
                        <label className="text-sm text-slate-400">
                            DEF ({player.stats.def})
                            <input 
                                type="range" min="0" max="30" 
                                value={player.stats.def} 
                                onChange={(e) => setPlayer({...player, stats: {...player.stats, def: parseInt(e.target.value)}})}
                                className="w-full accent-yellow-500"
                            />
                        </label>
                        <label className="text-sm text-slate-400">
                            Max HP ({player.stats.maxHp})
                            <input 
                                type="range" min="50" max="200" 
                                value={player.stats.maxHp} 
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    setPlayer({...player, stats: {...player.stats, maxHp: val, hp: val}});
                                }}
                                className="w-full accent-red-500"
                            />
                        </label>
                        <label className="text-sm text-slate-400">
                            Max MP ({player.stats.maxMp})
                            <input 
                                type="range" min="0" max="100" 
                                value={player.stats.maxMp} 
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    setPlayer({...player, stats: {...player.stats, maxMp: val, mp: val}});
                                }}
                                className="w-full accent-blue-500"
                            />
                        </label>
                    </div>
                </div>
            </Card>

            <div className="w-full max-w-md border-t border-slate-700 pt-4 mt-2">
                <h3 className="text-slate-500 text-xs mb-2 text-center uppercase tracking-widest">Data Management</h3>
                <div className="flex gap-4 justify-center">
                    <Button onClick={handleExportData} variant="secondary" className="text-xs py-2 flex gap-2 items-center">
                        <span>💾</span> Export JSON
                    </Button>
                    <Button onClick={() => fileInputRef.current?.click()} variant="secondary" className="text-xs py-2 flex gap-2 items-center">
                        <span>📂</span> Import JSON
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
            
            <div className="text-xs text-slate-600 flex flex-col items-center gap-2">
                <span>Library: {libraryNpcs.length} NPCs, {libraryMonsters.length} Monsters</span>
                <span>World: {worldNpcs.length} NPCs, {worldMonsters.length} Monsters</span>
            </div>
        </div>
    );

    if (loading) {
        return (
            <div className="min-h-screen bg-[#1a1a2e] flex flex-col items-center justify-center text-yellow-400 font-mono">
                <div className="text-2xl animate-pulse mb-4">INITIALIZING DATABASE...</div>
                <div className="w-64 h-4 bg-slate-800 border border-slate-600 rounded">
                    <div className="h-full bg-yellow-500 animate-[width_2s_ease-in-out_infinite] w-1/2"></div>
                </div>
            </div>
        );
    }

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
                    entities={[...libraryNpcs, ...libraryMonsters]}
                    worldEntityIds={new Set([...worldNpcs, ...worldMonsters].map(e => e.id))}
                    onDelete={handleDeleteFromLibrary}
                    onToggleWorldStatus={handleToggleWorldStatus}
                    onBack={() => setGameState(GameState.MENU)}
                />
            )}

            {(gameState === GameState.TOWN || gameState === GameState.FOREST || gameState === GameState.BATTLE) && (
                <Game 
                    player={player}
                    updatePlayer={setPlayer}
                    npcs={worldNpcs}
                    monsters={worldMonsters}
                    onExit={() => setGameState(GameState.MENU)}
                />
            )}
        </div>
    );
};

export default App;
