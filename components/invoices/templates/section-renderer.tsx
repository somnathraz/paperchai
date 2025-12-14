/**
 * Helper to render sections in order based on template's slot map
 * This ensures each template respects its own layout structure
 */

import React from "react";
import { TemplateSection, TemplateSlug } from "./types";
import { templateSlotMap } from "./registry";

export type SectionRenderer = (id: string) => React.ReactNode | null;

export function getOrderedSections(
  slug: TemplateSlug,
  sections: TemplateSection[] | undefined,
  defaultOrder: string[]
): TemplateSection[] {
  if (!sections || sections.length === 0) {
    // Return default sections if none provided
    return defaultOrder.map((id) => ({
      id,
      title: id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, " "),
      visible: true,
    }));
  }

  const slotOrder = templateSlotMap[slug];
  if (!slotOrder) {
    // No slot map, use sections as-is (respect manual ordering)
    return sections;
  }

  // Separate sections into slots based on template's layout
  // But respect the manual order within each slot
  const leftSlotIds = slotOrder.left || [];
  const rightSlotIds = slotOrder.right || [];
  const mainSlotIds = slotOrder.main || [];

  // Group sections by their slot, preserving manual order
  const leftSections: TemplateSection[] = [];
  const rightSections: TemplateSection[] = [];
  const mainSections: TemplateSection[] = [];
  const customSections: TemplateSection[] = [];
  const otherSections: TemplateSection[] = [];

  // Process sections in their manual order
  for (const section of sections) {
    if (section.custom) {
      // Custom sections go to the slot they're closest to in order
      // For now, append to main, but templates can override this
      customSections.push(section);
    } else if (leftSlotIds.includes(section.id)) {
      leftSections.push(section);
    } else if (rightSlotIds.includes(section.id)) {
      rightSections.push(section);
    } else if (mainSlotIds.includes(section.id)) {
      mainSections.push(section);
    } else {
      // Unknown section, add to other
      otherSections.push(section);
    }
  }

  // Return sections in slot order: main first, then left/right columns, then custom, then other
  // This preserves manual ordering within each slot
  return [
    ...mainSections,
    ...leftSections,
    ...rightSections,
    ...customSections,
    ...otherSections,
  ];
}

