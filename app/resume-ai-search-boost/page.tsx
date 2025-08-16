"use client";
import React, { useState } from "react";

const candidates = [
  {
    name: "Sarah Johnson",
    title: "Senior Frontend Developer",
    email: "sarah.johnson@email.com",
    phone: "+1 (953) 123-4567",
    location: "San Francisco, CA",
    skills: [
      "React",
      "TypeScript",
      "Next.js",
      "Tailwind CSS",
      "Node.js",
      "3 more",
    ],
    experience: [
      {
        role: "Senior Frontend Developer at TechCorp",
        period: "2022 – Present • 3 years",
      },
      {
        role: "Frontend Developer at StartupXYZ",
        period: "2020 – 2022 • 2 years",
      },
    ],
    summary:
      "Experienced frontend developer with 5+ years building scalable web applications. Specialized in React ecosystem and modern JavaScript frameworks. Led multiple successful product launches and mentored junior developers.",
    projects: [
      {
        title: "E-commerce Platform Redesign",
        desc: "Led frontend development for a complete platform overhaul, improving user engagement by 40%.",
      },
      {
        title: "Real-time Dashboard",
        desc: "Built responsive analytics dashboard with real-time data visualization using React and D3.js.",
      },
    ],
    avatar: "👩‍💻",
  },
  {
    name: "Michael Chen",
    title: "Full Stack Developer",
    email: "michael.chen@email.com",
    phone: "+1 (953) 987-6434",
    location: "Remote",
    skills: ["Python", "Django", "React", "PostgreSQL", "AWS", "5 more"],
    experience: [
      {
        role: "Full Stack Developer at DataFlow Inc",
        period: "2021 – Present • 4 years",
      },
      {
        role: "Backend Developer at CloudTech",
        period: "2019 – 2021 • 2 years",
      },
    ],
    summary:
      "Full stack developer with expertise in Python/Django backend and React frontend. Strong background in cloud infrastructure and database optimization. Passionate about building efficient, scalable solutions.",
    projects: [
      {
        title: "API Gateway Microservices",
        desc: "Architected and implemented scalable microservices handling 1M+ daily requests.",
      },
      {
        title: "Data Analytics Platform",
        desc: "Built end-to-end analytics platform with real-time processing and interactive dashboards.",
      },
    ],
    avatar: "👨‍💻",
  },
  {
    name: "Emma Wilson",
    title: "UI/UX Designer",
    email: "emma.wilson@email.com",
    phone: "+1 (953) 456-7890",
    location: "New York, NY",
    skills: [
      "Figma",
      "Adobe XD",
      "Sketch",
      "Prototyping",
      "User Research",
      "4 more",
    ],
    experience: [
      {
        role: "Senior UX Designer at DesignStudio",
        period: "2023 – Present • 2 years",
      },
      {
        role: "Product Designer at InnovateLab",
        period: "2021 – 2023 • 2 years",
      },
    ],
    summary:
      "Creative UI/UX designer with 4+ years of experience creating user-centered digital experiences. Expertise in design systems, user research, and cross-functional collaboration. Proven track record of improving user satisfaction and conversion rates.",
    projects: [
      {
        title: "Mobile App Redesign",
        desc: "Complete UX overhaul resulting in 35% increase in user engagement and 25% reduction in support tickets.",
      },
      {
        title: "Design System Implementation",
        desc: "Created comprehensive design system, reducing design time by 50%.",
      },
    ],
    avatar: "👩‍🎨",
  },
];

const roles = [
  "All Roles",
  "Frontend Developer",
  "Full Stack Developer",
  "UI/UX Designer",
];
const levels = ["All Levels", "Junior", "Mid", "Senior"];
const locations = [
  "All Locations",
  "San Francisco, CA",
  "Remote",
  "New York, NY",
];

export default function ResumeAISearchBoostPage() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState(roles[0]);
  const [level, setLevel] = useState(levels[0]);
  const [location, setLocation] = useState(locations[0]);

  const filteredCandidates = candidates.filter((c) => {
    const matchesSearch =
      search === "" ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.skills.some((s) => s.toLowerCase().includes(search.toLowerCase()));
    const matchesRole = role === "All Roles" || c.title.includes(role);
    const matchesLocation =
      location === "All Locations" || c.location === location;
    return matchesSearch && matchesRole && matchesLocation;
  });

  return (
    <div className='bg-white min-h-screen py-8 px-6'>
      <div className='max-w-5xl mx-auto'>
        <div className='flex justify-between items-center mb-6'>
          <h1 className='text-lg font-semibold'>Candidate Search</h1>
          <button className='bg-black text-white px-4 py-2 rounded hover:bg-gray-800 flex items-center gap-2'>
            + Add Candidate
          </button>
        </div>
        <div className='bg-gray-50 p-4 rounded-lg mb-6 flex flex-wrap gap-4 items-end'>
          <div>
            <label className='block text-xs font-medium mb-1'>Search</label>
            <input
              type='text'
              placeholder='Name, skills, or keywords...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className='border px-2 py-1 rounded w-48'
            />
          </div>
          <div>
            <label className='block text-xs font-medium mb-1'>Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className='border px-2 py-1 rounded w-40'
            >
              {roles.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className='block text-xs font-medium mb-1'>Experience</label>
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className='border px-2 py-1 rounded w-40'
            >
              {levels.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label className='block text-xs font-medium mb-1'>Location</label>
            <select
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className='border px-2 py-1 rounded w-40'
            >
              {locations.map((loc) => (
                <option key={loc}>{loc}</option>
              ))}
            </select>
          </div>
          <button className='bg-black text-white px-4 py-2 rounded hover:bg-gray-800 ml-auto'>
            Apply Filters
          </button>
        </div>
        <div className='mb-4 text-sm text-gray-500'>
          {filteredCandidates.length} candidates found
        </div>
        <div className='flex flex-col gap-6'>
          {filteredCandidates.map((c, idx) => (
            <div
              key={c.email}
              className='bg-white border rounded-lg p-6 shadow-sm flex gap-4'
            >
              <div className='flex flex-col items-center justify-start w-16'>
                <div className='text-4xl'>{c.avatar}</div>
              </div>
              <div className='flex-1'>
                <div className='flex justify-between items-center'>
                  <div>
                    <div className='font-semibold text-lg'>{c.name}</div>
                    <div className='text-sm text-gray-500'>{c.title}</div>
                  </div>
                  <div className='flex gap-2 items-center'>
                    <span className='text-xs text-gray-500'>{c.email}</span>
                    <span className='text-xs text-gray-500'>{c.phone}</span>
                    <span className='text-xs text-gray-500'>{c.location}</span>
                  </div>
                </div>
                <div className='mt-2 flex flex-wrap gap-2'>
                  {c.skills.map((s, i) => (
                    <span
                      key={s + i}
                      className='bg-gray-100 text-xs px-2 py-1 rounded border border-gray-200'
                    >
                      {s}
                    </span>
                  ))}
                </div>
                <div className='mt-3 grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <div className='font-medium text-sm mb-1'>Experience</div>
                    <ul className='list-disc ml-4 text-xs text-gray-700'>
                      {c.experience.map((exp, i) => (
                        <li key={exp.role + i}>
                          <span className='font-semibold'>{exp.role}</span>{" "}
                          <span className='text-gray-500'>{exp.period}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <div className='font-medium text-sm mb-1'>Summary</div>
                    <div className='text-xs text-gray-700'>{c.summary}</div>
                  </div>
                </div>
                <div className='mt-3 grid grid-cols-1 md:grid-cols-2 gap-4'>
                  {c.projects.map((p, i) => (
                    <div key={p.title + i}>
                      <div className='font-medium text-sm mb-1'>{p.title}</div>
                      <div className='text-xs text-gray-700'>{p.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className='flex flex-col gap-2 justify-start items-end'>
                <button className='border px-3 py-1 rounded text-xs hover:bg-gray-100'>
                  View
                </button>
                <button className='bg-black text-white px-3 py-1 rounded text-xs hover:bg-gray-800'>
                  Contact
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className='flex justify-center items-center mt-8 gap-2'>
          <button className='border px-2 py-1 rounded text-xs'>{"<"}</button>
          <button className='border px-2 py-1 rounded text-xs bg-black text-white'>
            1
          </button>
          <button className='border px-2 py-1 rounded text-xs'>2</button>
          <button className='border px-2 py-1 rounded text-xs'>3</button>
          <span className='text-xs text-gray-500'>...</span>
          <button className='border px-2 py-1 rounded text-xs'>25</button>
          <button className='border px-2 py-1 rounded text-xs'>{">"}</button>
        </div>
        <div className='fixed bottom-6 right-6 bg-white border rounded-lg shadow-lg p-4 flex gap-4 items-center'>
          <div className='flex flex-col items-center'>
            <button className='bg-violet-100 text-violet-700 px-3 py-2 rounded-lg mb-2 flex flex-col items-center'>
              <span className='text-lg'>Select</span>
              <span className='text-xs'>✓</span>
            </button>
            <button className='bg-gray-100 text-gray-700 px-3 py-2 rounded-lg mb-2 flex flex-col items-center'>
              <span className='text-lg'>Move</span>
              <span className='text-xs'>⇄</span>
            </button>
            <button className='bg-gray-100 text-gray-700 px-3 py-2 rounded-lg flex flex-col items-center'>
              <span className='text-lg'>Notes</span>
              <span className='text-xs'>📝</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
