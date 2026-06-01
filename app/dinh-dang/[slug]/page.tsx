import { defineTaxonomyLandingPage } from "@/lib/discovery/taxonomy-landing-pages";

const page = defineTaxonomyLandingPage("dinh-dang");
export const generateMetadata = page.generateMetadata;
export default page.Page;
