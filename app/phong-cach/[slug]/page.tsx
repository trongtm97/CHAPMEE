import { defineTaxonomyLandingPage } from "@/lib/discovery/taxonomy-landing-pages";

const page = defineTaxonomyLandingPage("phong-cach");
export const generateMetadata = page.generateMetadata;
export default page.Page;
