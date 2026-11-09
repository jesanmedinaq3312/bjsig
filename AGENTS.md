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

- Preserve HTTP 429 retry metadata with the shared rate-limit error so worker authentication can pause submissions without weakening server-side protection.
- Do not add or reintroduce Turnstile/CAPTCHA in worker or administrator authentication. Preserve server-side IP/account rate limits, generic recovery responses, password policy, session/MFA checks and RLS; client guards never replace these controls.
- Gate all activity-log requests, including unload requests, on the current token's AAL2 claim and on no prior server MFA_REQUIRED rejection of that same token; keep MFA_REQUIRED separate from permission denial; this avoids repeated pre-MFA requests and permanent audit shutdown while leaving server verification authoritative.
