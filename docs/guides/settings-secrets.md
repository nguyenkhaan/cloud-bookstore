# Integration settings secrets

Implements [ADR-006](../decisions/ADR-006-integration-secret-protection.md) for SCR-SYS-04.

`SystemSettingsService` encrypts the entire `integrations.config_json` Description using native ASP.NET Core Data Protection. Stored values have the `dp:v1:` prefix and use purpose `CloudBookstore.SystemSettings.Integrations.v1`. DI registers Data Protection with application name `CloudBookstore`; the service requires an injected provider and has no ephemeral fallback.

GET and PUT responses mask configured VietQR ApiKey/ChecksumSecret, Zalo SecretKey/AccessToken, GoogleBooksApiKey, and SMTP Password as `********`. Unset credentials return empty strings. Null, blank, whitespace, or values made solely of bullets (`•`), stars (`*`), and whitespace preserve the existing secret. Demo mask placeholders represent unset credentials and never become stored credentials. A new non-placeholder value replaces the secret. This interface does not clear an existing secret using a blank value. Null/omitted request sections preserve the stored section; null legacy sections use the existing demo section with empty credentials. Non-secret demo defaults still persist on the first save if not replaced.

Updates merge against a private unmasked read, encrypt before making database changes, and save the config and change reason with one `SaveChangesAsync`. Only a missing configuration row uses defaults. Invalid JSON, empty stored values, damaged ciphertext, unavailable keys, or protection failures propagate an error; existing data is not overwritten with demo settings. GET never rewrites the row.

## Deployment: persistent key ring is required

Before storing real credentials, provision durable ASP.NET Core Data Protection key storage. The framework's environment-specific defaults are not a guarantee that a container or redeployment retains its keys. Do not deploy using an ephemeral key ring. Use the framework's deployment configuration; this feature adds no application configuration flags.

- Retain the key ring across restarts, rebuilds, deployment slots, and container replacement. For a single persistent host, retain the service account's key directory/profile. For containers, mount the key directory on a durable volume and configure the Data Protection builder with `PersistKeysToFileSystem` pointing to that mount.
- All replicas that share the settings database must use the same key ring and application name `CloudBookstore`. Keep the purpose string stable. Configure shared storage explicitly for multiple hosts; independent local directories cannot decrypt one another's settings.
- Restrict directory and file permissions to the application identity and designated backup/operations identities (Unix owner-only access where applicable, equivalent Windows ACLs). Give the application required read/write access; exclude other users, public mounts, repositories, and downloadable/static directories. Protect backups under equally restrictive access controls.
- Protect the key ring itself at rest using the platform's supported mechanism (for example DPAPI on a compatible Windows host or an appropriately managed certificate for shared hosts). Explicit filesystem persistence disables the framework's automatic key encryption selection, so configure key encryption explicitly when selecting custom storage. Ensure every replica has access to the required wrapping key/certificate.
- Back up and restore the database together with the key ring and any wrapping keys/certificates. Retain old Data Protection keys: rotation does not make old keys disposable while stored config still depends on them. Test recovery and reading/updating settings after a restart before production use.

If the required key is lost, GET and PUT fail, and PUT cannot repair the row by silently replacing it. Restore the matching key ring and wrapping keys. Do not delete the settings row or substitute demo data as automatic recovery.

## Legacy data and logging

Legacy plaintext JSON remains readable, with secrets masked in responses. It remains plaintext in the database until the next successful PUT, which encrypts the whole merged configuration, including omitted sections. This is a lazy migration, not a rewrite on read. Old backups, replicas, database logs, snapshots, and exports can still contain plaintext: restrict their access, apply retention policy, and rotate exposed credentials where necessary. Encrypting the current row does not sanitize historical copies.

Never log request bodies, raw persisted config, decrypted config, or secret field values. Future audit events must use the sanitized public GET/PUT config snapshots and, if needed, explicit secret-changed markers, never plaintext secrets. Keep change reasons and other free-text non-secret fields free of credentials; the separate change-reason row is not encrypted by this feature.

Framework deployment reference: [Data Protection configuration](https://learn.microsoft.com/en-us/aspnet/core/security/data-protection/configuration/overview?view=aspnetcore-10.0).
