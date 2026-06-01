import { defineTaxonomyLandingPage } from "@/lib/discovery/taxonomy-landing-pages";

const page = defineTaxonomyLandingPage("nhan-vat");
export const generateMetadata = page.generateMetadata;
export default page.Page;
