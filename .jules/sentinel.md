## 2024-05-24 - Firestore Unauthenticated Access to User Data
**Vulnerability:** The `publicUsers` collection was readable by anyone (`if true`), allowing unauthenticated attackers to scrape all user emails and nicknames. This was likely intended to support a "pre-login" user lookup feature, but it exposed the entire database.
**Learning:** UX convenience features (like checking if an email exists before login) often conflict with security principles (user enumeration). When in doubt, prioritize security. "Public" in a collection name does not mean "Public to the world".
**Prevention:** Always use `isSignedIn()` as a baseline for any user data. If "public" data is needed, restrict `list` operations to exact matches only (e.g. searching by email), or use Cloud Functions to expose a limited lookup API without exposing the database.

## 2024-05-25 - Firestore User Enumeration via List Queries
**Vulnerability:** The `publicUsers` collection allowed `read` access to any authenticated user. While better than public access, this still allowed any user to list all other users by running an unbounded query (dumping the collection).
**Learning:** `allow read` implies `get` (single doc) AND `list` (queries). Most "public profile" lookups only need `get` (if ID known) or a very specific search. Unrestricted `list` is a data leak.
**Prevention:** Split `read` into `get` and `list`. Restrict `list` using `request.query` constraints (e.g. `limit`, specific filters) to ensure it can only be used for targeted lookups (like "find user by email") and not bulk scraping.
