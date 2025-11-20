
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Entity, Player, ChatMessage } from '../types';
import { Button, Card, StatBar } from './UI';
import { generateChatResponse } from '../services/geminiService';

interface GameProps {
    player: Player;
    updatePlayer: (p: Player) => void;
    npcs: Entity[];
    enemies: Entity[];
    onExit: () => void;
    onSave: (slot: number) => void;
}

export const Game: React.FC<GameProps> = ({ player, updatePlayer, npcs, enemies, onExit, onSave }) => {
    const [location, setLocation] = useState<'TOWN' | 'FOREST' | null>(null);
    const [currentEntity, setCurrentEntity] = useState<Entity | null>(null);
    const [logs, setLogs] = useState<string[]>(["Welcome to the world of Pixel RPG."]);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatting, setIsChatting] = useState(false);
    const [isBattling, setIsBattling] = useState(false);
    const [showSaveMenu, setShowSaveMenu] = useState(false);
    const [backgroundUrl, setBackgroundUrl] = useState('');
    
    // Battle specific state
    const [battleTurn, setBattleTurn] = useState<'PLAYER' | 'ENEMY'>('PLAYER');
    const [enemyHp, setEnemyHp] = useState(0);
    const [waiting, setWaiting] = useState(false);

    const logsEndRef = useRef<HTMLDivElement>(null);

    // Scroll logs
    useEffect(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [logs, chatHistory]);

    const addLog = (msg: string) => {
        setLogs(prev => [...prev, msg]);
    };

    // -- Navigation --
    const handleTravel = (dest: 'TOWN' | 'FOREST') => {
        setLocation(dest);
        setCurrentEntity(null);
        setIsChatting(false);
        setIsBattling(false);
        addLog(`You traveled to the ${dest.toLowerCase()}.`);

        // Generate Random Pixel Art Background
        const styles = ['fantasy', 'dark fantasy', 'mystical', 'retro', 'vibrant', 'ruined', 'ethereal', 'cyberpunk'];
        const randomStyle = styles[Math.floor(Math.random() * styles.length)];
        const basePrompt = dest === 'TOWN' 
            ? `pixel art rpg town village street background ${randomStyle} style` 
            : `pixel art rpg forest woods nature background ${randomStyle} style`;
        
        // Add a random seed to ensure the image URL is unique and triggers a reload if needed, or just for variety
        const seed = Math.floor(Math.random() * 10000);
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(basePrompt)}?width=1024&height=768&seed=${seed}&nologo=true`;
        setBackgroundUrl(url);
        
        // Auto-encounter logic
        setTimeout(() => {
            if (dest === 'TOWN') {
                if (npcs.length > 0) {
                    const npc = npcs[Math.floor(Math.random() * npcs.length)];
                    setCurrentEntity(npc);
                    addLog(`You see ${npc.name} standing nearby.`);
                } else {
                    addLog("The town is empty. Go to Workshop to create NPCs!");
                }
            } else {
                if (enemies.length > 0) {
                    const enemy = enemies[Math.floor(Math.random() * enemies.length)];
                    setCurrentEntity(enemy);
                    setEnemyHp(enemy.stats.maxHp);
                    addLog(`A wild ${enemy.name} appeared!`);
                    setIsBattling(true);
                    setBattleTurn('PLAYER');
                } else {
                    addLog("The forest is silent. Go to Workshop to create Enemies!");
                }
            }
        }, 800);
    };

    const handleReturnToBase = () => {
        setLocation(null);
        setCurrentEntity(null);
        setIsBattling(false);
        setIsChatting(false);
        setShowSaveMenu(false);
        setBackgroundUrl(''); // Reset background when returning to map
    };

    // -- Battle Logic --
    const handleAttack = () => {
        if (!currentEntity || !isBattling || battleTurn !== 'PLAYER') return;

        const dmg = Math.max(1, player.stats.atk - currentEntity.stats.def + Math.floor(Math.random() * 5));
        setEnemyHp(prev => Math.max(0, prev - dmg));
        addLog(`You attacked ${currentEntity.name} for ${dmg} damage!`);
        setBattleTurn('ENEMY');

        if (enemyHp - dmg <= 0) {
            setTimeout(() => {
                addLog(`You defeated ${currentEntity?.name || 'the enemy'}!`);
                setIsBattling(false);
                setCurrentEntity(null);
                // Small heal reward
                updatePlayer({
                    ...player,
                    stats: { ...player.stats, hp: Math.min(player.stats.maxHp, player.stats.hp + 10) }
                });
                addLog("Recovered 10 HP.");
            }, 1000);
        } else {
            setWaiting(true);
            setTimeout(enemyTurn, 1500);
        }
    };

    const enemyTurn = useCallback(() => {
        // Guard against component unmount or state shift where entity is gone
        if (!currentEntity) return; 

        const dmg = Math.max(1, currentEntity.stats.atk - player.stats.def + Math.floor(Math.random() * 3));
        
        updatePlayer({
            ...player,
            stats: { ...player.stats, hp: Math.max(0, player.stats.hp - dmg) }
        });
        addLog(`${currentEntity.name} attacks! You take ${dmg} damage.`);
        setBattleTurn('PLAYER');
        setWaiting(false);

        if (player.stats.hp - dmg <= 0) {
            addLog("You were defeated! Retreating to safety...");
            setTimeout(() => {
                handleReturnToBase();
                // Revive
                updatePlayer({
                    ...player,
                    stats: { ...player.stats, hp: Math.floor(player.stats.maxHp / 2) }
                });
            }, 2000);
        }
    }, [currentEntity, player, updatePlayer]);

    const handleHeal = () => {
        if (player.stats.mp >= 10) {
            const healAmount = 30;
            updatePlayer({
                ...player,
                stats: { 
                    ...player.stats, 
                    hp: Math.min(player.stats.maxHp, player.stats.hp + healAmount),
                    mp: player.stats.mp - 10
                }
            });
            addLog(`You cast Heal. +${healAmount} HP. -10 MP.`);
            if (isBattling) {
                setBattleTurn('ENEMY');
                setWaiting(true);
                setTimeout(enemyTurn, 1500);
            }
        } else {
            addLog("Not enough MP!");
        }
    };

    // -- Dialogue Logic --
    const startChat = () => {
        setIsChatting(true);
        setChatHistory([]);
        addLog(`You started talking to ${currentEntity?.name}.`);
    };

    const sendChat = async () => {
        if (!chatInput.trim() || !currentEntity) return;
        
        const userMsg = { sender: 'Hero', text: chatInput };
        setChatHistory(prev => [...prev, userMsg]);
        setChatInput('');
        setWaiting(true);

        try {
            const responseText = await generateChatResponse(currentEntity, chatHistory, userMsg.text);
            setChatHistory(prev => [...prev, { sender: currentEntity.name, text: responseText }]);
        } catch (err) {
            addLog("...silence...");
        } finally {
            setWaiting(false);
        }
    };

    // -- Town Heal --
    const townRest = () => {
        updatePlayer({
            ...player,
            stats: { ...player.stats, hp: player.stats.maxHp, mp: player.stats.maxMp }
        });
        addLog("You rested at the inn. HP/MP fully restored.");
    };

    // Renders
    if (!location) {
        // Map Selection
        return (
            <div className="h-full flex flex-col items-center justify-center p-4 gap-6 animate-fade-in">
                <div className="flex gap-4 items-center mb-4">
                     {player.imageBase64 && (
                        <img src={`data:image/png;base64,${player.imageBase64}`} className="w-16 h-16 pixelated border-2 border-yellow-500 bg-slate-900 rounded-full" alt="Hero" style={{imageRendering: 'pixelated'}} />
                     )}
                     <div>
                         <h2 className="text-3xl text-white pixel-font">Select Destination</h2>
                         <p className="text-slate-400 text-sm">Hero: {player.name}</p>
                     </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
                    <button 
                        onClick={() => handleTravel('TOWN')}
                        className="group relative h-48 bg-slate-800 border-4 border-blue-600 hover:border-blue-400 transition-all p-4 flex flex-col items-center justify-center overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-blue-900/20 group-hover:bg-blue-900/40 transition-all"></div>
                        <span className="text-4xl mb-2">🏰</span>
                        <h3 className="text-2xl text-blue-300 pixel-font z-10">Town</h3>
                        <p className="text-slate-400 z-10">Meet NPCs, Rest, Trade</p>
                    </button>

                    <button 
                        onClick={() => handleTravel('FOREST')}
                        className="group relative h-48 bg-slate-800 border-4 border-green-600 hover:border-green-400 transition-all p-4 flex flex-col items-center justify-center overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-green-900/20 group-hover:bg-green-900/40 transition-all"></div>
                        <span className="text-4xl mb-2">🌲</span>
                        <h3 className="text-2xl text-green-300 pixel-font z-10">Forest</h3>
                        <p className="text-slate-400 z-10">Battle Enemies, Gain Glory</p>
                    </button>
                </div>
                
                <div className="flex gap-4 mt-8">
                    <Button onClick={() => setShowSaveMenu(!showSaveMenu)} variant="primary">
                        {showSaveMenu ? 'Close Save Menu' : 'Save Game'}
                    </Button>
                    <Button onClick={onExit} variant="secondary">Main Menu</Button>
                </div>

                {showSaveMenu && (
                    <div className="bg-slate-900 border-2 border-slate-600 p-4 rounded-lg w-full max-w-md animate-slide-up">
                        <h3 className="text-yellow-400 mb-4 text-center pixel-font">Select Save Slot</h3>
                        <div className="grid grid-cols-3 gap-2">
                            {[1, 2, 3].map(slot => (
                                <Button key={slot} onClick={() => { onSave(slot); addLog(`Game Saved to Slot ${slot}`); }} variant="success" className="text-xs">
                                    Slot {slot}
                                </Button>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col md:flex-row gap-4 p-2 md:p-4">
            {/* Left Panel: Scene */}
            <div className="flex-1 flex flex-col gap-4">
                <Card className="flex-1 flex flex-col relative overflow-hidden min-h-[300px]">
                    {/* Background indication */}
                    <div 
                        className="absolute inset-0 opacity-30 pointer-events-none bg-cover bg-center transition-all duration-1000"
                        style={{ backgroundImage: `url("${backgroundUrl}")` }}
                    />
                    
                    {/* HUD */}
                    <div className="relative z-10 bg-slate-900/80 p-2 border-b-2 border-slate-700 flex justify-between items-center gap-4">
                         {player.imageBase64 && (
                             <img src={`data:image/png;base64,${player.imageBase64}`} className="w-12 h-12 pixelated border border-slate-500 bg-black" alt="Hero" style={{imageRendering: 'pixelated'}} />
                         )}
                        <div className="flex flex-col flex-1">
                            <div className="flex justify-between text-xs text-slate-400 mb-1">
                                <span>{player.name}</span>
                                <span>ATK: {player.stats.atk} | DEF: {player.stats.def}</span>
                            </div>
                            <StatBar label="HP" current={player.stats.hp} max={player.stats.maxHp} color="bg-red-500" />
                            <StatBar label="MP" current={player.stats.mp} max={player.stats.maxMp} color="bg-blue-500" />
                        </div>
                        <span className="pixel-font text-yellow-400 text-lg ml-4">{location}</span>
                    </div>

                    {/* Main Viewport */}
                    <div className="flex-1 flex items-center justify-center relative z-0">
                        {currentEntity ? (
                            <div className="flex flex-col items-center animate-bounce-slight">
                                <img 
                                    src={`data:image/png;base64,${currentEntity.imageBase64}`} 
                                    alt={currentEntity.name}
                                    className="w-64 h-64 object-contain pixelated drop-shadow-[0_10px_10px_rgba(0,0,0,0.8)]" 
                                    style={{ imageRendering: 'pixelated' }}
                                />
                                <div className="bg-slate-900/80 px-4 py-1 rounded mt-2 border border-slate-600">
                                    <h3 className="text-xl font-bold text-white">{currentEntity.name}</h3>
                                    {isBattling && (
                                        <div className="w-32 h-2 bg-red-900 mt-1">
                                            <div className="h-full bg-red-500 transition-all" style={{width: `${(enemyHp/currentEntity.stats.maxHp)*100}%`}}></div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="text-slate-500 italic bg-slate-900/50 p-2 rounded">No one is here...</div>
                        )}
                    </div>
                </Card>

                {/* Action Menu */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 h-20">
                    {isBattling ? (
                        <>
                            <Button onClick={handleAttack} disabled={waiting} variant="danger">Attack</Button>
                            <Button onClick={handleHeal} disabled={waiting} variant="success">Heal (10MP)</Button>
                            <Button onClick={handleReturnToBase} variant="secondary">Run</Button>
                            <div className="flex items-center justify-center text-xs text-slate-400">Turn: {battleTurn}</div>
                        </>
                    ) : isChatting ? (
                         <Button onClick={() => setIsChatting(false)} variant="secondary" className="col-span-4">End Chat</Button>
                    ) : (
                        <>
                            {location === 'TOWN' && currentEntity && <Button onClick={startChat} variant="primary">Talk</Button>}
                            {location === 'TOWN' && <Button onClick={townRest} variant="success">Rest (Inn)</Button>}
                            <Button onClick={() => handleTravel(location === 'TOWN' ? 'FOREST' : 'TOWN')} variant="secondary">Travel</Button>
                            <Button onClick={handleReturnToBase} variant="secondary">Map</Button>
                        </>
                    )}
                </div>
            </div>

            {/* Right Panel: Logs/Chat */}
            <div className="w-full md:w-1/3 flex flex-col gap-4 h-[40vh] md:h-[600px]">
                <Card title={isChatting ? `Chat: ${currentEntity?.name}` : "Adventure Log"} className="flex-1 flex flex-col overflow-hidden min-h-0">
                    <div className="flex-1 overflow-y-auto space-y-2 p-2 bg-slate-900/50 font-mono text-sm border-2 border-slate-700 inner-shadow">
                        {isChatting ? (
                            chatHistory.map((msg, idx) => (
                                <div key={idx} className={`p-2 rounded ${msg.sender === 'Hero' ? 'bg-blue-900/30 ml-4' : 'bg-slate-800 mr-4'}`}>
                                    <span className="font-bold text-xs text-slate-400 block">{msg.sender}</span>
                                    {msg.text}
                                </div>
                            ))
                        ) : (
                            logs.map((log, idx) => (
                                <div key={idx} className="border-b border-slate-800 pb-1 last:border-0 text-slate-300">
                                    <span className="text-yellow-600 mr-2">{'>'}</span>{log}
                                </div>
                            ))
                        )}
                        <div ref={logsEndRef} />
                    </div>

                    {isChatting && (
                        <div className="mt-2 flex gap-2">
                            <input 
                                type="text" 
                                value={chatInput} 
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && sendChat()}
                                className="flex-1 bg-slate-900 border border-slate-600 px-2 py-1 text-white text-sm focus:outline-none focus:border-yellow-400"
                                placeholder="Say something..."
                                disabled={waiting}
                            />
                            <Button onClick={sendChat} disabled={waiting || !chatInput} className="py-1 text-xs">Send</Button>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};
