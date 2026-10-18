# Email registration setup (T8)

Use dedicated DEV project `qorlygdcfwnrrzvzulcz` only. Registration code and local checks are ready. The hosted Auth settings and real-email flow below remain unverified: the connected MCP exposes no Auth-configuration tool, and the shell cannot reach Supabase Auth/Management HTTP. The HTML file is not deployed by a database migration.

## Configure the dashboard

1. Open [DEV URL configuration](https://supabase.com/dashboard/project/qorlygdcfwnrrzvzulcz/auth/url-configuration). Set the Site URL to `http://localhost:3001` and allow `http://localhost:3001/auth/callback`. Keep any existing valid redirect entries. Add the exact production callback separately when its origin is known; do not use a wildcard in production.
2. In [DEV sign-in providers](https://supabase.com/dashboard/project/qorlygdcfwnrrzvzulcz/auth/providers), keep Email signup enabled and **Confirm email ON**. Set the minimum password length to at least **8**, preserving any stronger existing requirements.
3. Open [DEV email templates](https://supabase.com/dashboard/project/qorlygdcfwnrrzvzulcz/auth/templates), select **Confirm signup**, and use subject `Confirm your DevArena email`. Paste the complete contents of [confirmation.html](../supabase/templates/confirmation.html) into the body and save.

The form passes an absolute `/auth/callback` URL as `emailRedirectTo`. The template uses that allowed destination and `TokenHash`:

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=email">Confirm email address</a>
```

`/auth/callback` verifies the hash with `verifyOtp`, persists the SSR session cookies and redirects home. Supabase's [template variables](https://supabase.com/docs/guides/auth/auth-email-templates) and [redirect allow-list](https://supabase.com/docs/guides/auth/redirect-urls) document this configuration. Apply the template before testing; clicking a legacy email does not test the new template. Default SMTP may restrict recipient addresses; use an allowed test inbox or configure the project's mail provider if delivery is rejected.

## Verify real registration

- [ ] Visit `http://localhost:3001/register` while signed out. Submit a new accessible email, a password of at least eight characters and an available username. The leaderboard checkbox starts checked.
- [ ] The page shows **Check your inbox**. No password or token appears in the URL or application storage.
- [ ] Open the newly delivered confirmation link. It must target `http://localhost:3001/auth/callback?token_hash=…&type=email`, establish `sb-*` cookies and land on `/` signed in.
- [ ] In the DEV SQL editor, verify the resulting profile, substituting the test email:

```sql
select username, visibility, role
from public.profiles
where lower(email) = lower('replace-with-your-test-email');
```

Expect the chosen username, `public`, and `developer`. The database, rather than client metadata, chooses the role.

- [ ] Sign out. Register a second accessible email with the same username and the leaderboard checkbox unchecked. Confirm it, then run the query for the second email. Expect a distinct username (normally suffixed), `private`, and `developer`; a taken username must not abort signup.
- [ ] Invalid usernames (fewer than three/more than 24 characters, spaces, hyphens or non-ASCII characters) are blocked before Auth. The form and helper enforce the same allowed characters as the database. The database remains the final validator.
- [ ] Existing-account responses remain neutral. Network/provider failures show a recoverable error and re-enable the form. Keyboard focus moves to the inbox heading after success; labels, descriptions and focus indicators remain usable on mobile and desktop.

## Repeat local checks

```powershell
Set-Location D:\5SIM4\PWA\app\DEVARENA\nextjs
npm.cmd run test:auth
npm.cmd run lint
npm.cmd run build
npx.cmd tsc --noEmit
```

The dependency-free tests use Node 22.17+ and fake only the Auth SDK. They exercise the real registration helper, validation, exact signup payload, visibility, callback destination, provider failures and session/no-session responses. They do not prove email delivery or hosted configuration.

With a built frontend running on 3101 in another terminal:

```powershell
node node_modules/next/dist/bin/next start -p 3101
```

```powershell
node scripts/check-register-http.mjs
node scripts/check-login-http.mjs
```

The registration checker verifies the rendered labels, constraints, default visibility and the template's callback URL. The login checker keeps T6's existing redirect/callback assertions covered. T9 OAuth and T10 password recovery are separate tasks.
