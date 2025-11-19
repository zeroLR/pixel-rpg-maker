
import React, { useState, useMemo } from 'react';
import { Entity, EntityType } from '../types';
import { Button } from './UI';

interface GalleryProps {
    entities: Entity[];
    worldEntityIds: Set<string>;
    onDelete: (ids: string[]) => void;
    onToggleWorldStatus: (entities: Entity[], shouldAdd: boolean) => void;
    onBack: () => void;
}

export const Gallery: React.FC<GalleryProps> = ({ entities, worldEntityIds, onDelete, onToggleWorldStatus, onBack }) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [filter, setFilter] = useState<'ALL' | EntityType>('ALL');
    const [tagFilter, setTagFilter] = useState<string | null>(null);

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
        <div className="max-w-6xl mx-auto p-4 h-full flex flex-col animate-fade-in">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                <h2 className="text-2xl md:text-3xl text-yellow-400 pixel-font">Asset Gallery</h2>
                <div className="flex flex-wrap gap-2 justify-end">
                    {selectedIds.size > 0 && (
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
                    <Button onClick={onBack} variant="secondary">Back to Menu</Button>
                </div>
            </div>

            {/* Type Filter Tabs */}
            <div className="flex flex-wrap gap-4 mb-4 border-b-2 border-slate-700 pb-2 items-center justify-between">
                <div className="flex gap-2">
                    <button 
                        onClick={() => setFilter('ALL')}
                        className={`px-4 py-1 font-bold transition-colors ${filter === 'ALL' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        ALL ({entities.length})
                    </button>
                    <button 
                        onClick={() => setFilter(EntityType.NPC)}
                        className={`px-4 py-1 font-bold transition-colors ${filter === EntityType.NPC ? 'text-blue-400 border-b-2 border-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        NPCs ({entities.filter(e => e.type === EntityType.NPC).length})
                    </button>
                    <button 
                        onClick={() => setFilter(EntityType.MONSTER)}
                        className={`px-4 py-1 font-bold transition-colors ${filter === EntityType.MONSTER ? 'text-red-400 border-b-2 border-red-400' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        MONSTERS ({entities.filter(e => e.type === EntityType.MONSTER).length})
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
                                onClick={() => toggleSelection(entity.id)}
                                className={`
                                    relative cursor-pointer group select-none
                                    bg-slate-800 border-4 p-2 transition-all
                                    ${isSelected ? 'border-yellow-400 bg-slate-700 transform scale-95' : 'border-slate-600 hover:border-slate-500 hover:-translate-y-1'}
                                `}
                            >
                                {isSelected && (
                                    <div className="absolute top-2 right-2 z-20 bg-yellow-400 text-black w-6 h-6 flex items-center justify-center font-bold border-2 border-black shadow-md">
                                        ✓
                                    </div>
                                )}

                                {isInWorld && (
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
                                        <div className={`text-[10px] font-bold text-center tracking-wider ${entity.type === EntityType.NPC ? 'text-blue-300' : 'text-red-300'}`}>
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
                                    {entity.tags && entity.tags.length > 0 && (
                                        <div className="flex justify-center gap-1 mt-1 flex-wrap h-4 overflow-hidden">
                                            {entity.tags.slice(0, 2).map(t => (
                                                <span key={t} className="text-[8px] text-slate-500 bg-slate-900 px-1 rounded">{t}</span>
                                            ))}
                                            {entity.tags.length > 2 && <span className="text-[8px] text-slate-500">...</span>}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                    
                    {filteredEntities.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-500 border-2 border-dashed border-slate-700 rounded-lg">
                            <p className="mb-4">No assets found matching filters.</p>
                            <Button onClick={() => { setFilter('ALL'); setTagFilter(null); }} variant="secondary">Clear Filters</Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
