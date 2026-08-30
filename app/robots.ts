import type { MetadataRoute } from "next";
import { buildRobotsConfigFromSettings } from "@/lib/seo/robots-service";

export default async function robots(): Promise<MetadataRoute.Robots> {
  return buildRobotsConfigFromSettings();
}
