"use client";

import type { ComponentProps } from "react";
import { DocumentsClient } from "@/src/components/workspace/documents/documents-client";
import { DuesClient } from "@/src/components/workspace/dues/dues-client";
import { EventsClient } from "@/src/components/workspace/events/events-client";
import { OrgHealthDashboard } from "@/src/components/workspace/home/org-health-dashboard";
import { HandoverOverviewClient } from "@/src/components/workspace/handover/handover-overview-client";
import { OfficersClientWrapper } from "@/src/components/workspace/officers/page-client-wrapper";
import { TermsClient } from "@/src/components/workspace/terms/terms-client";
import { summarizeHealth } from "@/src/lib/health/org-health";
import { DEMO_DUES_DASHBOARD, DEMO_DUES_PERIODS } from "@/src/lib/tour/demo/dues";
import { demoDocumentsData } from "@/src/lib/tour/demo/documents";
import { DEMO_EVENTS } from "@/src/lib/tour/demo/events";
import { demoHandoverSummary } from "@/src/lib/tour/demo/handover";
import { demoHealthData } from "@/src/lib/tour/demo/home";
import { demoOfficersData } from "@/src/lib/tour/demo/officers";
import { demoTermsData } from "@/src/lib/tour/demo/terms";
import { useDemoView } from "@/src/lib/tour/tour-demo";

/**
 * One wrapper per page that shows example data while the officer tour is open and
 * the page's real data is empty. Each renders the real page component, unchanged,
 * and only swaps its data; a page with real data is always shown as it is.
 * A different `key` starts the example page fresh, so no state from the empty page
 * carries over. See src/lib/tour/tour-demo.ts for how the pieces fit.
 */

/** Dues: an open period part way through collecting, and a closed one */
export function DuesWithDemo(props: ComponentProps<typeof DuesClient>) {
  const demo = useDemoView(props.initialPeriods.length === 0);
  if (!demo) return <DuesClient {...props} />;
  return (
    <DuesClient
      key="demo"
      {...props}
      initialPeriods={DEMO_DUES_PERIODS}
      initialDashboardData={DEMO_DUES_DASHBOARD}
      demo
    />
  );
}

/** Events: two coming up, three ended, one cancelled */
export function EventsWithDemo(props: ComponentProps<typeof EventsClient>) {
  const demo = useDemoView(props.events.length === 0 && !props.initialError);
  if (!demo) return <EventsClient {...props} />;
  return <EventsClient key="demo" {...props} events={DEMO_EVENTS} />;
}

/** Officers: the real officer plus two teammates and a pending invite */
export function OfficersWithDemo(props: ComponentProps<typeof OfficersClientWrapper>) {
  const { officers, pendingInvites } = props.initialData;
  const demo = useDemoView(officers.length <= 1 && pendingInvites.length === 0);
  if (!demo) return <OfficersClientWrapper {...props} />;
  return <OfficersClientWrapper key="demo" {...props} initialData={demoOfficersData(props.initialData)} />;
}

/** Terms: this year's officers and last year's */
export function TermsWithDemo(props: ComponentProps<typeof TermsClient>) {
  const demo = useDemoView(props.initialData.terms.length === 0);
  if (!demo) return <TermsClient {...props} />;
  return <TermsClient key="demo" {...props} initialData={demoTermsData(props.initialData)} />;
}

/** Documents: a few files and links across the categories */
export function DocumentsWithDemo(props: ComponentProps<typeof DocumentsClient>) {
  const demo = useDemoView(props.initialData.documents.length === 0);
  if (!demo) return <DocumentsClient {...props} />;
  return <DocumentsClient key="demo" {...props} initialData={demoDocumentsData(props.initialData)} />;
}

/** Handover: one ready guide and one draft */
export function HandoverWithDemo(props: ComponentProps<typeof HandoverOverviewClient>) {
  const demo = useDemoView(props.summary.guides.length === 0);
  if (!demo) return <HandoverOverviewClient {...props} />;
  return <HandoverOverviewClient key="demo" {...props} summary={demoHandoverSummary(props.summary)} />;
}

/** Home: shows an example when nothing has been set up yet, so there is nothing to rate */
export function HomeWithDemo(props: ComponentProps<typeof OrgHealthDashboard>) {
  const demo = useDemoView(summarizeHealth(props.data).considered === 0);
  if (!demo) return <OrgHealthDashboard {...props} />;
  return <OrgHealthDashboard key="demo" {...props} data={demoHealthData()} />;
}
