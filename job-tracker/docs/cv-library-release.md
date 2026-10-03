# CV library release status

Implemented on `codex/cv-library-interface`, based on the pending production save repair.

- CV editor uses the current white cards, brand typography and rectangular controls throughout all nested fields.
- Add and CV forms share the centered 768px width; the header reserves scrollbar space.
- Named templates support blank creation, independent copies, rename, resume import and confirmed deletion with required reassignment.
- Saved jobs use current templates for future matching/tailoring. Existing tailored drafts remain available. Submitted jobs use their stored document snapshot; missing history is explicit.
- Cloud deletion is an authenticated, owner-scoped transaction. Local deletion uses a recovery journal. Stale library saves and invalid Saved/search references are rejected.

## Database

`supabase/migrations/202610030002_cv_library.sql` was applied to production project `zwqxfrqzshlwrpxjtzwc` on 2026-10-03. `supabase/verify_cv_library.sql` passed with disposable fixtures and a rollback: custom IDs, replacement requirements, stale/last-template guards, ownership isolation, historical document preservation and stale-reference rejection. No real application records were changed by these checks.

## Validation

- Production build passed.
- Eight Node tests passed, including legacy migration, matching across all templates, alias/requirement preservation, local rollback/recovery and submitted snapshot preservation.
- Local browser checks passed for copy/create, rename, imported resume structure and attachment, draft save on switching, nested field saves/reload, dynamic Add/search choices and deletion replacement controls.
- Desktop navigation position stayed identical across Board, Inbox, Portals, Add and CVs. Add/CV widths measured 768px. Mobile CV and long-name layouts had no horizontal overflow.
- Full lint retains five pre-existing errors in `useJobs`, `applyStreak`, `huntStreak`, `docxExport` and `matchScore`.

## Performance and delete controls

- All CV removal actions share a 32px trash-can button with an accessible name and tooltip, including templates, skill groups and the confirmation dialog.
- Matching no longer repeats alias expansion and CV keyword preparation for every job. The same 100-job/two-template Node benchmark improved from 4,231ms to about 11ms using the prepared matcher; results remained identical. Six additional matching scenarios were compared with the previous implementation.
- Inbox matching is cached per job text and CV contents. Switching the active template does not rescore unchanged jobs; renaming reuses scores while refreshing labels.
- Switching an edited CV saves its draft and selection in one write. Cloud conflict checks use the small `updated_at` revision instead of placing the full CV library in the request URL; revisions strictly advance.
- Word import and application-detail/export code load when needed. The initial production JavaScript bundle decreased from approximately 1,433KB to 543KB (before compression).
- Isolated browser checks with 100 synthetic inbox jobs confirmed fast template/page switching, draft preservation, shared delete-button dimensions, and successful application-detail loading. These local measurements do not replace signed-in production testing.

## Remaining release work

This frontend has not been pushed, merged or deployed. Authenticated browser testing of the new frontend against Supabase remains pending; database transaction checks and local browser testing are complete. After frontend deployment, verify real signed-in CV save/import/delete and job approval using disposable account fixtures. Existing application documents must remain intact.
