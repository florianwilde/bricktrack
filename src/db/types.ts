import type {
  collectionItem,
  instruction,
  location,
  manufacturer,
  missingPart,
  photo,
  set,
  tag,
  theme,
  user,
  wishlist,
  wishlistItem,
} from './schema';

export type User = typeof user.$inferSelect;
export type Manufacturer = typeof manufacturer.$inferSelect;
export type Theme = typeof theme.$inferSelect;
export type Set = typeof set.$inferSelect;
export type NewSet = typeof set.$inferInsert;
export type Instruction = typeof instruction.$inferSelect;
export type Location = typeof location.$inferSelect;
export type CollectionItem = typeof collectionItem.$inferSelect;
export type NewCollectionItem = typeof collectionItem.$inferInsert;
export type MissingPart = typeof missingPart.$inferSelect;
export type Photo = typeof photo.$inferSelect;
export type Tag = typeof tag.$inferSelect;
export type Wishlist = typeof wishlist.$inferSelect;
export type WishlistItem = typeof wishlistItem.$inferSelect;

export type CollectionStatus = CollectionItem['status'];
export type Completeness = CollectionItem['completeness'];
export type Condition = NonNullable<CollectionItem['condition']>;
export type Occasion = Wishlist['occasion'];
export type UserRole = User['role'];
