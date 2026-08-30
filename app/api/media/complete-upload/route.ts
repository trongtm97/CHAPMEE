import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth/get-session-user";

import { completeMediaAsset } from "@/lib/storage/media";

import { getMediaUrlFromObjectKey } from "@/lib/storage/s3";



export async function POST(request: Request) {

  const user = await getSessionUser();

  if (!user) {

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  }



  const body = (await request.json()) as {

    mediaAssetId?: string;

    assetId?: string;

    objectKey?: string;

    width?: number;

    height?: number;

    sizeBytes?: number;

    alt?: string;

  };



  const assetId = body.mediaAssetId ?? body.assetId;

  if (!assetId) {

    return NextResponse.json({ error: "mediaAssetId required" }, { status: 400 });

  }



  try {

    const asset = await completeMediaAsset({

      assetId,

      ownerProfileId: user.id,

      objectKey: body.objectKey,

      width: body.width,

      height: body.height,

      sizeBytes: body.sizeBytes

    });



    return NextResponse.json({

      mediaAsset: asset,

      asset,

      resolvedUrl: getMediaUrlFromObjectKey(asset.storage_path),

      publicUrl: getMediaUrlFromObjectKey(asset.storage_path)

    });

  } catch (error) {

    const message = error instanceof Error ? error.message : "Complete failed";

    return NextResponse.json({ error: message }, { status: 400 });

  }

}


