# Phase 1 preservation and private access

Scope: preserve data, restrict access, and validate existing workflows. No imports,
merges, production record deletions, paid services, or billing changes.

## Data inventory (21 October 2026)

| Collection | Records | Usage |
|---|---:|---|
| activities | 104 | Current tracker logging, reports and follow-ups |
| igm_entries | 41 | Legacy activity data; not read by the current app |
| igm_custom_clients | 19 | Legacy customer directory; not read by the current app |

Current activity fields: account, contact, actType, status, stage, route, material,
notes, followupDate and dateStr are strings; ts is integer milliseconds; winback
is boolean. New edits add integer updatedAt. Older records also retain objective,
competitor, orderAmt and quoteAmt. Quote amounts include both integer and double
Firestore types. Editing uses updateDoc and retains unedited legacy fields and
original activity timestamps. Legacy activity types remain editable.

Legacy entries use string date, orderAmount, account, product, followupDate,
price, notes, activity, status and contact; followupDone is boolean and id is an
integer field. That id is NOT the Firestore document ID. Legacy clients use
string name, address, city, state, contact and phone. Account names are not stable
account IDs. Similar names across collections have not been merged. Legacy
means unused by this version, not obsolete or safe to discard.

## Backup and recovery

Reports > History provides an activity backup and an all-three-collections backup.
Both use authenticated paginated Firestore REST reads and preserve document paths
and typed field values, including unknown fields. Choose the downloaded JSON in
Check a saved backup to compare IDs and fields with current data. This comparison
does not write anything. PDF reports are not restoration backups.

Keep JSON files private, outside the public Git repository, with a second copy
in a private storage location. Avoid concurrent edits while backing up: these
sequential collection reads are not an atomic database snapshot. Subcollections,
authentication users, settings and rules are not included. Rules are versioned
separately here. No automatic scheduled backup has been enabled.

Restore validation uses tests/phase1.cjs against demo-igm-preservation only.
It restores document IDs and typed fields, then compares every record. Firestore
system createTime/updateTime are regenerated on restore; originals remain in the
backup. Production restoration requires a separately reviewed procedure and is
not available as a destructive button in the tracker.

## Access model

Google authentication plus Firestore rules restrict activity reads/writes to the
configured verified owner email using Google sign-in. Legacy collections are
read-only for the owner. All other collections and identities are denied by
default. The static GitHub Pages code is public; customer data requires owner
authorization. Firebase project administrators retain administrative access.

Google provider and the GitHub Pages domain must be enabled in Firebase Auth.
The UI does not subscribe to activities until the owner is signed in, clears
rendered records on sign-out, and uses authenticated requests for backups.
Saved text is escaped before HTML rendering and printing.

## Validation

21 October: refreshed backup has 104 + 41 + 19 records; browser comparison found
164 unchanged, zero missing, changed or unbacked-up records. Isolated restoration
matched every ID and typed field. Rules tests denied read/create/update/delete
for signed-out, wrong-email, unverified and wrong-provider identities. Owner
reads all three collections; legacy writes denied. Synthetic logging, editing,
follow-up updates, preservation of dates/unknown fields and two-client realtime
sync passed. Browser emulator logging and follow-up editing kept one record;
literal HTML-like notes displayed as text; sign-out hid the tracker.

Real Google owner sign-in and authenticated full backup passed in local preview.
Physical iPhone validation still requires the owner to perform the checks below.

## iPhone check after deployment

1. Open https://jayprakashrajkund.github.io/igm-tracker/ in Safari and refresh.
2. Tap Sign in with Google and choose the configured owner account. If Safari
   reports blocked pop-ups, allow pop-ups temporarily for sign-in and retry.
3. Check that History contains your existing notes and Follow-Ups lists your dates.
4. Log one clearly labelled iPhone test visit and confirm it appears on the computer.
5. Open that visit from Follow-Ups, change its note/date and save. Confirm the
   computer updates and no duplicate activity appears.
6. In Reports > History, back up all three collections. Save the JSON in Files
   and choose it in Check a saved backup. Confirm unchanged counts after edits settle.
7. Sign out: notes should disappear. A private Safari window should require sign-in.
8. If using a Home Screen shortcut, test sign-in there separately; Safari and
   Home Screen sessions can differ. Test online; offline saving is not guaranteed.

Do not start the customer-directory or five-account pilot until Phase 1 results
and remaining limitations have been reviewed.
