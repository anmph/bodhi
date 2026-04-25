/** Strict 24-hex check (avoids treating Google numeric `sub` as a Mongo id). */
export function isLikelyMongoObjectId(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{24}$/i.test(value);
}
