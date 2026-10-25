"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteTeamRosterMember } from "@/app/admin/roster/actions";

export default function DeleteRosterMemberButton({ memberId, name }: { memberId: string; name: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function remove() {
    const confirmed = window.confirm(`Delete ${name} from the public roster? This also deletes all their team and season roster assignments and cannot be undone.`);
    if (!confirmed) return;
    startTransition(async () => {
      const result = await deleteTeamRosterMember(memberId);
      setMessage(result.message);
      if (result.ok) router.refresh();
    });
  }

  return <div className="roster-delete-control"><button className="roster-delete-button" type="button" onClick={remove} disabled={isPending}>{isPending ? "Deleting…" : "Delete person"}</button>{message && <span role="status">{message}</span>}</div>;
}
