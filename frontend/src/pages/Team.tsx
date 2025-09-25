import React from "react";
import team from "../data/team.json"; // the normalized JSON we built
import { Instagram, Facebook, Linkedin, Search } from "lucide-react";
import CloudinaryImg from "../../lib/CloudinaryImg";

type Member = {
  id: string;
  name: string;
  photo: string;
  ddayPhoto?: string | null;
  boardRole?: string;
  isBoard: boolean;
  isHead: boolean;
  position: string;
  departments: string[];
  links: {
    instagram?: string | null;
    facebook?: string | null;
    linkedin?: string | null;
  };
};

const ORDERED_FILTERS = [
  "All",
  "Board",
  "Challenge Organizers",
  "Sponsorship",
  "Marketing",
  "Video",
  "Logistics",
  "IT",
  "BBQ",
];

const chip =
  "inline-flex items-center rounded-full border px-3 py-1.5 text-sm font-medium transition";

const TeamPage: React.FC = () => {
  const members = team as Member[];

  // UI state
  const [selected, setSelected] = React.useState<Member>(
    members.find((m) => m.isBoard) ?? members[0]
  );
  const [activeDept, setActiveDept] = React.useState<string>("All");
  const [onlyBoard, setOnlyBoard] = React.useState<boolean>(false);
  const [q, setQ] = React.useState("");
  const filtered = members.filter((m) => {
    if (onlyBoard && !m.isBoard) return false;
    if (activeDept !== "All" && !m.departments?.includes(activeDept)) return false;
    if (q.trim()) {
      const needle = q.toLowerCase();
      const hay =
        `${m.name} ${m.position ?? ""} ${m.boardRole ?? ""} ${m.departments?.join(" ") ?? ""}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="max-w-7xl mx-auto px-6 pt-10 pb-6">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-blue-600">
          Meet the Team
        </h1>
        <p className="mt-2 text-orange-600 font-semibold tracking-wide">
          Board & Departments
        </p>
      </header>

  {/* Filter bar */}
<div className="max-w-7xl mx-auto px-6 mb-6 flex flex-col gap-3">
  <div className="flex flex-wrap gap-2">
    {ORDERED_FILTERS.map((label) => {
      const isAll = label === "All";
      const isBoard = label === "Board";
      const isActive =
        (isAll && !onlyBoard && activeDept === "All") ||
        (isBoard && onlyBoard) ||
        (!isAll && !isBoard && activeDept === label);

      return (
        <button
          key={label}
          onClick={() => {
            if (isAll) {
              setActiveDept("All");
              setOnlyBoard(false);
            } else if (isBoard) {
              setOnlyBoard(true);
              setActiveDept("All");
            } else {
              setActiveDept(label);
              setOnlyBoard(false);
            }
          }}
          className={`${chip} ${
            isActive
              ? "border-orange-500 bg-orange-500 text-white"
              : "border-gray-300 bg-white text-gray-800 hover:border-blue-400"
          }`}
        >
          {label}
        </button>
      );
    })}
  </div>

  {/* Search */}
  <div className="relative max-w-md">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
    <input
      value={q}
      onChange={(e) => setQ(e.target.value)}
      placeholder="Search by name, position, department…"
      className="w-full rounded-xl border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
    />
  </div>
</div>


      {/* Main two-column layout */}
      <div className="max-w-7xl mx-auto px-6 pb-16 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        {/* LEFT: Grid of avatars */}
        <section aria-label="Team members" className="relative">
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-8 gap-4">
            {filtered.map((m) => {
              const isActive = m.id === selected.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setSelected(m)}
                  className={`group relative rounded-xl overflow-hidden ring-1 transition
                              ${isActive ? "ring-orange-500" : "ring-black/10 hover:ring-blue-400"}`}
                  aria-label={`Select ${m.name}`}
                >
                  {/* avatar via Cloudinary */}
                  <CloudinaryImg
                    src={m.photo}
                    alt={m.name}
                    width={240}
                    className="h-full w-full object-cover"
                  />

                  {/* subtle name strip on hover/active */}
                  <div
                    className={`absolute inset-x-0 bottom-0 px-2 py-1 text-[11px] text-black bg-white/80 backdrop-blur
                                ${isActive ? "bg-orange-100 text-orange-700" : "opacity-0 group-hover:opacity-100"} transition`}
                  >
                    {m.name}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* RIGHT: Detail panel; text will not overlap image (reserved padding-right) */}
        {/* RIGHT: Detail panel; grid prevents overlap */}
<aside
  aria-label="Member details"
  className="rounded-2xl ring-1 ring-black/10 bg-gradient-to-b from-white to-orange-50 p-6 md:p-7"
>
  {/* 1 column on mobile, 2 columns from md+; fixed image column */}
  <div className="">
    {/* TEXT (left) */}
    <div>
      <h2 className="text-2xl font-extrabold text-blue-600 leading-tight">
        {selected.name}
      </h2>

      {(selected.boardRole || selected.position) && (
        <p className="mt-1 text-sm font-semibold text-orange-600">
          {selected.boardRole || selected.position!="Member of"?selected.position:""}
        </p>
      )}

      {/* {selected.boardRole &&
        selected.position &&
        selected.position !== selected.boardRole && (
          <p className="mt-1 text-sm text-gray-700">{selected.position}</p>
        )} */}

      {selected.departments?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {selected.departments.map((d) => (
            <span
              key={d}
              className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
            >
              {d}
            </span>
          ))}
        </div>
      )}

      {(selected.links?.instagram ||
        selected.links?.facebook ||
        selected.links?.linkedin) && (
        <div className="mt-5 flex items-center gap-4 text-blue-600">
          {selected.links.instagram && (
            <a
              href={selected.links.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-orange-600 transition"
            >
              <Instagram size={18} /> <span className="text-sm">Instagram</span>
            </a>
          )}
          {selected.links.facebook && (
            <a
              href={selected.links.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-orange-600 transition"
            >
              <Facebook size={18} /> <span className="text-sm">Facebook</span>
            </a>
          )}
          {selected.links.linkedin && (
            <a
              href={selected.links.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 hover:text-orange-600 transition"
            >
              <Linkedin size={18} /> <span className="text-sm">LinkedIn</span>
            </a>
          )}
        </div>
      )}
    </div>

{/* IMAGE (right) — centered now */}
<div className="mt-10 flex items-center justify-center">
  <div className="relative w-[260px] h-[340px] sm:w-[280px] sm:h-[360px] rounded-2xl overflow-hidden ring-2 ring-white shadow-xl bg-white">
    <CloudinaryImg
      src={selected.photo || selected.ddayPhoto as string}
      alt={`${selected.name} portrait`}
      width={320}
      className="h-full w-full object-cover"
    />
    <div className="absolute inset-0 ring-1 ring-black/10 rounded-2xl" />
  </div>
</div>

  </div>
</aside>

      </div>
    </div>
  );
};

export default TeamPage;
