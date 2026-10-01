import type { AcademicProfile, Course } from "./types";

export const profile: AcademicProfile = {
  name: "Samuel",
  university: "Covenant University",
  faculty: "Engineering",
  department: "Mechanical Engineering",
  level: "200 Level",
  semester: "Semester 1",
};

export const courses: Course[] = [
  {
    id: "mth-211",
    code: "MTH 211",
    title: "Engineering Mathematics III",
    lecturer: "Dr. Adeyemi",
    progress: 72,
    nextTopic: "Laplace Transforms",
    materials: 8,
    upcoming: "Test in 6 days",
  },
  {
    id: "mce-213",
    code: "MCE 213",
    title: "Thermodynamics I",
    lecturer: "Engr. Okafor",
    progress: 54,
    nextTopic: "Entropy & the Second Law",
    materials: 11,
    upcoming: "Assignment due Friday",
  },
  {
    id: "eee-211",
    code: "EEE 211",
    title: "Electrical Engineering Fundamentals",
    progress: 38,
    nextTopic: "AC Circuit Analysis",
    materials: 5,
  },
  {
    id: "gst-211",
    code: "GST 211",
    title: "Entrepreneurship",
    progress: 81,
    nextTopic: "Business Models",
    materials: 4,
  },
];
