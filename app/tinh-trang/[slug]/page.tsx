import { defineTaxonomyLandingPage } from "@/lib/discovery/taxonomy-landing-pages";

const page = defineTaxonomyLandingPage("tinh-trang");
export const generateMetadata = page.generateMetadata;
export default page.Page;
