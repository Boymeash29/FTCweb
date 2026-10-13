import PageFrame from "@/components/PageFrame";
import { getSitePage } from "@/lib/site-pages";
export async function generateMetadata(){const page=await getSitePage("engineering");return {title:page.title,description:page.intro};}
export default function EngineeringPage(){return <PageFrame pageKey="engineering"/>;}
