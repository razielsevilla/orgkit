"use client";

import type { ComponentProps } from "react";
import { MembersClient } from "@/src/components/workspace/members/members-client";
import { demoMembersData } from "@/src/lib/tour/demo/members";
import { useDemoView } from "@/src/lib/tour/tour-demo";

/**
 * The Members page, showing an example roster while the officer tour is open and
 * the real roster is empty. Otherwise exactly the real page. See tour-demo.ts.
 */
export function MembersWithDemo(props: ComponentProps<typeof MembersClient>) {
  const isEmpty = props.initialData.totalCount === 0 && props.initialData.inactiveCount === 0 && !props.initialError;
  const demo = useDemoView(isEmpty);

  if (!demo) return <MembersClient {...props} />;
  // A different key starts the page fresh, so no state from the empty page carries over
  return <MembersClient key="demo" {...props} initialData={demoMembersData(props.initialData)} demo />;
}
