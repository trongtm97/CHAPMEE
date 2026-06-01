import { defineTaxonomyLandingPage } from "@/lib/discovery/taxonomy-landing-pages";

const page = defineTaxonomyLandingPage("quan-he");
export const generateMetadata = page.generateMetadata;
export default page.Page;
