export type Course = {
  id: string;
  code: string;
  title: string;
  lecturer?: string;
  progress: number;
  nextTopic: string;
  materials: number;
  upcoming?: string;
};

export type AcademicProfile = {
  name: string;
  university: string;
  faculty: string;
  department: string;
  level: string;
  semester: string;
};
