'use client';

import React from 'react';
import BundleBuilder from './BundleBuilder';
import CollectionList from './CollectionList';
import CreateNewCard from '@/components/shared/CreateNewCard';
import { BundleBuilderState, BuilderMode } from './hooks/useBundleBuilder';

const CONFIG = {
  meal: {
    emptyMessage: 'No saved meals.',
    createTitle: 'Create Meal',
    createHint: 'Build a new meal combination',
    accent: 'emerald' as const,
  },
  recipe: {
    emptyMessage: 'No recipes created.',
    createTitle: 'Create Recipe',
    createHint: 'Build a new multi-serving recipe',
    accent: 'amber' as const,
  },
};

interface BundleTabPanelProps {
  type: BuilderMode;
  items: any[];
  searchQuery: string;
  hasExactMatch: boolean;
  builder: BundleBuilderState;
  onAddFood: () => void;
  onLog: (item: any) => void;
  onDelete: (
    e: React.MouseEvent,
    id: string,
    table: 'saved_meals' | 'recipes',
  ) => void;
}

/**
 * The "Meals" and "Recipes" tabs: either the builder, or the saved list plus a
 * card offering to create whatever the user just searched for.
 */
export default function BundleTabPanel({
  type,
  items,
  searchQuery,
  hasExactMatch,
  builder,
  onAddFood,
  onLog,
  onDelete,
}: BundleTabPanelProps) {
  const config = CONFIG[type];
  const query = searchQuery.trim();

  if (builder.mode === type) {
    return (
      <div className="space-y-4">
        <BundleBuilder
          builderMode={type}
          stagedFoods={builder.foods}
          stagedName={builder.name}
          setStagedName={builder.setName}
          stagedServings={builder.servings}
          setStagedServings={builder.setServings}
          onCancel={builder.cancel}
          onAddFood={onAddFood}
          onSave={builder.save}
          isSubmitting={builder.isSaving}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <CollectionList
        type={type}
        items={items}
        emptyMessage={config.emptyMessage}
        onLog={onLog}
        onEdit={(e, item) => {
          e.stopPropagation();
          builder.startEditing(type, item);
        }}
        onDelete={onDelete}
        onCreateNew={() => builder.startNew(type)}
      />
      {query && !hasExactMatch && (
        <CreateNewCard
          title={`${config.createTitle}: "${query}"`}
          hint={config.createHint}
          accent={config.accent}
          onClick={() => builder.startNew(type, query)}
        />
      )}
    </div>
  );
}
