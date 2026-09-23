import { z } from "zod";
import { InfraiError, infrai } from "./infrai.js";

export const contactForm = z.object({ name: z.string().min(1), email: z.string().email(), message: z.string().min(1), widgetRecordId: z.string().min(1), captchaToken: z.string().min(1) });
export type ContactForm = z.infer<typeof contactForm>;

export async function routeContactForm(input: unknown, teamInbox: string) {
  const form = contactForm.parse(input);
  try {
    await infrai.captcha.verify({ widget_record_id: form.widgetRecordId, token: form.captchaToken, action: "developer_contact" });
  } catch (error) {
    if (error instanceof InfraiError && error.status >= 400 && error.status < 500) return { accepted: false as const, status: 422, reason: "captcha_rejected" };
    throw error;
  }
  const email = await infrai.email.send({ to: teamInbox, subject: `[Developer tools] ${form.name}`, html: `<p>From: ${form.email}</p><p>${form.message}</p>` });
  return { accepted: true as const, messageId: email.message_id };
}
