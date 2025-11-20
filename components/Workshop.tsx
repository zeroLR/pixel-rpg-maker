
import React, { useState, useRef } from 'react';
import { Button, Card, StatBar } from './UI';
import { Entity, EntityType } from '../types';
import { generatePixelAsset } from '../services/geminiService';

interface WorkshopProps {
    onAddToLibrary: (entity: Entity) => void;
    onAddToWorld: (entity: Entity) => void;
    onBack: () => void;
    availableLabels: string[];
    onCreateLabel: (label: string) => void;
    onDeleteLabel: (label: string) => void;
}

export const Workshop: React.FC<WorkshopProps> = ({ 
    onAddToLibrary, 
    onAddToWorld, 
    onBack, 
    availableLabels, 
    onCreateLabel, 
    onDeleteLabel 
}) => {
    const [prompt, setPrompt] = useState('');
    const [loading, setLoading] = useState(false);
    const [generatedEntity, setGeneratedEntity] = useState<Entity | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [type, setType] = useState<EntityType>(EntityType.ENEMY);
    const [selectedLabels, setSelectedLabels] = useState<Set<string>>(new Set());
    const [newLabelInput, setNewLabelInput] = useState('');
    const [message, setMessage] = useState<string | null>(null);
    
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    const handleGenerate = async () => {
        if (!prompt.trim()) return;
        setLoading(true);
        setError(null);
        setGeneratedEntity(null);
        setMessage(null);

        try {
            const entity = await generatePixelAsset(prompt, type, Array.from(selectedLabels));
            setGeneratedEntity(entity);
        } catch (err) {
            console.error(err);
            setError("Failed to generate asset. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const handleRegenerate = () => {
        handleGenerate();
    };

    const toggleLabel = (label: string) => {
        const next = new Set(selectedLabels);
        if (next.has(label)) {
            next.delete(label);
        } else {
            next.add(label);
        }
        setSelectedLabels(next);
    };

    const addLabel = () => {
        if (newLabelInput.trim()) {
            onCreateLabel(newLabelInput.trim());
            setSelectedLabels(prev => new Set(prev).add(newLabelInput.trim()));
            setNewLabelInput('');
        }
    };

    const handleAddToWorld = () => {
        if (generatedEntity) {
            onAddToWorld(generatedEntity);
            setMessage("Added to Game World! (Temporary)");
            scrollToTop();
        }
    };

    const handleSaveToGallery = () => {
        if (generatedEntity) {
            onAddToLibrary(generatedEntity);
            setMessage("Saved to Gallery!");
            scrollToTop();
        }
    };

    const scrollToTop = () => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    return (
        <div ref={scrollContainerRef} className="max-w-4xl mx-auto p-4 h-full flex flex-col overflow-y-auto scroll-smooth">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl md:text-3xl text-yellow-400 pixel-font">Asset Workshop</h2>
                <Button onClick={onBack} variant="secondary">Back to Menu</Button>
            </div>

            {message && (
                <div className="mb-6 p-4 bg-green-900/50 border-2 border-green-500 text-green-200 text-center animate-fade-in rounded">
                    {message}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-10">
                {/* Controls */}
                <Card title="Design Your Entity">
                    <div className="flex flex-col gap-4">
                        <div>
                            <label className="block text-sm mb-2 text-slate-300">Entity Type</label>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => setType(EntityType.ENEMY)}
                                    className={`flex-1 p-2 border-2 text-center text-xs md:text-sm transition-colors ${type === EntityType.ENEMY ? 'border-red-500 bg-red-500/20 text-red-300' : 'border-slate-600 text-slate-500'}`}
                                >
                                    ENEMY
                                </button>
                                <button 
                                    onClick={() => setType(EntityType.NPC)}
                                    className={`flex-1 p-2 border-2 text-center text-xs md:text-sm transition-colors ${type === EntityType.NPC ? 'border-blue-500 bg-blue-500/20 text-blue-300' : 'border-slate-600 text-slate-500'}`}
                                >
                                    NPC
                                </button>
                                <button 
                                    onClick={() => setType(EntityType.HERO)}
                                    className={`flex-1 p-2 border-2 text-center text-xs md:text-sm transition-colors ${type === EntityType.HERO ? 'border-yellow-500 bg-yellow-500/20 text-yellow-300' : 'border-slate-600 text-slate-500'}`}
                                >
                                    HERO
                                </button>
                            </div>
                        </div>

                        {/* Labels Section */}
                        <div>
                            <label className="block text-sm mb-2 text-slate-300">Labels (Tags)</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                {availableLabels.map(label => (
                                    <div 
                                        key={label} 
                                        onClick={() => toggleLabel(label)}
                                        className={`
                                            px-2 py-1 text-xs border cursor-pointer select-none flex items-center gap-1 transition-colors
                                            ${selectedLabels.has(label) ? 'bg-yellow-500/20 border-yellow-500 text-yellow-200' : 'bg-slate-700 border-slate-600 text-slate-400 hover:border-slate-400'}
                                        `}
                                    >
                                        {label}
                                        <span 
                                            onClick={(e) => { e.stopPropagation(); onDeleteLabel(label); }}
                                            className="ml-1 hover:text-red-400 font-bold px-1"
                                            title="Delete Label"
                                        >
                                            ×
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input 
                                    value={newLabelInput}
                                    onChange={(e) => setNewLabelInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addLabel()}
                                    placeholder="New Label"
                                    className="flex-1 bg-slate-900 border border-slate-600 px-2 py-1 text-sm focus:outline-none focus:border-yellow-500"
                                />
                                <Button onClick={addLabel} variant="secondary" className="py-1 text-xs">Add</Button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm mb-2 text-slate-300">Description Prompt</label>
                            <textarea 
                                className="w-full bg-slate-900 border-2 border-slate-700 p-3 text-white focus:border-yellow-500 focus:outline-none h-32 resize-none"
                                placeholder={`e.g., "A fiery dragon", "A cyberpunk merchant", or "A legendary knight in golden armor"`}
                                value={prompt}
                                onChange={(e) => setPrompt(e.target.value)}
                            />
                        </div>

                        <Button 
                            onClick={handleGenerate} 
                            disabled={loading || !prompt.trim()}
                            className="w-full"
                        >
                            {loading ? 'Generating...' : 'Generate Asset'}
                        </Button>
                        {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                    </div>
                </Card>

                {/* Preview */}
                <Card title="Preview" className="flex flex-col items-center justify-center min-h-[400px]">
                    {loading ? (
                        <div className="text-center animate-pulse">
                            <div className="w-32 h-32 bg-slate-700 rounded-full mx-auto mb-4"></div>
                            <p className="text-yellow-400">Forging sprites in the ether...</p>
                            <p className="text-xs text-slate-500 mt-2">This uses Gemini models and may take a few seconds.</p>
                        </div>
                    ) : generatedEntity ? (
                        <div className="w-full flex flex-col items-center animate-fade-in">
                            <div className="relative group">
                                <img 
                                    src={`data:image/png;base64,${generatedEntity.imageBase64}`} 
                                    alt={generatedEntity.name} 
                                    className="w-48 h-48 object-contain pixelated mb-4 bg-slate-900/50 rounded-lg border-2 border-slate-700"
                                    style={{ imageRendering: 'pixelated' }}
                                />
                                <div className="absolute -top-2 -right-2 bg-yellow-500 text-black text-xs px-2 py-1 font-bold rounded border-2 border-white">
                                    NEW
                                </div>
                            </div>
                            
                            <h3 className="text-2xl font-bold text-white mb-1">{generatedEntity.name}</h3>
                            <p className="text-slate-400 text-sm text-center italic mb-2 px-4">{generatedEntity.description}</p>
                            
                             <div className="text-xs text-slate-500 mb-2 bg-slate-800 px-2 py-1 rounded border border-slate-700">
                                Type: <span className="text-yellow-400 font-bold">{generatedEntity.type}</span>
                            </div>

                            {/* Tags display */}
                            {generatedEntity.tags && generatedEntity.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 justify-center mb-4">
                                    {generatedEntity.tags.map(tag => (
                                        <span key={tag} className="text-[10px] bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full border border-slate-600">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <div className="w-full bg-slate-900/50 p-4 rounded border-2 border-slate-700 mb-4">
                                <StatBar label="HP" current={generatedEntity.stats.maxHp} max={200} color="bg-red-500" />
                                <StatBar label="MP" current={generatedEntity.stats.maxMp} max={100} color="bg-blue-500" />
                                <div className="flex justify-between text-sm mt-2 px-2">
                                    <span className="text-orange-400">ATK: {generatedEntity.stats.atk}</span>
                                    <span className="text-green-400">DEF: {generatedEntity.stats.def}</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2 w-full">
                                {generatedEntity.type !== EntityType.HERO && (
                                    <Button onClick={handleAddToWorld} variant="success" className="w-full">
                                        Add to World (Play)
                                    </Button>
                                )}
                                <div className="flex gap-2">
                                    <Button onClick={handleSaveToGallery} variant="primary" className="flex-1">
                                        Save to Gallery
                                    </Button>
                                    <Button onClick={handleRegenerate} variant="secondary" className="flex-1">
                                        Re-generate
                                    </Button>
                                </div>
                                {generatedEntity.type === EntityType.HERO && (
                                    <p className="text-xs text-center text-yellow-500 mt-2">Save this Hero to the Gallery to use them in a new adventure!</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="text-slate-600 text-center">
                            <p>No asset generated yet.</p>
                            <p className="text-sm mt-2">Enter a prompt, select tags, and click Generate.</p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};
