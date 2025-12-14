import { useState, useCallback } from "react";
import { InvoiceSection } from "../types";

/**
 * Hook to manage drag-and-drop reordering of invoice sections
 */
export function useSectionsDragDrop(
    sections: InvoiceSection[],
    onSectionsChange: (sections: InvoiceSection[]) => void
) {
    const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const handleDragStart = useCallback((e: React.DragEvent, sectionId: string) => {
        setDraggedSectionId(sectionId);
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/html", sectionId);
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = "0.5";
        }
    }, []);

    const handleDragEnd = useCallback((e: React.DragEvent) => {
        setDraggedSectionId(null);
        setDragOverIndex(null);
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = "1";
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverIndex(index);
    }, []);

    const handleDrop = useCallback(
        (e: React.DragEvent, dropIndex: number) => {
            e.preventDefault();
            setDragOverIndex(null);

            if (draggedSectionId === null) return;

            const dragIndex = sections.findIndex((s) => s.id === draggedSectionId);
            if (dragIndex === -1 || dragIndex === dropIndex) return;

            const newSections = [...sections];
            const [removed] = newSections.splice(dragIndex, 1);
            newSections.splice(dropIndex, 0, removed);

            onSectionsChange(newSections);
            setDraggedSectionId(null);
        },
        [draggedSectionId, sections, onSectionsChange]
    );

    const handleDragLeave = useCallback(() => {
        setDragOverIndex(null);
    }, []);

    return {
        draggedSectionId,
        dragOverIndex,
        handleDragStart,
        handleDragEnd,
        handleDragOver,
        handleDrop,
        handleDragLeave,
    };
}

/**
 * Hook to manage section visibility, renaming, and ordering
 */
export function useSectionsManager(
    sections: InvoiceSection[],
    onSectionsChange: (sections: InvoiceSection[]) => void
) {
    const toggleSectionVisibility = useCallback(
        (id: string) => {
            onSectionsChange(sections.map((s) => (s.id === id ? { ...s, visible: !s.visible } : s)));
        },
        [sections, onSectionsChange]
    );

    const renameSection = useCallback(
        (id: string, title: string) => {
            onSectionsChange(sections.map((s) => (s.id === id ? { ...s, title } : s)));
        },
        [sections, onSectionsChange]
    );

    const moveSection = useCallback(
        (id: string, direction: "up" | "down") => {
            const idx = sections.findIndex((s) => s.id === id);
            if (idx === -1) return;
            const target = direction === "up" ? idx - 1 : idx + 1;
            if (target < 0 || target >= sections.length) return;
            const copy = [...sections];
            const [item] = copy.splice(idx, 1);
            copy.splice(target, 0, item);
            onSectionsChange(copy);
        },
        [sections, onSectionsChange]
    );

    const addCustomSection = useCallback(() => {
        const id = `custom_${Date.now()}`;
        onSectionsChange([
            ...sections,
            { id, title: "Custom Section", visible: true, custom: true, content: "", items: [] },
        ]);
    }, [sections, onSectionsChange]);

    const updateCustomContent = useCallback(
        (id: string, content: string) => {
            onSectionsChange(sections.map((s) => (s.id === id ? { ...s, content } : s)));
        },
        [sections, onSectionsChange]
    );

    const updateCustomItems = useCallback(
        (id: string, items: { label: string; value: string }[]) => {
            onSectionsChange(sections.map((s) => (s.id === id ? { ...s, items } : s)));
        },
        [sections, onSectionsChange]
    );

    return {
        toggleSectionVisibility,
        renameSection,
        moveSection,
        addCustomSection,
        updateCustomContent,
        updateCustomItems,
    };
}
