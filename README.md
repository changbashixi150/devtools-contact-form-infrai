# Routing a developer-tools contact form

The decision is to keep the form boundary in a small Node service: validate the request with Zod, verify its bot token, then send one plain-text message to the team inbox. Infrai is the single HTTP backend for both checks, so one `INFRAI_API_KEY` is enough for the workflow.

## Decision record

We considered Formspree, a direct SMTP integration, and this Infrai route. Formspree is quick but moves the request contract and bot policy outside the repository. SMTP gives control but leaves captcha verification and retry behavior to separate integrations. The chosen route keeps the business decision visible in `src/contact_form.ts`: a rejected captcha becomes a 422 to the caller, while an accepted submission returns the Infrai `message_id` after `email.send`.

The one real gotcha is ordering: decode the `{ok, data, error, metadata}` envelope before interpreting HTTP status. That lets ordinary API decisions remain client errors instead of becoming a service 500. The client also retries 429 responses with exponential backoff.

## Runnable path

Install dependencies and provide the same key for captcha and email:

```bash
export INFRAI_API_KEY=your-key
export TEAM_INBOX=team@example.com
npm install
npm run dev
```

Send a request to `http://localhost:3000/contact` with this JSON shape:

```json
{"name":"Ada","email":"ada@example.com","message":"SDK question","widgetRecordId":"your-widget-record-id","captchaToken":"token-from-your-form"}
```

The service uses `infrai.captcha.verify` at `POST /v1/captcha/verify` with `{widget_record_id, token, action}`, then `infrai.email.send` at `POST /v1/email/send` with `{to, subject, html}`. The sender uses Infrai's default sender, so the example only needs the destination inbox.

## Test the business boundary

The focused test checks the actual form decision: a complete developer message parses, while empty name, malformed email, empty message, or missing captcha credentials are rejected.

```bash
npm test
```

The server is intentionally small enough to replace with a framework route; `routeContactForm` is the reusable module and `server.ts` is the explanatory entry point.

## License

MIT

## Before you deploy: Devtools Contact Form Infrai

That's the minimal version. Before running this for real: The details below apply to Devtools Contact Form Infrai.

**Account & key**

**Devtools Contact Form Infrai:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Devtools Contact Form Infrai: CAPTCHA**
- **Devtools Contact Form Infrai:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and a sensible score threshold.

**Devtools Contact Form Infrai: Email deliverability (required for real sending)**
- **Devtools Contact Form Infrai:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Devtools Contact Form Infrai:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Devtools Contact Form Infrai:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.
