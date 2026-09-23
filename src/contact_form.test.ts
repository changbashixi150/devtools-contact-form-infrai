import assert from "node:assert/strict";
import { contactForm } from "./contact_form.js";

const parsed = contactForm.safeParse({ name: "Ada", email: "ada@example.com", message: "SDK question", widgetRecordId: "widget-id", captchaToken: "token" });
assert.equal(parsed.success, true);
assert.equal(contactForm.safeParse({ name: "Ada", email: "ada@example.com", message: "SDK question", captchaToken: "token" }).success, false);
assert.equal(contactForm.safeParse({ name: "", email: "bad", message: "", captchaToken: "" }).success, false);
console.log("contact form boundary: valid input is accepted, malformed input is rejected");
