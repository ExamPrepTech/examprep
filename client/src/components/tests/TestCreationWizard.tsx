import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Check, Filter, Search } from 'lucide-react';
import { useSpaceStore } from '@/store/spaceStore';
import { useContentStore } from '@/store/contentStore';
import { useTestStore } from '@/store/testStore';
import { PromptService } from '@/services/PromptService';
import { Modal } from '@/components/common/Modal';
import { Button } from '@/components/common/Button';
import api from '@/lib/api';
import type { Subject, Topic } from '@/types/domain';

interface TestCreationWizardProps {
    isOpen: boolean;
    onClose: () => void;
}

// Tree Structure
type SelectionTree = {
    [spaceId: string]: {
        allSubjects: boolean;
        subjects: {
            [subjectId: string]: {
                allTopics: boolean;
                topics: string[]; // List of topic IDs
            }
        }
    }
}

export function TestCreationWizard({ isOpen, onClose }: TestCreationWizardProps) {
    const navigate = useNavigate();
    const { spaces, fetchSpaces, isLoading: isSpacesLoading } = useSpaceStore();
    const { getSubjects, getTopics } = useContentStore();

    // Wizard Step State
    const [step, setStep] = useState<'selection' | 'tags' | 'config'>('selection');
    const [config, setConfig] = useState({
        questionCount: 15,
        duration: 60, // minutes
        marksPerQuestion: 1,
        negativeMarks: 0.25
    });

    // Selection State
    const [tree, setTree] = useState<SelectionTree>({});

    // Modal Stack & Data Cache
    const [subjectLayer, setSubjectLayer] = useState<{ spaceId: string; spaceName: string } | null>(null);
    const [topicLayer, setTopicLayer] = useState<{ spaceId: string; subjectId: string; subjectName: string } | null>(null);

    // We cache data here to avoid refetching when navigating back/forth in the wizard
    // API calls are strictly via store methods (getSubjects, getTopics)
    const [cachedSubjects, setCachedSubjects] = useState<Record<string, Subject[]>>({});
    const [cachedTopics, setCachedTopics] = useState<Record<string, Topic[]>>({});
    const [isLoadingLayer, setIsLoadingLayer] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');

    // Optional tag filter (populated when entering the config step)
    const [availableTags, setAvailableTags] = useState<string[]>([]);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [isLoadingTags, setIsLoadingTags] = useState(false);

    useEffect(() => {
        if (isOpen) {
            fetchSpaces();
            setStep('selection');
        } else {
            setTree({});
            setSubjectLayer(null);
            setTopicLayer(null);
            setSearchTerm('');
            setStep('selection');
            setAvailableTags([]);
            setSelectedTags([]);
        }
    }, [isOpen, fetchSpaces]);

    // Clear search when changing layers or steps (the search box is shared)
    useEffect(() => {
        setSearchTerm('');
    }, [subjectLayer, topicLayer, step]);

    // --- Helpers ---

    const isSpaceSelected = (spaceId: string) => !!tree[spaceId];

    const isSubjectSelected = (spaceId: string, subjectId: string) => {
        const space = tree[spaceId];
        if (!space) return false;
        if (space.allSubjects) return true;
        return !!space.subjects[subjectId];
    };

    const isTopicSelected = (spaceId: string, subjectId: string, topicId: string) => {
        const space = tree[spaceId];
        if (!space) return false;

        // Resolve subject selection
        let subSel;
        if (space.allSubjects) {
            // Implicit all subjects selected
            return true;
        } else {
            subSel = space.subjects[subjectId];
        }

        if (!subSel) return false;
        if (subSel.allTopics) return true;
        return subSel.topics.includes(topicId);
    };

    // --- Action Handlers ---

    const toggleSpace = (spaceId: string) => {
        setTree(prev => {
            const next = { ...prev };
            if (next[spaceId]) {
                delete next[spaceId];
            } else {
                next[spaceId] = { allSubjects: false, subjects: {} };
            }
            return next;
        });
    };

    const toggleSubject = (spaceId: string, subjectId: string, allSpaceSubjects: Subject[]) => {
        setTree(prev => {
            const next = { ...prev };
            const spaceSel = next[spaceId];

            if (!spaceSel) {
                // Auto-select space if selecting a subject (from unselected state)
                next[spaceId] = {
                    allSubjects: false,
                    subjects: { [subjectId]: { allTopics: false, topics: [] } }
                };
                return next;
            }

            if (spaceSel.allSubjects) {
                // Switching from "Implicit All" to "Explicit Selection" (deselecting one item)
                const newSubjectsMap: Record<string, { allTopics: boolean; topics: string[] }> = {};
                allSpaceSubjects.forEach(s => {
                    if (s._id !== subjectId) {
                        newSubjectsMap[s._id] = { allTopics: true, topics: [] };
                    }
                });

                next[spaceId] = {
                    ...spaceSel,
                    allSubjects: false,
                    subjects: newSubjectsMap
                };
            } else {
                // Explicit mode
                const subSel = spaceSel.subjects[subjectId];
                if (subSel) {
                    // Remove
                    const newSubs = { ...spaceSel.subjects };
                    delete newSubs[subjectId];
                    if (Object.keys(newSubs).length === 0) {
                        delete next[spaceId];
                    } else {
                        next[spaceId] = { ...spaceSel, subjects: newSubs };
                    }
                } else {
                    // Add
                    next[spaceId] = {
                        ...spaceSel,
                        subjects: {
                            ...spaceSel.subjects,
                            [subjectId]: { allTopics: false, topics: [] }
                        }
                    };
                }
            }
            return next;
        });
    };

    const toggleTopic = (spaceId: string, subjectId: string, topicId: string, allSubjectTopics: Topic[]) => {
        setTree(prev => {
            const next = { ...prev };
            let spaceSel = next[spaceId];
            if (!spaceSel) {
                // Initialize space if not present (Partial space selection)
                next[spaceId] = { allSubjects: false, subjects: {} };
                spaceSel = next[spaceId];
            }

            // Handle implicit all subjects -> explicit subject for topic refinement
            if (spaceSel.allSubjects) {
                const allSubs = cachedSubjects[spaceId] || [];
                const newSubjectsMap: Record<string, { allTopics: boolean; topics: string[] }> = {};
                allSubs.forEach(s => {
                    newSubjectsMap[s._id] = { allTopics: true, topics: [] };
                });
                spaceSel.allSubjects = false;
                spaceSel.subjects = newSubjectsMap;
            }

            let subSel = spaceSel.subjects[subjectId];
            if (!subSel) {
                // Initialize subject if not present.
                // IMPORTANT: Default to selecting ONLY the target topic, not all.
                subSel = { allTopics: false, topics: [topicId] };
            } else {
                if (subSel.allTopics) {
                    // Switch to explicit topics: All except ONE (Deselecting)
                    const newTopicsList = allSubjectTopics
                        .filter(t => t._id !== topicId)
                        .map(t => t._id);

                    subSel.allTopics = false;
                    subSel.topics = newTopicsList;
                } else {
                    // Toggle
                    if (subSel.topics.includes(topicId)) {
                        subSel.topics = subSel.topics.filter(id => id !== topicId);
                    } else {
                        subSel.topics.push(topicId);
                    }
                    if (subSel.topics.length === allSubjectTopics.length) {
                        subSel.allTopics = true;
                    }
                }
            }

            // Cleanup
            if (!subSel.allTopics && subSel.topics.length === 0) {
                delete spaceSel.subjects[subjectId];
            } else {
                spaceSel.subjects[subjectId] = subSel;
            }
            // Clean up if we just set it but verify logic
            if (next[spaceId] && Object.keys(next[spaceId].subjects).length === 0 && !next[spaceId].allSubjects) {
                delete next[spaceId];
            }

            return next;
        });
    };

    const handleSelectAllSubjects = (spaceId: string, select: boolean) => {
        setTree(prev => {
            const next = { ...prev };
            if (select) {
                next[spaceId] = { allSubjects: true, subjects: {} };
            } else {
                delete next[spaceId];
            }
            return next;
        });
    };

    const handleSelectAllTopics = (spaceId: string, subjectId: string, select: boolean) => {
        setTree(prev => {
            const next = { ...prev };
            const spaceSel = next[spaceId];

            if (spaceSel.allSubjects) {
                const allSubs = cachedSubjects[spaceId] || [];
                const newSubjectsMap: Record<string, { allTopics: boolean; topics: string[] }> = {};
                allSubs.forEach(s => {
                    newSubjectsMap[s._id] = { allTopics: true, topics: [] };
                });
                spaceSel.allSubjects = false;
                spaceSel.subjects = newSubjectsMap;
            }

            if (select) {
                spaceSel.subjects[subjectId] = { allTopics: true, topics: [] };
            } else {
                delete spaceSel.subjects[subjectId];
                if (Object.keys(spaceSel.subjects).length === 0) delete next[spaceId];
            }
            next[spaceId] = { ...spaceSel };
            return next;
        });
    };

    // --- Modal Expansion ---

    const handleOpenSubjects = async (spaceId: string, spaceName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSubjectLayer({ spaceId, spaceName });

        if (!cachedSubjects[spaceId]) {
            setIsLoadingLayer(true);
            try {
                const data = await getSubjects(spaceId);
                setCachedSubjects(prev => ({ ...prev, [spaceId]: data }));
            } catch (err) { console.error(err); }
            finally { setIsLoadingLayer(false); }
        }
    };

    const handleOpenTopics = async (spaceId: string, subjectId: string, subjectName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setTopicLayer({ spaceId, subjectId, subjectName });

        if (!cachedTopics[subjectId]) {
            setIsLoadingLayer(true);
            try {
                const data = await getTopics(subjectId);
                setCachedTopics(prev => ({ ...prev, [subjectId]: data }));
            } catch (err) { console.error(err); }
            finally { setIsLoadingLayer(false); }
        }
    };

    const { createTest } = useTestStore();
    const [isCreating, setIsCreating] = useState(false);

    // Build the hierarchical selections payload from the current tree.
    const buildSelections = () => Object.entries(tree).map(([spaceId, spaceVal]) => {
        const entry: Record<string, any> = { spaceId };
        if (!spaceVal.allSubjects) {
            entry.subjects = Object.entries(spaceVal.subjects).map(([subId, subVal]) => {
                const subEntry: Record<string, any> = { subjectId: subId };
                if (!subVal.allTopics) {
                    subEntry.topics = subVal.topics;
                }
                return subEntry;
            });
        }
        return entry;
    });

    // selection → tags: load the tags available within the chosen scope.
    const handleNext = async () => {
        setStep('tags');
        setIsLoadingTags(true);
        setSelectedTags([]);
        try {
            const res = await api.post<string[]>('/tests/available-tags', { selections: buildSelections() });
            setAvailableTags(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error('Failed to load tags', err);
            setAvailableTags([]);
        } finally {
            setIsLoadingTags(false);
        }
    };

    const toggleTag = (tag: string) => {
        setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
    };

    const handleCreate = async () => {
        setIsCreating(true);
        try {
            const newTest = await createTest({
                selections: buildSelections(),
                questionCount: config.questionCount,
                duration: config.duration,
                marksPerQuestion: config.marksPerQuestion,
                negativeMarks: config.negativeMarks,
                questionTypes: ['single_select_mcq', 'multi_select_mcq', 'fill_in_the_blank'],
                tags: selectedTags
            });
            onClose();
            navigate(`/tests/${newTest._id}`);
        } catch (error: any) {
            console.error('Failed to create test:', error);
            PromptService.error(error.response?.data?.message || error.message || "Failed to create test. Please try again.");
        } finally {
            setIsCreating(false);
        }
    };

    // --- Render Helpers ---

    const renderList = <T extends { _id: string, [key: string]: any }>(
        items: T[],
        labelKey: keyof T,
        isSelectedFn: (id: string) => boolean,
        onToggle: (id: string) => void,
        onExpand?: (item: T, e: React.MouseEvent) => void,
        isAllSelected?: boolean,
        onToggleAll?: (select: boolean) => void,
        placeholder?: string
    ) => {
        const filteredItems = items.filter(item =>
            String(item[labelKey]).toLowerCase().includes(searchTerm.toLowerCase())
        );

        return (
            <div className="flex flex-col h-[400px]">
                <div className="mb-3 relative">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-background border rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                </div>

                {onToggleAll && !searchTerm && (
                    <div className="flex items-center p-3 border-b mb-1 cursor-pointer hover:bg-accent" onClick={() => onToggleAll(!isAllSelected)}>
                        <div className={`w-5 h-5 rounded border flex items-center justify-center mr-3 ${isAllSelected ? 'bg-primary border-primary text-background' : 'border-muted-foreground'}`}>
                            {isAllSelected && <Check className="w-3 h-3" />}
                        </div>
                        <div className="font-medium text-foreground">Select All</div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                    {filteredItems.length === 0 ? (
                        <div className="text-center text-muted-foreground py-8">
                            {placeholder || 'No items found.'}
                        </div>
                    ) : (
                        filteredItems.map(item => {
                            const isSelected = isSelectedFn(item._id);
                            // Check if item has questionCount 0
                            const questionCount = (item as any).questionCount;
                            const isDisabled = typeof questionCount === 'number' && questionCount === 0;

                            return (
                                <div
                                    key={item._id}
                                    className={`flex items-center justify-between p-3 border rounded-lg transition-colors 
                                        ${isDisabled ? 'opacity-50 cursor-not-allowed bg-muted' : isSelected ? 'bg-secondary/30 border-primary/50' : 'hover:bg-accent'}`}
                                >
                                    <div
                                        className={`flex items-center gap-3 flex-1 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                        onClick={() => !isDisabled && onToggle(item._id)}
                                    >
                                        <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-primary border-primary text-background' : 'border-muted-foreground'}`}>
                                            {isSelected && <Check className="w-3 h-3" />}
                                        </div>
                                        <div className="flex flex-col">
                                            <div className="font-medium text-foreground">{String(item[labelKey])}</div>
                                            {typeof questionCount === 'number' && (
                                                <span className="text-[10px] text-muted-foreground">{questionCount} questions</span>
                                            )}
                                        </div>
                                    </div>
                                    {onExpand && isSelected && (
                                        <Button
                                            variant="ghost" size="icon"
                                            onClick={(e) => !isDisabled && onExpand(item, e)}
                                            className="shrink-0 ml-2 h-8 w-8"
                                            title="Filter"
                                            disabled={isDisabled}
                                        >
                                            <Filter className="w-4 h-4 text-muted-foreground" />
                                        </Button>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        );
    };

    // --- Layers ---

    const renderSpaceLayer = () => {
        if (step !== 'selection') return null;

        return (
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title="Create Test - Select Content"
                footer={
                    <div className="flex gap-2 justify-end w-full">
                        <Button variant="secondary" onClick={onClose} disabled={isCreating}>Cancel</Button>
                        <Button onClick={handleNext} disabled={Object.keys(tree).length === 0}>
                            Next
                        </Button>
                    </div>
                }
            >
                {isSpacesLoading && spaces.length === 0 ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                ) : (
                    renderList(
                        spaces,
                        'name',
                        isSpaceSelected,
                        toggleSpace,
                        (s, e) => handleOpenSubjects(s._id, s.name, e),
                        false,
                        undefined,
                        "No spaces found."
                    )
                )}
            </Modal>
        );
    };

    const renderTagsLayer = () => {
        if (step !== 'tags') return null;

        const tagItems = availableTags.map(t => ({ _id: t, name: t }));
        const allSelected = availableTags.length > 0 && selectedTags.length === availableTags.length;

        return (
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title="Create Test - Filter by Tags (Optional)"
                footer={
                    <div className="flex gap-2 justify-end w-full">
                        <Button variant="secondary" onClick={() => setStep('selection')} disabled={isCreating}>Back</Button>
                        <Button onClick={() => setStep('config')}>Next</Button>
                    </div>
                }
            >
                {isLoadingTags ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                ) : (
                    <>
                        <p className="text-xs text-muted-foreground mb-2">
                            Leave empty to include all questions. Selecting tags limits the test to questions with any of them.
                        </p>
                        {renderList(
                            tagItems,
                            'name',
                            (id) => selectedTags.includes(id),
                            (id) => toggleTag(id),
                            undefined,
                            allSelected,
                            (sel) => setSelectedTags(sel ? [...availableTags] : []),
                            "No tags found for the selected content."
                        )}
                    </>
                )}
            </Modal>
        );
    };

    const renderConfigLayer = () => {
        if (step !== 'config') return null;

        return (
            <Modal
                isOpen={isOpen}
                onClose={onClose}
                title="Create Test - Configure"
                footer={
                    <div className="flex gap-2 justify-end w-full">
                        <Button variant="secondary" onClick={() => setStep('tags')} disabled={isCreating}>Back</Button>
                        <Button onClick={handleCreate} disabled={isCreating}>
                            {isCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Start Test
                        </Button>
                    </div>
                }
            >
                <div className="space-y-6 p-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Number of Questions</label>
                        <input
                            type="number"
                            min="1"
                            max="100"
                            value={config.questionCount}
                            onChange={(e) => setConfig({ ...config, questionCount: parseInt(e.target.value) || 0 })}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                        <p className="text-xs text-muted-foreground">
                            Approximate count. Actual questions might vary based on availability.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium">Duration (minutes)</label>
                        <input
                            type="number"
                            min="5"
                            max="180"
                            value={config.duration}
                            onChange={(e) => setConfig({ ...config, duration: parseInt(e.target.value) || 0 })}
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Marks per Question</label>
                            <input
                                type="number"
                                min="1"
                                step="0.5"
                                value={config.marksPerQuestion}
                                onChange={(e) => setConfig({ ...config, marksPerQuestion: parseFloat(e.target.value) || 0 })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Negative Marks</label>
                            <input
                                type="number"
                                min="0"
                                step="0.25"
                                max={config.marksPerQuestion}
                                value={config.negativeMarks}
                                onChange={(e) => setConfig({ ...config, negativeMarks: parseFloat(e.target.value) || 0 })}
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Marks deducted for wrong answers.
                            </p>
                        </div>
                    </div>
                </div>
            </Modal>
        );
    };

    const renderSubjectLayer = () => {
        if (!subjectLayer) return null;
        const currentSubjects = cachedSubjects[subjectLayer.spaceId] || [];
        const spaceNode = tree[subjectLayer.spaceId];
        const isAll = spaceNode?.allSubjects;

        return (
            <Modal
                isOpen={true}
                onClose={() => setSubjectLayer(null)}
                title={`Subjects in ${subjectLayer.spaceName}`}
                footer={<Button onClick={() => setSubjectLayer(null)}>Done</Button>}
            >
                {isLoadingLayer && currentSubjects.length === 0 ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                ) : (
                    renderList(
                        currentSubjects,
                        'title',
                        (id) => isSubjectSelected(subjectLayer.spaceId, id),
                        (id) => toggleSubject(subjectLayer.spaceId, id, currentSubjects),
                        (s, e) => handleOpenTopics(subjectLayer.spaceId, s._id, s.title, e),
                        isAll,
                        (sel) => handleSelectAllSubjects(subjectLayer.spaceId, sel)
                    )
                )}
            </Modal>
        );
    };

    const renderTopicLayer = () => {
        if (!topicLayer) return null;
        const currentTopics = cachedTopics[topicLayer.subjectId] || [];
        const isAll = tree[topicLayer.spaceId]?.subjects[topicLayer.subjectId]?.allTopics;

        return (
            <Modal
                isOpen={true}
                onClose={() => setTopicLayer(null)}
                title={`Topics in ${topicLayer.subjectName}`}
                footer={<Button onClick={() => setTopicLayer(null)}>Done</Button>}
            >
                {isLoadingLayer && currentTopics.length === 0 ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin text-primary" /></div>
                ) : (
                    renderList(
                        currentTopics,
                        'title',
                        (id) => isTopicSelected(topicLayer.spaceId, topicLayer.subjectId, id),
                        (id) => toggleTopic(topicLayer.spaceId, topicLayer.subjectId, id, currentTopics),
                        undefined,
                        isAll,
                        (sel) => handleSelectAllTopics(topicLayer.spaceId, topicLayer.subjectId, sel)
                    )
                )}
            </Modal>
        );
    };

    if (!isOpen) return null;

    return (
        <>
            {renderSpaceLayer()}
            {renderTagsLayer()}
            {renderConfigLayer()}
            {renderSubjectLayer()}
            {renderTopicLayer()}
        </>
    );
}
