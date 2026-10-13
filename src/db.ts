import Dexie, { type EntityTable, type Table } from 'dexie'
import type { Box, BoxGrain, Grain, SavedIdea } from './types'

export const db = new Dexie('idea-app') as Dexie & {
  grains: EntityTable<Grain, 'id'>
  boxes: EntityTable<Box, 'id'>
  boxGrains: Table<BoxGrain, [string, string]>
  savedIdeas: EntityTable<SavedIdea, 'id'>
}

db.version(1).stores({
  grains: 'id, text, updatedAt',
  boxes: 'id, name, updatedAt',
  boxGrains: '[boxId+grainId], boxId, grainId',
  savedIdeas: 'id, createdAt',
})

export const newId = () => crypto.randomUUID()
