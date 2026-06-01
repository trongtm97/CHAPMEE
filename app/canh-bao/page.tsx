import { defineTaxonomyIndexPage } from "@/lib/discovery/taxonomy-index-pages";

export const dynamic = "force-dynamic";

const page = defineTaxonomyIndexPage("canh-bao");
export const generateMetadata = page.generateMetadata;
export default page.Page;
