"use client";

import { useState, useTransition } from "react";
import { GripVertical } from "lucide-react";
import { reorderTeamRoster } from "@/app/admin/roster/actions";

type RosterItem = { id: string; name: string; role: string; status: string };
type RosterTeam = { id: string; name: string; number: string; people: RosterItem[] };

export default function RosterOrderEditor({ teams }: { teams: RosterTeam[] }) {
  const [orders, setOrders] = useState(() => Object.fromEntries(teams.map(team => [team.id, team.people])));
  const [dragged, setDragged] = useState<{ teamId: string; memberId: string } | null>(null);
  const [message, setMessage] = useState<Record<string, { text: string; ok: boolean }>>({});
  const [isPending, startTransition] = useTransition();

  function move(teamId: string, memberId: string, delta: -1 | 1) {
    setOrders(current => {
      const items = [...(current[teamId] ?? [])];
      const from = items.findIndex(item => item.id === memberId);
      const to = from + delta;
      if (from < 0 || to < 0 || to >= items.length) return current;
      [items[from], items[to]] = [items[to], items[from]];
      return { ...current, [teamId]: items };
    });
    setMessage(current => ({ ...current, [teamId]: { text: "Order changed. Save to publish it.", ok: true } }));
  }

  function drop(teamId: string, targetId: string) {
    if (!dragged || dragged.teamId !== teamId || dragged.memberId === targetId) return;
    setOrders(current => {
      const items = [...(current[teamId] ?? [])];
      const from = items.findIndex(item => item.id === dragged.memberId);
      const to = items.findIndex(item => item.id === targetId);
      if (from < 0 || to < 0) return current;
      const [item] = items.splice(from, 1);
      items.splice(to, 0, item);
      return { ...current, [teamId]: items };
    });
    setDragged(null);
    setMessage(current => ({ ...current, [teamId]: { text: "Order changed. Save to publish it.", ok: true } }));
  }

  function save(team: RosterTeam) {
    startTransition(async () => {
      const result = await reorderTeamRoster(team.id, (orders[team.id] ?? []).map(person => person.id));
      setMessage(current => ({ ...current, [team.id]: { text: result.message, ok: result.ok } }));
    });
  }

  return <section className="roster-order-manager" aria-label="Sort published team rosters">
    <div className="panel-head"><div><span className="section-tag">ROSTER ORDER</span><h2>Arrange each team</h2></div><p>Drag entries or use Move up and Move down, then save.</p></div>
    {teams.map(team => {
      const people = orders[team.id] ?? [];
      return <section className="roster-order-team" key={team.id}>
        <header><div><span className="section-tag">TEAM {team.number}</span><h3>{team.name}</h3></div><button className="button-link" type="button" disabled={isPending || people.length < 2} onClick={() => save(team)}>Save order <span>→</span></button></header>
        {people.length ? <ol className="roster-order-list" aria-label={`${team.name} roster order`}>
          {people.map((person, index) => <li key={person.id} draggable={!isPending} onDragStart={event => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", person.id); setDragged({ teamId: team.id, memberId: person.id }); }} onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }} onDrop={() => drop(team.id, person.id)} onDragEnd={() => setDragged(null)} className={dragged?.memberId === person.id ? "is-dragged" : ""}>
            <span className="roster-order-index">{String(index + 1).padStart(2, "0")}</span><GripVertical size={16} aria-hidden="true"/><span className="roster-order-person"><b>{person.name}</b><small>{person.role} · {person.status}</small></span>
            <span className="roster-order-actions"><button type="button" aria-label={`Move ${person.name} up`} disabled={index === 0 || isPending} onClick={() => move(team.id, person.id, -1)}>↑</button><button type="button" aria-label={`Move ${person.name} down`} disabled={index === people.length - 1 || isPending} onClick={() => move(team.id, person.id, 1)}>↓</button></span>
          </li>)}
        </ol> : <p className="admin-empty">Add people and assign them to this team below to create its roster.</p>}
        <p className={`roster-order-message${message[team.id] ? message[team.id].ok ? " is-success" : " is-error" : ""}`} aria-live="polite">{message[team.id]?.text ?? ""}</p>
      </section>;
    })}
  </section>;
}
