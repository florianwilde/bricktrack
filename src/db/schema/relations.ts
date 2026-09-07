import { relations } from 'drizzle-orm';
import { passkey, session, user } from './auth';
import { instruction, manufacturer, set, setTag, tag, theme } from './catalog';
import { collectionItem, location, missingPart, photo } from './collection';
import { collector } from './collector';
import { pricePoint } from './prices';
import { wishlist, wishlistItem } from './wishlist';

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  passkeys: many(passkey),
  wishlists: many(wishlist),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, { fields: [session.userId], references: [user.id] }),
}));

export const passkeyRelations = relations(passkey, ({ one }) => ({
  user: one(user, { fields: [passkey.userId], references: [user.id] }),
}));

export const manufacturerRelations = relations(manufacturer, ({ many }) => ({
  themes: many(theme),
  sets: many(set),
}));

export const themeRelations = relations(theme, ({ one, many }) => ({
  manufacturer: one(manufacturer, {
    fields: [theme.manufacturerId],
    references: [manufacturer.id],
  }),
  parent: one(theme, {
    fields: [theme.parentThemeId],
    references: [theme.id],
    relationName: 'themeHierarchy',
  }),
  children: many(theme, { relationName: 'themeHierarchy' }),
  sets: many(set),
}));

export const setRelations = relations(set, ({ one, many }) => ({
  manufacturer: one(manufacturer, {
    fields: [set.manufacturerId],
    references: [manufacturer.id],
  }),
  theme: one(theme, { fields: [set.themeId], references: [theme.id] }),
  collectionItems: many(collectionItem),
  instructions: many(instruction),
  photos: many(photo),
  setTags: many(setTag),
  wishlistItems: many(wishlistItem),
  pricePoints: many(pricePoint),
}));

export const pricePointRelations = relations(pricePoint, ({ one }) => ({
  set: one(set, { fields: [pricePoint.setId], references: [set.id] }),
}));

export const tagRelations = relations(tag, ({ many }) => ({
  setTags: many(setTag),
}));

export const setTagRelations = relations(setTag, ({ one }) => ({
  set: one(set, { fields: [setTag.setId], references: [set.id] }),
  tag: one(tag, { fields: [setTag.tagId], references: [tag.id] }),
}));

export const instructionRelations = relations(instruction, ({ one }) => ({
  set: one(set, { fields: [instruction.setId], references: [set.id] }),
}));

export const locationRelations = relations(location, ({ one, many }) => ({
  parent: one(location, {
    fields: [location.parentLocationId],
    references: [location.id],
    relationName: 'locationHierarchy',
  }),
  children: many(location, { relationName: 'locationHierarchy' }),
  collectionItems: many(collectionItem),
}));

export const collectorRelations = relations(collector, ({ many }) => ({
  collectionItems: many(collectionItem),
  wishlists: many(wishlist),
}));

export const collectionItemRelations = relations(collectionItem, ({ one, many }) => ({
  set: one(set, { fields: [collectionItem.setId], references: [set.id] }),
  collector: one(collector, {
    fields: [collectionItem.collectorId],
    references: [collector.id],
  }),
  location: one(location, {
    fields: [collectionItem.locationId],
    references: [location.id],
  }),
  missingParts: many(missingPart),
  photos: many(photo),
}));

export const missingPartRelations = relations(missingPart, ({ one }) => ({
  collectionItem: one(collectionItem, {
    fields: [missingPart.collectionItemId],
    references: [collectionItem.id],
  }),
}));

export const photoRelations = relations(photo, ({ one }) => ({
  set: one(set, { fields: [photo.setId], references: [set.id] }),
  collectionItem: one(collectionItem, {
    fields: [photo.collectionItemId],
    references: [collectionItem.id],
  }),
}));

export const wishlistRelations = relations(wishlist, ({ one, many }) => ({
  owner: one(user, { fields: [wishlist.ownerUserId], references: [user.id] }),
  collector: one(collector, {
    fields: [wishlist.collectorId],
    references: [collector.id],
  }),
  items: many(wishlistItem),
}));

export const wishlistItemRelations = relations(wishlistItem, ({ one }) => ({
  wishlist: one(wishlist, { fields: [wishlistItem.wishlistId], references: [wishlist.id] }),
  set: one(set, { fields: [wishlistItem.setId], references: [set.id] }),
}));
