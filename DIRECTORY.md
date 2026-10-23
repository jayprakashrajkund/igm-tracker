# Customer directory and workbook import

The Customers tab stores account IDs, source contacts and locations, signed sales
lines, and historical follow-up references. Source records and user-added contacts
are kept separately. Existing activities and both legacy collections remain intact.

An account's Notes view separates confirmed links from possible name matches.
Only the owner can confirm an activity link. Confirming creates an activityLinks
record; it does not rewrite the activity or merge accounts. New activity entered
from a customer page carries its account ID. Historical workbook activities are
references, not new tracker visits. Historical follow-ups remain unconfirmed.

## Initial workbook

The privately prepared source contains 174 accounts, 299 sales lines, 27 historical
follow-ups and 101 activity references. Source Account IDs remain unchanged. The
299 lines total $720,264.82 including credits. Seven pairs of identical source rows
are retained and flagged. Their validity requires source invoice review.

The staged JSON and backups contain private customer data and must not be placed
in this public repository. Source file SHA-256 and row identifiers travel with the
import. The import transaction creates all accounts and its receipt together.
Repeating the same source is a no-op. A conflicting account ID stops the entire
import rather than overwriting any account. There is no automatic merge.

## Security and backups

accounts, directoryImports and activityLinks use the same verified Google owner
restriction as activities. Client deletion of directory records is denied; import
receipts cannot be changed. Signed-out and other users are denied all access.
Reports > History > Back up all tracker data includes these three collections
alongside the three original collections. Old three-collection backups remain
checkable but cover only those original collections.

## Tests and boundaries

The isolated full import matched every account source field and preserved all
164 original documents. Duplicate input IDs, wrong account references and
unauthorized access were rejected. Browser tests covered import/reimport,
search, original note display, adding a contact and account-linked activity logging.

This stage does not implement weekly sales-file reconciliation, Today prioritization,
email history, attachments or calendar synchronization. Initial importing accepts
prepared JSON, not arbitrary XLSX files. Repeated lines and uncertain names require
owner review. Phone testing remains a physical-device check. Billing stays disabled.

On iPhone, refresh the tracker, open Customers, search an account and check Contacts,
Purchases and Notes. Log a clearly labelled test activity from the customer page and
confirm it appears on the computer. Download a full backup after reviewing updates.
