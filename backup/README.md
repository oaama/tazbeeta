# Tazbeeta backups (private)
A daily GitHub Action downloads all data from the worker (`/api/backup`, protected by a key), encrypts it with AES-256 and commits it to `backups/`.

Restore:
1. `openssl enc -d -aes-256-cbc -pbkdf2 -pass env:BACKUP_PASSPHRASE -in backups/tazbeeta-DATE.json.gz.enc | gunzip > backup.json`
2. `python3 restore.py backup.json > restore.sql`
3. `npx wrangler d1 execute <database-name> --remote --file restore.sql`
