import { defineTaxonomyLandingPage } from "@/lib/discovery/taxonomy-landing-pages";

const page = defineTaxonomyLandingPage("loai-truyen");
export const generateMetadata = page.generateMetadata;
export default page.Page;
