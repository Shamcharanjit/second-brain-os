/** Founder admin access control */
const FOUNDER_EMAILS: string[] = [
  "shamcharan@icloud.com",
];

export function isFounderAdmin(email: string | undefined | null): boolean {
  if (!email) return false;
  return FOUNDER_EMAILS.includes(email.toLowerCase());
}
