import { defineTaxonomyLandingPage } from "@/lib/discovery/taxonomy-landing-pages";

const page = defineTaxonomyLandingPage("goi-truy-cap");
export const generateMetadata = page.generateMetadata;
export default page.Page;
