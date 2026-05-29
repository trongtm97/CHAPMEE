"use client";

import { useActionState } from "react";
import { Button, Card, SectionHeader, Textarea } from "@/components/ui";
import type { CheckoutSession, PaymentWebhookEvent } from "@/types/payment";
import {
  adminFailCheckoutAction,
  adminLinkWebhookToCheckoutAction,
  adminMarkCheckoutPaidAction,
  adminRetryCreditAction
} from "@/lib/admin/payments-review-actions";

const initialState = { ok: false, error: null as string | null };

function ManualActions({ checkoutSessionId }: { checkoutSessionId: string }) {
  const [markState, markAction, markPending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => adminMarkCheckoutPaidAction(formData),
    initialState
  );
  const [failState, failAction, failPending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => adminFailCheckoutAction(formData),
    initialState
  );
  const [retryState, retryAction, retryPending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => adminRetryCreditAction(formData),
    initialState
  );
  return (
    <div className="grid gap-2">
      <form action={markAction} className="space-y-2">
        <input name="checkout_session_id" type="hidden" value={checkoutSessionId} />
        <Textarea label="Admin note (manual paid)" name="admin_note" required />
        <Button loading={markPending} type="submit" variant="secondary">
          Mark paid manually
        </Button>
        {markState.error ? <p className="text-xs text-red-300">{markState.error}</p> : null}
      </form>
      <form action={failAction} className="space-y-2">
        <input name="checkout_session_id" type="hidden" value={checkoutSessionId} />
        <Textarea label="Admin note (reject/fail)" name="admin_note" required />
        <Button loading={failPending} type="submit" variant="danger">
          Reject / fail checkout
        </Button>
        {failState.error ? <p className="text-xs text-red-300">{failState.error}</p> : null}
      </form>
      <form action={retryAction}>
        <input name="checkout_session_id" type="hidden" value={checkoutSessionId} />
        <Button loading={retryPending} type="submit" variant="secondary">
          Retry credit coin
        </Button>
        {retryState.error ? <p className="text-xs text-red-300">{retryState.error}</p> : null}
      </form>
    </div>
  );
}

function LinkWebhookForm({ webhookEventId }: { webhookEventId: string }) {
  const [state, action, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => adminLinkWebhookToCheckoutAction(formData),
    initialState
  );
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <input name="webhook_event_id" type="hidden" value={webhookEventId} />
      <input
        className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white"
        name="checkout_session_id"
        placeholder="Checkout session id"
        required
      />
      <Button loading={pending} type="submit" variant="secondary">
        Link webhook
      </Button>
      {state.error ? <p className="text-xs text-red-300">{state.error}</p> : null}
    </form>
  );
}

export function PaymentDashboard({
  sessions,
  webhookEvents
}: {
  sessions: CheckoutSession[];
  webhookEvents: PaymentWebhookEvent[];
}) {
  return (
    <div className="space-y-6">
      <Card className="space-y-3">
        <SectionHeader title="Phiên thanh toán" />
        <div className="space-y-3">
          {sessions.map((session) => (
            <div className="rounded-xl border border-white/10 p-3" key={session.id}>
              <div className="grid gap-1 text-sm text-zinc-200">
                <p>{session.id}</p>
                <p>
                  {session.provider} | {session.status} | {session.gross_amount_vnd.toLocaleString("vi-VN")} VND
                </p>
                <p>Code: {session.checkout_code ?? "-"}</p>
              </div>
              <div className="mt-3">
                <ManualActions checkoutSessionId={session.id} />
              </div>
            </div>
          ))}
          {sessions.length === 0 ? <p className="text-sm text-zinc-400">Chua co checkout sessions.</p> : null}
        </div>
      </Card>

      <Card className="space-y-3">
        <SectionHeader title="Sự kiện webhook" />
        <div className="space-y-3">
          {webhookEvents.map((event) => (
            <div className="rounded-xl border border-white/10 p-3" key={event.id}>
              <div className="grid gap-1 text-sm text-zinc-200">
                <p>{event.id}</p>
                <p>
                  {event.provider} | {event.status} |{" "}
                  {event.amount_vnd != null ? `${event.amount_vnd.toLocaleString("vi-VN")} VND` : "-"}
                </p>
                <p>Transfer content: {event.transfer_content ?? "-"}</p>
                <p>Checkout linked: {event.checkout_session_id ?? "-"}</p>
              </div>
              <details className="mt-2 text-xs text-zinc-300">
                <summary>Raw payload</summary>
                <pre className="mt-2 overflow-x-auto rounded bg-zinc-900/80 p-2">
                  {JSON.stringify(event.raw_payload, null, 2)}
                </pre>
              </details>
              <div className="mt-2">
                <LinkWebhookForm webhookEventId={event.id} />
              </div>
            </div>
          ))}
          {webhookEvents.length === 0 ? <p className="text-sm text-zinc-400">Chua co webhook events.</p> : null}
        </div>
      </Card>
    </div>
  );
}
