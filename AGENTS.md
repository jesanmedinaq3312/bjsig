<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

- Application diagnostics use the shared logger and its bounded sanitizer, with child scopes for subsystem context; this keeps browser/Worker logs searchable without emitting raw credentials or request payloads.

- Preserve HTTP 429 retry metadata with the shared rate-limit error so worker authentication can pause submissions without weakening server-side protection.
- Do not add or reintroduce Turnstile/CAPTCHA in worker or administrator authentication. Preserve server-side IP/account rate limits, generic recovery responses, password policy, session/MFA checks and RLS; client guards never replace these controls.
- Gate all activity-log requests, including unload requests, on the current token's AAL2 claim and on no prior server MFA_REQUIRED rejection of that same token; keep MFA_REQUIRED separate from permission denial; this avoids repeated pre-MFA requests and permanent audit shutdown while leaving server verification authoritative.
- Keep dynamic-SQL cross-tenant catalog reads restricted to `service_role` and invoke them only via authenticated server functions that verify non-anonymous platform-owner status and AAL2 MFA before using `supabaseAdmin`; this prevents client-side execution of privileged dynamic SQL while preserving multi-tenant governance counts.
