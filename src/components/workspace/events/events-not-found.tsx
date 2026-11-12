import { getCurrentOfficer, getOfficerDefaultWorkspace } from "@/src/app/(workspace)/actions";
import { WorkspaceNotFound } from "@/src/components/workspace/home/workspace-not-found";
import { officerLandingPath } from "@/src/lib/routes";

/**
 * The "We can't find that page" screen the events pages share. An officer of
 * another org, an unknown org, and a missing or malformed event all get the
 * same screen, so a guessed ID never confirms that anything exists.
 */
export async function EventsNotFound() {
  const [officer, workspace] = await Promise.all([getCurrentOfficer(), getOfficerDefaultWorkspace()]);
  return <WorkspaceNotFound officer={officer} workspaceHref={officerLandingPath({ orgId: workspace?.orgId })} />;
}
