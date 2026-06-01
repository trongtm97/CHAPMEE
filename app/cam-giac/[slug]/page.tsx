import { defineTaxonomyLandingPage } from "@/lib/discovery/taxonomy-landing-pages";

const page = defineTaxonomyLandingPage("cam-giac");
export const generateMetadata = page.generateMetadata;
export default page.Page;
