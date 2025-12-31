## 2024-05-23 - Firestore Open Read Access
**Vulnerability:** The `users` collection was readable by any authenticated user via `allow read`, which permits listing all documents (dumping the database).
**Learning:** Using `allow read` implicitly grants both `get` (single doc) and `list` (collection query). Often developers only intend to allow fetching specific docs by ID, not scraping the whole table.
**Prevention:** Split rules into `allow get` and `allow list`. Explicitly deny `list` unless necessary for specific queries (e.g. searching/filtering).
