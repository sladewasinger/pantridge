# Security and usability review — September 8, 2026

Reviewed authentication, account selection, offline outbox synchronization, API authorization and validation, domain transitions, backup parsing, deployment permissions, dependencies, and mobile interactions. This is a source review with automated regression and browser checks, not a penetration-test certification.

## Findings fixed

| Finding                                                                               | Impact                                                                            | Resolution                                                                                                                                                                  |
| ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Token/account mismatch during cross-tab sign-in or asynchronous refresh               | High: one account's pending edits could be submitted with another account's token | Token retrieval requires the kitchen's subject, checks it before and after refresh, and sync checks the account again after awaits. Regression tests cover both mismatches. |
| Put-away saved metadata separately from the stock operation                           | Medium: failed purchases could leave partial location changes                     | One domain transition now validates purchase identity, units and quantity and commits placement, stock and list removal together.                                           |
| Duplicate IDs or missing food links in backups/snapshots                              | Medium: malformed imports could damage inventory relationships                    | Shared snapshot validation rejects duplicates and orphaned references before committing data.                                                                               |
| Editing a shopping entry restored from browser history could recreate a removed entry | Low: accidental resurrection                                                      | The form reads the current saved entry and refuses to save a removed entry.                                                                                                 |
| Rapid repeated actions could overlap before React disabled the button                 | Low: duplicate local operations                                                   | A synchronous action lock surrounds persistence operations.                                                                                                                 |
| Sign-out only removed local tokens and the hosted session                             | Defense in depth                                                                  | Online sign-out attempts bounded refresh-token revocation before clearing local session state; local sign-out still works offline.                                          |
| Mutable third-party Action tags                                                       | Supply-chain exposure                                                             | Actions are pinned to verified commit SHAs; CI also blocks high/critical known dependency advisories.                                                                       |

Dependency audit reported zero known vulnerabilities for production dependencies and the full dependency graph during this review. Live checks verified HTTPS, CSP, HSTS, frame denial, MIME-sniff prevention, referrer policy, and rejection of unauthenticated API requests. API tests verify that caller-provided account fields cannot override the JWT subject and invalid/oversized bodies never reach persistence.

## Mobile improvements implemented

- Shopping search, unchecked-first ordering, purchase progress, 44px check targets, and food thumbnails.
- Visual artwork buttons, new bread/apple/carrots/fish illustrations, and an illustrated empty shopping list with a direct add action.
- Tap an empty shelf to add directly to that shelf and storage compartment.
- Date badges distinguish today, tomorrow, upcoming and past dates without declaring food safe or unsafe.
- Sticky sheet headings, reduced-motion-aware sheet transitions, better purchased-text contrast, search clearing and trimmed matching.
- Quantity fields can be cleared and replaced using a numeric keyboard.
- Deleting food offers Undo, restoring its identity and all lots in one local transaction. Shopping entries retained by deletion remain standalone. Undo lasts until dismissed, replaced, or the page reloads.

## Limits and follow-up work

Google's full interactive sign-in and authenticated two-device round trip require real accounts and were not exercised in this review. Token tests use controlled fixtures. Mobile browser emulation covers layout, touch, history, accessibility, offline reloads and narrow screens; physical iOS/Android keyboard and installed-PWA testing remain useful.

The app intentionally retains offline account data on the device after sign-out. Browser storage is not an encrypted vault. Refresh revocation requires network access, and API Gateway JWT validation can accept an already-issued access token until expiry; this release does not maintain a token denylist. See [AWS token revocation](https://docs.aws.amazon.com/cognito/latest/developerguide/token-revocation.html).

Backup restoration still requires an empty inventory. A guided guest-to-account migration, account-data removal controls, and clearer multi-device conflict resolution would be valuable follow-ups. Walmart receipt import and the commonly used shelf remain the previously agreed future features; this pass adds no retailer integration or automatic replenishment.

Infrastructure applies remain manual. This pass changes application code and CI; it does not modify existing AWS resources or broaden the deployment role.
