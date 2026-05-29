const PENDING_TEMPLATE_KEY = "chapmee-studio-pending-template";

export function setPendingTemplateInsert(templateId: string) {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(PENDING_TEMPLATE_KEY, templateId);
}

export function consumePendingTemplateInsert() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = sessionStorage.getItem(PENDING_TEMPLATE_KEY);

  if (value) {
    sessionStorage.removeItem(PENDING_TEMPLATE_KEY);
  }

  return value;
}
