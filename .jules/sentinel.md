## 2024-05-24 - Firestore Unauthenticated Access to User Data
**Vulnerability:** The `publicUsers` collection was readable by anyone (`if true`), allowing unauthenticated attackers to scrape all user emails and nicknames. This was likely intended to support a "pre-login" user lookup feature, but it exposed the entire database.
**Learning:** UX convenience features (like checking if an email exists before login) often conflict with security principles (user enumeration). When in doubt, prioritize security. "Public" in a collection name does not mean "Public to the world".
**Prevention:** Always use `isSignedIn()` as a baseline for any user data. If "public" data is needed, restrict `list` operations to exact matches only (e.g. searching by email), or use Cloud Functions to expose a limited lookup API without exposing the database.
## 2024-05-23 - [Critical] Insecure Direct Object Reference (IDOR) in User Data
**Vulnerability:** The `firestore.rules` allowed any authenticated user to read any document in the `users` collection (`allow get: if isSignedIn();`). This exposed private user data (e.g., preferences, internal flags, email) to anyone who could guess or enumerate user IDs.
**Learning:** The application architecture originally relied on the `users` collection for partner data (nickname lookup), necessitating open read access. The presence of a separate `publicUsers` collection was underutilized.
**Prevention:**
1.  **Strict Owner-Only Access:** Security rules for private profile collections (like `users`) must strictly enforce `request.auth.uid == userId`.
2.  **Public Profile Separation:** Cross-user data (partners, search results) must *always* be fetched from a dedicated public collection (e.g., `publicUsers`) that contains only non-sensitive data.
3.  **Data Duplication:** Necessary display data (nickname, email) should be duplicated to the public profile during updates to avoid needing access to the private profile.
