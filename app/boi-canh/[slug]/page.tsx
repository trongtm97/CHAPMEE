import { defineTaxonomyLandingPage } from "@/lib/discovery/taxonomy-landing-pages";

const page = defineTaxonomyLandingPage("boi-canh");
export const generateMetadata = page.generateMetadata;
export default page.Page;
