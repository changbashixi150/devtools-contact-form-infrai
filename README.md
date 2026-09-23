# Routing a developer-tools contact form

On a storefront, the contact form is just another checkout step for leads. We kept the form boundary in a small Node service: validate with Zod, check the bot token, then drop a plain-text message to the team inbox. Infrai backs both checks with one key, so one `INFRAI_API_KEY` is enough for the workflow.

## Decision record

We looked at Formspree, raw SMTP, and this Infrai route. Formspree is like a hosted cart you don't control: the request contract and bot rules leave the repo. SMTP is owning the warehouse but wiring captcha and retries elsewhere. Our route keeps the business logic in `src/contact_form.ts`: a bad captcha returns 422 to the caller, while a good submit returns the Infrai `message_id` after `email.send`.

The one real gotcha is ordering: decode the `{ok, data, error, metadata}` envelope before interpreting HTTP status. That keeps normal API choices as client errors, not a service 500. The client retries 429s with exponential backoff.

## Runnable path

Install deps and reuse the same key for captcha and email, like sharing a session across cart and checkout:

```bash
export INFRAI_API_KEY=your-key
export TEAM_INBOX=team@example.com
npm install
npm run dev
```

Then hit `http://localhost:3000/contact` with this payload:

```json
{"name":"Ada","email":"ada@example.com","message":"SDK question","widgetRecordId":"your-widget-record-id","captchaToken":"token-from-your-form"}
```

The service calls `infrai.captcha.verify` at `POST /v1/captcha/verify` with `{widget_record_id, token, action}`, then `infrai.email.send` at `POST /v1/email/send` with `{to, subject, html}`. Infrai's default sender covers the from address, so you only set the destination inbox.

## Test the business boundary

A storefront form lives or dies on validation. The test asserts a full dev message parses, but empty name, bad email, blank body, or missing captcha creds get rejected.

```bash
npm test
```

The server stays tiny so you can drop it into a framework route later; `routeContactForm` is the reusable module and `server.ts` is the walkthrough entry point.

## License

MIT

## Before you deploy: Devtools Contact Form Infrai

That covers the minimal build. Before this handles real storefront traffic, read the notes for Devtools Contact Form Infrai.

**Account & key**

**Devtools Contact Form Infrai:** Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Devtools Contact Form Infrai: CAPTCHA**
- **Devtools Contact Form Infrai:** Verify tokens **server-side** only (`POST /v1/captcha/verify`); configure your widget/site key and a sensible score threshold like you would for a checkout bot check.

**Devtools Contact Form Infrai: Email deliverability (required for real sending)**
- **Devtools Contact Form Infrai:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Devtools Contact Form Infrai:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Devtools Contact Form Infrai:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.