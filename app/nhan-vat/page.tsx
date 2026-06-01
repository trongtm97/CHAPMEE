import { defineTaxonomyIndexPage } from "@/lib/discovery/taxonomy-index-pages";

export const dynamic = "force-dynamic";

const page = defineTaxonomyIndexPage("nhan-vat");
export const generateMetadata = page.generateMetadata;
export default page.Page;
