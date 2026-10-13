# Seven Hills FTC · Team 23826

A Next.js website for the engineering portfolio of Seven Hills FIRST Tech Challenge Team 23826. Public copy is deliberately restrained: apart from the team number, school, FTC, and the supplied current season name BioBuzz, the repository does not invent team facts. Replace the clearly marked placeholders with approved team information before launch.

## Current implementation status

This is a deployable first release foundation, not yet the complete content system described in the project brief.

- Implemented: Next.js public-site structure and pages, dark/light themes, Supabase email/password sign-in with server-side approved-user roles, editor draft workflows, structured article blocks (text, lists, quotes, code, HTTPS links), live Markdown/HTML write-preview modes, auto-snapshots and admin restore history for pages, articles, mechanisms, and seasons, editable copy/sections/links for every public landing page, admin mechanism and season management, admin-only user approval controls, audit rows for content/user changes, scheduled publishing API and GitHub Actions caller, R2 signed upload/download routes, media metadata library, search for public section routes, metadata/sitemap/robots, CI validation workflow, and beginner handover documentation.
- Still incomplete: full CRUD screens for every normalized content type (seasons, robots, competitions, sponsors, team, outreach, software), content-to-media galleries, replacement/deletion safeguards and usage tracking for files, media transformations, diagram zoom, PDF preview, video embeds, database full-text filters, privacy-friendly analytics, Playwright/integration/accessibility/security suites, and a restore drill. The local page-editor migration was applied to the local Supabase database; hosted provider behavior has not been verified or changed. Do not treat provider-dependent features as configured.
- No provider accounts, domain, repository remote, school logo, approved contact channel, photos, robot details, results, sponsors, historical seasons, or approved CMS users were supplied/configured. The placeholders are not real contact details or claims.

## Architecture recommendation

Use Next.js App Router and TypeScript for server-rendered public routes, Supabase Postgres/Auth for content and email/password sign-in, and Cloudflare R2 for large documents and CAD exports. Google OAuth is not required for the current login flow. Signed R2 upload/download routes are implemented; configure provider accounts before using them. Do not put large binaries in the repository or Postgres. Keep public site content on an approved team/school account.

Provider checks performed on 12 October 2026:

- Supabase Free is useful for development, but free projects can pause after inactivity and do not include automatic backups. Supabase Pro currently starts at $25/month and includes daily backups retained for seven days. Production should budget for Pro if reliable managed backups are required. See [Supabase pricing](https://supabase.com/pricing) and [backup documentation](https://supabase.com/docs/guides/platform/backups).
- Cloudflare R2 Standard includes 10 GB-month storage, 1 million Class A operations, 10 million Class B operations, and internet egress at no charge within the monthly free tier. Beyond that, Standard storage is $0.015/GB-month and egress remains free; requests may incur charges. See [R2 pricing](https://developers.cloudflare.com/r2/pricing/).
- Vercel Hobby is for personal, non-commercial use. A school/team site should use an eligible paid/team hosting plan or another host whose terms support the intended use. Confirm the current plan and school procurement requirements before launch. See [Vercel terms](https://vercel.com/legal/terms) and [Vercel pricing](https://vercel.com/pricing).
- Use school-managed DNS if school IT can provide a team subdomain. Otherwise, register a domain under an account controlled by the team or school. No domain has been purchased or configured.
- Backups: Supabase Pro provides seven-day daily DB backups. R2 object recovery/retention is not configured in this project; decide on versioning or a separate backup copy before putting important files in production.

## Requirements

- Node.js 22.6 or newer, npm, and Docker Desktop.
- The local workflow uses Supabase CLI containers, including its local Auth, Postgres, and S3-compatible Storage services. It does not need a hosted Supabase project or Cloudflare credentials.
- Supabase email/password auth enabled (the default). Google OAuth is optional and currently not used by the login page.
- The setup script runs the Supabase CLI with `npm exec`; a global Supabase CLI install is not required.

## Run locally

```powershell
npm install
npm run local:setup
npm run dev
```

Open `http://localhost:3000`. The first setup starts a local Supabase stack, applies the migrations to its local Postgres database, creates a private `robotics` Storage bucket with local row-level policies, and provisions a test administrator. Local email/password signups are enabled only in the loopback Supabase development stack (the site has no public signup page); email confirmation is skipped for local test users. The hosted project remains configured with signups disabled. The local admin is `local-admin@localhost.test`; its generated password is in the ignored `.env.local` file under `LOCAL_ADMIN_PASSWORD`. Supabase Studio is at `http://127.0.0.1:54323` and local email testing is at `http://127.0.0.1:54324`. The setup preserves any existing provider environment in the ignored `.env.production.private` file before replacing `.env.local` with loopback-only credentials. No local setup command links or changes the hosted project.

Run `npm run local:setup` again to start local services and refresh the local admin password. Run `npm run local:storage` or `npm run local:admin` to reinitialize only that local component. Run `npm run local:storage:check` to verify authenticated S3 upload, download, and cleanup against local Supabase Storage. Stop the local stack with `npm exec --yes --package=supabase@2.120.0 -- supabase stop`.

Check the project:

```powershell
npm run lint
npm run typecheck
npm run build
```

`npm test` runs Node test-runner checks for season seed integrity, search filtering, empty-query behavior, and role permissions. They do not exercise Supabase Auth, CMS authorization, content publishing, accessibility, uploads, or browser workflows. A production acceptance plan still needs integration, end-to-end, accessibility, security, and database migration tests.

## Database setup and first administrator

1. Create a Supabase project owned by an appropriate school/team-controlled account.
2. Install/login to the Supabase CLI and link this project: `supabase login` then `supabase link --project-ref YOUR_PROJECT_REF`.
3. Apply committed migrations: `supabase db push`. The initial migration creates the normalized content tables and seeds only the supplied current season name, BioBuzz. It intentionally leaves dates and all robot/result/award information empty.
4. In **Authentication → Sign In / Providers**, keep Email enabled and **Confirm email** on, and turn **Allow new users to sign up** off so accounts are added by an administrator. In **Authentication → URL Configuration**, set Site URL to `http://localhost:3000` for local development and allow `http://localhost:3000/auth/callback`. Add the production callback after deployment. Google OAuth is not used.
5. In **Authentication → Users**, create/invite the intended first administrator. Set or deliver the password through Supabase's user flow; do not commit it or send it through this repository.
6. In the Supabase SQL editor, replace the UUID and email below with values verified in **Authentication → Users**, then run this SQL as the project owner:

```sql
insert into public.cms_users (id, email, role, active)
values ('AUTH_USER_UUID', 'approved-admin@example.edu', 'admin', true)
on conflict (id) do update set email = excluded.email, role = 'admin', active = true;
```

7. Sign in at `/admin/login` with that email and password. Never expose a public endpoint or browser-side UI that promotes users. The app checks both Supabase identity and the server-side `cms_users` allowlist. The publishable key is intended for browser-visible configuration and is safe only because row-level security protects data; never put a Supabase secret key in `NEXT_PUBLIC_*` or in this repository.

After the first admin is approved, visit `/admin/users`. Create/invite each person in Supabase Auth first, then enter their Auth user UUID and verified email, select editor/admin, and save. The UI prevents self-demotion/deactivation and prevents removing the last active admin. Row-level security still restricts allowlist writes to admins.

## Content model

`supabase/migrations/202610120001_initial_schema.sql` defines seasons, robots, mechanisms, engineering projects, software documents, team members and season memberships, competitions and results, sponsors and season links, outreach, reusable media metadata/relationships, CMS users, basic news/journal/project entries, revisions, audit logs, and settings. Foreign keys use `restrict` for historical records so deleting a season cannot silently remove its history. A partial unique index allows one current season. Public news/journal queries use a published-only view and RLS policy.

The admin screen creates news, journal, and project entries. Supported blocks are heading, paragraph, list, quote, code, and safe links. Editors can change drafts only; admins may publish immediately, schedule, restore revisions, or archive content. Public news, journal, and project detail pages render validated text blocks. While signed in as an admin, the public site shows an **Edit this page** control that opens the relevant editor. Admins can edit public page titles, introductions, page metadata, and a Markdown page body. The renderer supports common Markdown formatting and safe HTTPS/site links; HTML is rendered as text, not executed. Page updates publish immediately and prior values are preserved in `site_page_revisions`. Admins can edit existing mechanism records at `/admin/mechanisms`; article detail pages use the existing entry editor. Remaining normalized types still do not have full create/edit/archive workflows.

## Authentication and security notes

- Email/password sign-in and session cookies are managed by Supabase Auth through `@supabase/ssr`; approved CMS access is a separate server-side allowlist check.
- `getCmsUser()` validates the current user against `cms_users` on the server. UI visibility is not used as the security boundary.
- RLS is enabled on the content tables. The allowlist management table has an admin-only policy. Published news and journal records have a narrow public-read policy.
- `proxy.ts` refreshes Supabase sessions using the current Next.js proxy convention. Never use a service-role key in public code.
- Security headers, safe callback redirect handling, Zod validation, slug validation, and database uniqueness constraints are included.
- Before launch: review RLS with a security-minded reviewer; add rate limiting, CSRF/security review for every write route, test provider authorization and signed URLs, configure secret scanning, and review the privacy treatment of student media.

## Media and documents

The media library validates file extension/MIME and a 100 MB limit, issues short-lived signed R2 PUT URLs, stores metadata in Postgres, defaults assets to private, and issues authorized signed downloads. Public assets are delivered through short-lived signed URLs while the bucket remains private; `R2_PUBLIC_BASE_URL` is optional for custom-domain delivery. Editors cannot make an asset public. Configure bucket CORS to allow only the local origin and selected production/preview origins, PUT/GET/HEAD methods, and the `Content-Type` request header. Example allowed origins: `http://localhost:3000` and the exact production HTTPS origin. Do not use `*` for origins. Real uploads and signed access should be verified against the production R2 bucket. Object replacement/deletion and content usage tracking are not implemented. Do not upload student photos until consent and publishing approval are confirmed.

## Publishing, scheduled posts, revisions, and backups

The admin can schedule an entry using a UTC date/time. `.github/workflows/publish-scheduled.yml` calls `/api/cron/publish` every five minutes (GitHub scheduling is best-effort and can be delayed). Configure a GitHub repository variable `PUBLISH_JOB_URL` to the site origin, a GitHub secret `CRON_SECRET`, and the same `CRON_SECRET` plus Supabase's server-only `SUPABASE_SECRET_KEY` in the hosting environment. The API compares the bearer secret in constant time and uses the server-only secret key to publish due entries. Never expose this key to the browser. Revision histories cover static pages, news/journal/projects, mechanisms, and seasons. Restores create a new snapshot of the current content first. Apply all Supabase migrations, including `202610130006_cms_revision_history.sql`, before using the expanded history features.

For production, select Supabase Pro or a provider with equivalent backups. Confirm daily backup completion in the dashboard. Practice restoring a backup into a separate project before launch. Export media separately because database backups do not contain R2 objects. Define an accountable adult/team owner to verify recoverability each season.

## Vercel deployment

Vercel detects this Next.js application automatically. Use Node.js 22 (the project `.nvmrc` and `package.json` engine are aligned); leave the root directory, install command (`npm install`/`npm ci`), build command (`npm run build`), and output directory at their Next.js defaults. No `vercel.json` overrides are needed.

The current local repository has no commits or Git remote, and Vercel CLI is not installed or authenticated on the development machine. To connect hosting, create a private GitHub repository owned by the team or school, push the reviewed source, then import that repository in Vercel. Set `main` as the Production Branch. Vercel creates Preview deployments for other branches and pull requests. Keep credentials in Vercel Environment Variables, never in Git or a `NEXT_PUBLIC_*` variable unless explicitly intended to be browser-visible.

Add these Vercel environment variables:

| Variable | Environments | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Preview, Production | Hosted Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Preview, Production | Supabase publishable key; browser-visible by design |
| `NEXT_PUBLIC_SITE_URL` | Production only | Final HTTPS origin, e.g. `https://team-domain.example`; Preview URLs are derived from Vercel automatically |
| `R2_ACCOUNT_ID` | Production | Cloudflare account identifier |
| `R2_ACCESS_KEY_ID` | Production | R2 access key ID with least privilege for the `robotics` bucket |
| `R2_SECRET_ACCESS_KEY` | Production | Matching R2 secret access key |
| `R2_BUCKET` | Production | `robotics` |
| `R2_REGION` | Production | `auto` |
| `R2_PUBLIC_BASE_URL` | Optional, Production | Optional R2 custom domain for public media delivery; signed delivery works without it |
| `SUPABASE_SECRET_KEY` | Production only | Required only for scheduled publishing; server-side secret key |
| `CRON_SECRET` | Production only | Required only for scheduled publishing; use a long random secret |

For Cloudflare R2, do not set `R2_ENDPOINT` in Vercel; the app constructs the Cloudflare endpoint from `R2_ACCOUNT_ID`. The local Supabase Storage endpoint belongs only in `.env.local`. Preview media is intentionally disabled until an isolated preview bucket and credentials are provisioned. Keep R2 bucket CORS restricted to the exact Production site origin; do not use `*`.

Before the first production deployment:

1. Create/confirm the hosted Supabase project under a durable team or school account. Review all four SQL migrations, apply them to a staging project, and verify policies and data before applying them to production with `supabase db push`.
2. Set up the first production admin using the **Database setup and first administrator** instructions above. Keep public signups disabled.
3. In Supabase **Authentication → URL Configuration**, set the Site URL to the final HTTPS domain and add `https://<production-domain>/auth/callback` to Redirect URLs. Add the exact Vercel Preview callback pattern only if previews need sign-in; otherwise keep admin auth production-only.
4. Add the environment variables above, deploy a Preview, and verify sign-in, page editing, media upload/download, redirects, sitemap, and mobile layout before promoting to Production.
5. Assign the custom domain in Vercel and use only the DNS records Vercel displays. If using school DNS, coordinate its CNAME/ALIAS and any requested TXT verification with school IT. Set `NEXT_PUBLIC_SITE_URL` to that final HTTPS origin and redeploy.

Scheduled content currently uses `.github/workflows/publish-scheduled.yml` every five minutes. Keep `PUBLISH_JOB_URL` as a GitHub repository variable and `CRON_SECRET` as a GitHub Actions secret (same secret value as Vercel). Vercel Hobby cron schedules are limited to once per day, so a five-minute Vercel cron would fail deployment; use the GitHub workflow unless the hosting plan and desired interval change. Configure GitHub Actions with `SUPABASE_SECRET_KEY` only in Vercel, where the route uses it server-side.

The existing `.github/workflows/ci.yml` runs lint, typecheck, tests, and production build on pull requests and pushes to `main`. Recommended flow: branch → Preview → review → merge to `main` → Production. A custom domain, GitHub remote, Vercel project, and production deployment are not yet connected.

## SEO, accessibility, privacy

Page titles/descriptions, Open Graph defaults, sitemap, robots, semantic layout, visible focus styles, keyboard menu, contrast-aware themes, responsive layouts, and reduced-motion settings are included. Replace the local URL defaults with the production URL at deploy time. Search currently indexes a small static list of public section routes; published CMS full-text search is not implemented. No analytics provider is configured and no contact form exists. Review embedded media and add a privacy disclosure before introducing third-party analytics or embeds. Perform manual keyboard, screen-reader, mobile, contrast, and reduced-motion reviews before launch.

## Ownership and handover checklist

Keep a team-controlled inventory in a secure school/team vault (never commit credentials):

| Service | Owner/account | Recovery contact | Notes |
|---|---|---|---|
| GitHub repository | Team/school-controlled org | Faculty mentor | Protect production branch |
| Hosting | Team/school-controlled account | Faculty mentor | Plan must support school use |
| Supabase | Team/school-controlled org | Faculty mentor | Pro backup retention currently 7 days |
| Cloudflare/R2 | Team/school-controlled account | Faculty mentor | Bucket policy and object backup plan |
| Domain/DNS | School IT or team owner | Faculty mentor | Renewals and DNS records |
| Supabase Auth | School/team-controlled Supabase project | Faculty mentor | Require strong passwords and enable email confirmation |

At each leadership handover, transfer at least two trusted adult owners, rotate departing student access, verify billing contacts and recovery factors, test a database restore, check object access, and document the deployment URL.

## Launch checklist: information still needed

- [ ] Official team logo and usage guidance.
- [ ] Approved team introduction and school wording.
- [ ] Current BioBuzz robot name/details, photos, CAD renders, mechanisms, software, tests, and technical documents.
- [ ] Confirmed historical season names and season-specific documentation.
- [ ] Competition dates, event links, verified results, rankings, and awards.
- [ ] Approved student/mentor display names, roles, and photographs; student/photo permissions.
- [ ] Confirmed sponsors, logos, descriptions, and logo permissions.
- [ ] Outreach entries with approved descriptions, photos, and verified outcomes.
- [ ] Public team contact channel and official social accounts.
- [ ] School subdomain decision or team-owned domain.
- [ ] Team/school-owned GitHub, hosting, Supabase, and storage accounts.
- [ ] Approved CMS admins/editors and adult account owner.
- [ ] Analytics decision and privacy disclosure, if analytics are desired.
- [ ] Backup/restore test and complete accessibility/security acceptance review.

## Known costs and limitations

For a dependable production start, budget at least the current Supabase Pro subscription ($25/month) if using its managed daily backups. R2 may remain within the published free allowance for a small archive, but verify usage and future limits. Hosting cost depends on the provider and school/team eligibility; Vercel Hobby terms do not fit commercial use, and this project has no deployment configured. Domain registration cost depends on the selected name/registrar. No recurring service is actually provisioned by this repository.


## Current hosting setup (13 October 2026)

- GitHub repository `Boymeash29/FTCweb` is connected to Vercel project `buzzerbots-ftc`; `main` is the production branch.
- The Vercel origin is `https://buzzerbots-ftc.vercel.app`. Production environment variables are configured in Vercel, and Supabase Auth's Site URL and `/auth/callback` allowlist use this origin.
- R2 credentials are production-only. The local R2 endpoint is not set in Vercel. Restrict R2 bucket CORS to the exact production origin before testing browser uploads.
- Verify the initial production build and sign-in before treating the deployment as launch-ready.
