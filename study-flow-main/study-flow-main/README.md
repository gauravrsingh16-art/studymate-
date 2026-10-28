# StudyFlow

## Supabase setup

1. Create or open the Supabase project and copy its Project URL and publishable key (or legacy `anon` key).
2. Copy `.env.example` to the project root `.env` if needed. Preserve existing values and set:

   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
   ```

3. Install dependencies and start the frontend:

   ```sh
   npm install
   npm run dev
   ```

Only Supabase's publishable/anon key belongs in the browser app. Never put a service-role/secret key or Gemini key in a `VITE_` variable.

## StudyMate AI

StudyMate calls the authenticated `studymate-chat` Supabase Edge Function. The function verifies the user's JWT at the Supabase gateway, keeps chat history in the current browser session, and calls Google's Gemini `generateContent` API from the server. The client expects `{ reply: string }`; errors use `{ error: { code, message } }`.

Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/apikey). The checked-in template is `supabase/functions/.env.example`; copy it to `supabase/functions/.env` and set the real secret there for local Edge Function development:

```env
GEMINI_API_KEY=your-google-ai-studio-api-key
GEMINI_MODEL=gemini-3.8-flash
```

The function reads these with `Deno.env.get`. `supabase/functions/.env` is ignored by Git. Never put the Gemini key in the root browser `.env`, frontend source, or a `VITE_` variable.

### Run the Edge Function locally

Install the [Supabase CLI](https://supabase.com/docs/guides/cli) and Docker Desktop. In a terminal from the project root:

```sh
supabase start
```

Get the local API URL and publishable/anon key from `supabase status`. For the Vite app, create or update the ignored root `.env.local` to use the local Supabase stack:

```env
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=your-local-publishable-or-anon-key
```

Use a local Supabase Auth account when testing against the local stack. In a second terminal, serve the function with its local Gemini secret:

```sh
supabase functions serve studymate-chat --env-file supabase/functions/.env
```

In a third terminal, run `npm run dev`, sign in to the local app, and ask StudyMate an academic question. Restart the function serve process after changing its `.env` file.

### Deploy to Supabase

Link the existing project, then set the function secrets from the ignored environment file:

```sh
supabase link --project-ref kkhfxewwcpezpljfmley
supabase secrets set --env-file supabase/functions/.env --project-ref kkhfxewwcpezpljfmley
supabase functions deploy studymate-chat --project-ref kkhfxewwcpezpljfmley
```

You can also set `GEMINI_API_KEY` under **Project Settings → Edge Functions → Secrets** in the Supabase Dashboard. The deployed function reads the secret without a redeploy after a secret-only change. Keep `verify_jwt = true` for this user-facing function.

The default model is `gemini-3.8-flash`; Google currently lists it as a stable model with standard free-tier token pricing. Free-tier access and quota can depend on the Google project, so confirm availability in AI Studio for your key.

## Verify

After configuration, sign in and send “Explain DBMS in simple words.” A successful function response contains a non-empty `reply`, which should appear as an assistant message. If Gemini rejects the key, model, or quota, the function returns a JSON error code and safe message; its logs record the stage and HTTP status without logging the key or conversation.
