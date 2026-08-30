import { NextRequest, NextResponse } from "next/server";
import { getCurrentAuthContext } from "@/lib/auth/permissions";
import { createClient } from "@/lib/data/server";
import { VERIFICATION_STORAGE_BUCKET } from "@/lib/verification/config";
import { logVerificationAudit } from "@/lib/verification/log-verification-audit";

const SIGNED_URL_TTL = 120;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;

    const ctx = await getCurrentAuthContext();
    if (!ctx?.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = await createClient();

    const { data: doc } = await db
      .from("account_verification_documents")
      .select("id, file_path, user_id, request_id, mime_type")
      .eq("id", documentId)
      .eq("status", "uploaded")
      .maybeSingle();

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const isOwner = doc.user_id === ctx.userId;
    const isAdmin = ctx.permissions?.some(
      (p: string) => p === "admin.user.view" || p === "admin.user.update"
    );

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { data, error } = await db.storage
      .from(VERIFICATION_STORAGE_BUCKET)
      .createSignedUrl(doc.file_path, SIGNED_URL_TTL);

    if (error || !data?.signedUrl) {
      return NextResponse.json({ error: "Cannot generate view URL" }, { status: 500 });
    }

    await logVerificationAudit({
      action: "verification_document_viewed",
      actorId: ctx.userId,
      actorRole: isAdmin ? "admin" : "user",
      metadata: { document_id: documentId, method: "api_redirect" },
      requestId: doc.request_id,
      userId: doc.user_id
    });

    const response = NextResponse.redirect(data.signedUrl);

    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    response.headers.set("X-Robots-Tag", "noindex, nofollow");

    return response;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
