
import React, { useState, useMemo } from 'react';
import { Entity, EntityType } from '../types';
import { Button } from './UI';

interface GalleryProps {
    entities: Entity[];
    worldEntityIds: Set<string>;
    onDelete: (ids: string[]) => void;
    onToggleWorldStatus: (entities: Entity[], shouldAdd: boolean) => void;
    onBack: () => void;
    // New props for Selection Mode
    onSelect?: (entity: Entity) => void;
    selectionMode?: boolean;
}

export const Gallery: React.FC<GalleryProps> = ({ 
    entities, 
    worldEntityIds, 
    onDelete, 
    onToggleWorldStatus, 
    onBack,
    onSelect,
    selectionMode = false
}) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [filter, setFilter] = useState<'ALL' | EntityType>(selectionMode ? EntityType.HERO : 'ALL');
    const [tagFilter, setTagFilter] = useState<string | null>(null);
    const [modalData, setModalData] = useState<{open: boolean, prompt: string, name: string, tags?: string[]} | null>(null);

    // Extract all unique tags from current entities
    const allTags = useMemo(() => {
        const tags = new Set<string>();
        entities.forEach(e => {
            if (e.tags) e.tags.forEach(t => tags.add(t));
        });
        return Array.from(tags).sort();
    }, [entities]);

    const toggleSelection = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedIds(next);
    };

    const handleDelete = () => {
        if (selectedIds.size === 0) return;
        if (window.confirm(`Delete ${selectedIds.size} assets? This cannot be undone.`)) {
            onDelete(Array.from(selectedIds));
            setSelectedIds(new Set());
        }
    };

    const handleAddToWorld = () => {
        const selectedEntities = entities.filter(e => selectedIds.has(e.id));
        onToggleWorldStatus(selectedEntities, true);
        setSelectedIds(new Set()); // Clear selection after action
    };

    const handleRemoveFromWorld = () => {
        const selectedEntities = entities.filter(e => selectedIds.has(e.id));
        onToggleWorldStatus(selectedEntities, false);
        setSelectedIds(new Set());
    };

    const filteredEntities = entities.filter(e => {
        const typeMatch = filter === 'ALL' || e.type === filter;
        const tagMatch = tagFilter === null || (e.tags && e.tags.includes(tagFilter));
        return typeMatch && tagMatch;
    });

    return (
        <div className="max-w-6xl mx-auto p-4 h-full flex flex-col animate-fade-in relative">
            {modalData && modalData.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setModalData(null)}>
                    <div className="bg-slate-800 border-4 border-slate-600 p-6 max-w-lg w-full shadow-2xl relative" onClick={e => e.stopPropagation()}>
                        <button 
                            onClick={() => setModalData(null)}
                            className="absolute top-2 right-2 text-slate-400 hover:text-white font-bold"
                        >
                            ✕
                        </button>
                        <h3 className="text-yellow-400 text-xl mb-4 pixel-font border-b border-slate-700 pb-2">
                            Creation Data: {modalData.name}
                        </h3>
                        
                        {modalData.tags && modalData.tags.length > 0 && (
                            <div className="mb-4">
                                <h4 className="text-slate-300 text-sm uppercase font-bold mb-1">Tags:</h4>
                                <div className="flex flex-wrap gap-2">
                                    {modalData.tags.map(tag => (
                                        <span key={tag} className="text-xs bg-slate-700 text-yellow-200 px-2 py-1 rounded border border-slate-600">
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div>
                            <h4 className="text-slate-300 text-sm uppercase font-bold mb-1">Original User Input:</h4>
                            <div className="bg-slate-900 p-4 rounded border border-slate-700 text-white font-mono text-sm italic">
                                "{modalData.prompt}"
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <Button onClick={() => setModalData(null)} variant="primary">Close</Button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                <h2 className="text-2xl md:text-3xl text-yellow-400 pixel-font">
                    {selectionMode ? "Select Your Hero" : "Asset Gallery"}
                </h2>
                <div className="flex flex-wrap gap-2 justify-end">
                    {!selectionMode && selectedIds.size > 0 && (
                        <>
                             <Button onClick={handleAddToWorld} variant="success" className="text-xs">
                                + World ({selectedIds.size})
                             </Button>
                             <Button onClick={handleRemoveFromWorld} variant="secondary" className="text-xs">
                                - World ({selectedIds.size})
                             </Button>
                             <Button onClick={handleDelete} variant="danger" className="text-xs">
                                Delete ({selectedIds.size})
                             </Button>
                        </>
                    )}
                    <Button onClick={onBack} variant="secondary">
                        {selectionMode ? "Cancel" : "Back to Menu"}
                    </Button>
                </div>
            </div>

            {/* Type Filter Tabs */}
            <div className="flex flex-wrap gap-4 mb-4 border-b-2 border-slate-700 pb-2 items-center justify-between">
                <div className="flex gap-2">
                    {!selectionMode && (
                        <>
                            <button 
                                onClick={() => setFilter('ALL')}
                                className={`px-4 py-1 font-bold transition-colors ${filter === 'ALL' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                ALL
                            </button>
                            <button 
                                onClick={() => setFilter(EntityType.NPC)}
                                className={`px-4 py-1 font-bold transition-colors ${filter === EntityType.NPC ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                NPCs
                            </button>
                            <button 
                                onClick={() => setFilter(EntityType.ENEMY)}
                                className={`px-4 py-1 font-bold transition-colors ${filter === EntityType.ENEMY ? 'text-red-400 border-b-2 border-red-400' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                ENEMIES
                            </button>
                        </>
                    )}
                    <button 
                        onClick={() => setFilter(EntityType.HERO)}
                        className={`px-4 py-1 font-bold transition-colors ${filter === EntityType.HERO ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        HEROES
                    </button>
                </div>
            </div>

            {/* Tag Filter Cloud */}
            {allTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6 p-2 bg-slate-900/50 rounded border border-slate-700">
                    <span className="text-xs text-slate-500 flex items-center uppercase font-bold mr-2">Filter by Tags:</span>
                    <button
                         onClick={() => setTagFilter(null)}
                         className={`px-2 py-0.5 text-xs rounded border transition-colors ${tagFilter === null ? 'bg-slate-200 text-slate-900 border-slate-200' : 'bg-slate-800 text-slate-400 border-slate-600 hover:border-slate-400'}`}
                    >
                        All
                    </button>
                    {allTags.map(tag => (
                        <button
                            key={tag}
                            onClick={() => setTagFilter(tag === tagFilter ? null : tag)}
                            className={`px-2 py-0.5 text-xs rounded border transition-colors ${tagFilter === tag ? 'bg-yellow-500 text-black border-yellow-500' : 'bg-slate-800 text-slate-400 border-slate-600 hover:border-slate-400'}`}
                        >
                            {tag}
                        </button>
                    ))}
                </div>
            )}

            <div className="flex-1 overflow-y-auto pr-2">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 pb-20">
                    {filteredEntities.map(entity => {
                        const isSelected = selectedIds.has(entity.id);
                        const isInWorld = worldEntityIds.has(entity.id);
                        
                        return (
                            <div 
                                key={entity.id}
                                onClick={() => {
                                    if (selectionMode && onSelect) {
                                        onSelect(entity);
                                    } else {
                                        toggleSelection(entity.id);
                                    }
                                }}
                                className={`
                                    relative cursor-pointer group select-none
                                    bg-slate-800 border-4 p-2 transition-all overflow-hidden
                                    ${isSelected ? 'border-yellow-400 bg-slate-700 transform scale-95' : 'border-slate-600 hover:border-slate-500 hover:-translate-y-1'}
                                    ${selectionMode ? 'hover:border-yellow-500 hover:shadow-[0_0_15px_rgba(234,179,8,0.5)]' : ''}
                                `}
                            >
                                {/* Hover Overlay Info - Enhanced with Backdrop Blur and Clear Stats */}
                                <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-sm p-3 flex flex-col justify-center items-center text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-30">
                                    <div className="flex items-center justify-between w-full border-b border-slate-700 pb-1 mb-1 gap-2">
                                        <h5 className="text-yellow-400 text-sm font-bold pixel-font truncate flex-1 text-left" title={entity.name}>{entity.name}</h5>
                                        {entity.originalPrompt && (
                                            <button 
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    setModalData({ 
                                                        open: true, 
                                                        prompt: entity.originalPrompt!, 
                                                        name: entity.name,
                                                        tags: entity.tags 
                                                    });
                                                }}
                                                className="text-xs bg-slate-700 hover:bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center transition-colors border border-slate-500"
                                                title="View Prompt & Tags"
                                            >
                                                ?
                                            </button>
                                        )}
                                    </div>
                                    
                                    <div className="flex-1 flex items-center">
                                        <p className="text-[10px] text-slate-300 line-clamp-3 italic leading-tight">"{entity.description}"</p>
                                    </div>
                                    
                                    <div className="w-full bg-slate-900/50 p-1 rounded text-xs border border-slate-700 grid grid-cols-2 gap-px">
                                         <div className="bg-slate-800 p-1 flex justify-between items-center"><span className="text-red-400 font-bold text-[10px]">HP</span> <span className="text-white">{entity.stats.maxHp}</span></div>
                                         <div className="bg-slate-800 p-1 flex justify-between items-center"><span className="text-blue-400 font-bold text-[10px]">MP</span> <span className="text-white">{entity.stats.maxMp}</span></div>
                                         <div className="bg-slate-800 p-1 flex justify-between items-center"><span className="text-orange-400 font-bold text-[10px]">ATK</span> <span className="text-white">{entity.stats.atk}</span></div>
                                         <div className="bg-slate-800 p-1 flex justify-between items-center"><span className="text-green-400 font-bold text-[10px]">DEF</span> <span className="text-white">{entity.stats.def}</span></div>
                                    </div>
                                    
                                    {entity.tags && entity.tags.length > 0 && (
                                         <div className="mt-2 flex flex-wrap justify-center gap-1 w-full overflow-hidden h-4">
                                             {entity.tags.slice(0, 2).map(t => <span key={t} className="text-[8px] bg-slate-700 px-1 rounded text-slate-400 uppercase">{t}</span>)}
                                         </div>
                                    )}
                                </div>

                                {isSelected && !selectionMode && (
                                    <div className="absolute top-2 right-2 z-20 bg-yellow-400 text-black w-6 h-6 flex items-center justify-center font-bold border-2 border-black shadow-md">
                                        ✓
                                    </div>
                                )}

                                {!selectionMode && isInWorld && (
                                    <div className="absolute top-2 left-2 z-20 bg-blue-500 text-white w-6 h-6 flex items-center justify-center font-bold border-2 border-white shadow-md rounded-full text-xs" title="In Game World">
                                        🌍
                                    </div>
                                )}
                                
                                <div className="aspect-square bg-slate-900 mb-2 flex items-center justify-center overflow-hidden rounded-sm relative">
                                    <img 
                                        src={`data:image/png;base64,${entity.imageBase64}`} 
                                        alt={entity.name}
                                        className={`object-contain h-full w-full pixelated transition-opacity ${isSelected ? 'opacity-80' : ''}`}
                                        style={{ imageRendering: 'pixelated' }}
                                    />
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-1">
                                        <div className={`text-[10px] font-bold text-center tracking-wider 
                                            ${entity.type === EntityType.NPC ? 'text-blue-300' : 
                                              entity.type === EntityType.ENEMY ? 'text-red-300' : 'text-yellow-300'}`}>
                                            {entity.type}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="text-center">
                                    <h4 className="text-white font-bold text-sm truncate px-1" title={entity.name}>{entity.name}</h4>
                                    <div className="flex justify-center gap-2 text-[10px] text-slate-400 mt-1 font-mono">
                                        <span className="text-red-300">HP {entity.stats.maxHp}</span>
                                        <span className="text-orange-300">ATK {entity.stats.atk}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    
                    {filteredEntities.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-500 border-2 border-dashed border-slate-700 rounded-lg">
                            <p className="mb-4">No assets found matching filters.</p>
                            {selectionMode && <p className="text-yellow-500 mb-4">Go to Workshop to generate a HERO!</p>}
                            <Button onClick={() => { setFilter(selectionMode ? EntityType.HERO : 'ALL'); setTagFilter(null); }} variant="secondary">Clear Filters</Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
