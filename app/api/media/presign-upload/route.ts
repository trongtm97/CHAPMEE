import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/get-session-user";

import { createPresignedUploadUrl, getS3Bucket } from "@/lib/storage/s3";

import { createPendingMediaAsset } from "@/lib/storage/media";

import type { MediaUploadPurpose } from "@/lib/storage/media-paths";



const PURPOSES: MediaUploadPurpose[] = [

  "avatar",

  "story_cover",

  "chapter_image",

  "composer_image",

  "reel_background",

  "seo_og",

  "temp"

];



function isPurpose(value: string): value is MediaUploadPurpose {

  return (PURPOSES as readonly string[]).includes(value);

}



export async function POST(request: Request) {

  const user = await getSessionUser();

  if (!user) {

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  }



  const body = (await request.json()) as {

    filename?: string;

    contentType?: string;

    sizeBytes?: number;

    purpose?: string;

    linkedEntityType?: string;

    linkedEntityId?: string;

    folder?: string;

  };



  const filename = body.filename ?? "";

  const contentType = body.contentType ?? "";

  const purposeRaw = body.purpose ?? body.folder ?? "";



  if (!isPurpose(purposeRaw) || !filename || !contentType) {

    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  }



  try {

    const { asset, objectKey, bucket } = await createPendingMediaAsset({

      ownerProfileId: user.id,

      purpose: purposeRaw,

      filename,

      mimeType: contentType,

      sizeBytes: body.sizeBytes,

      linkedEntityType: body.linkedEntityType ?? null,

      linkedEntityId: body.linkedEntityId ?? null,

      bucket: getS3Bucket()

    });



    const uploadUrl = await createPresignedUploadUrl({

      objectKey,

      contentType

    });



    return NextResponse.json({

      mediaAssetId: asset.id,

      assetId: asset.id,

      objectKey,

      bucket,

      uploadUrl

    });

  } catch (error) {

    const message = error instanceof Error ? error.message : "Presign failed";

    return NextResponse.json({ error: message }, { status: 400 });

  }

}


