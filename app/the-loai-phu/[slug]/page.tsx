import { defineTaxonomyLandingPage } from "@/lib/discovery/taxonomy-landing-pages";

export const dynamic = "force-dynamic";

const page = defineTaxonomyLandingPage("the-loai-phu");
export const generateMetadata = page.generateMetadata;
export default page.Page;
