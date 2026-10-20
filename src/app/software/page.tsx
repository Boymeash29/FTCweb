import PageFrame from "@/components/PageFrame";
import { getSitePage } from "@/lib/site-pages";
import TeamEngineeringDirectory from "@/components/TeamEngineeringDirectory";
export async function generateMetadata(){const page=await getSitePage("software");return {title:page.title,description:page.intro};}
export default function SoftwarePage(){return <main id="main-content"><PageFrame pageKey="software" asMain={false}/><TeamEngineeringDirectory kind="software"/></main>;}
