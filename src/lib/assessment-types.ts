export type AssessmentType = "quiz" | "mock_exam";

export type StoredAssessmentQuestion = {
  id: string;
  topic: string;
  prompt: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  source: {
    title: string;
    pageNumber: number | null;
  } | null;
};

export type StoredAssessmentConfiguration = {
  version: 1;
  generatedFrom: "course_materials";
  questionCount: number;
  questions: StoredAssessmentQuestion[];
};

export type PublicAssessmentQuestion = Omit<
  StoredAssessmentQuestion,
  "correctOptionIndex" | "explanation"
>;

export type AssessmentFeedbackItem = {
  questionId: string;
  topic: string;
  selectedOptionIndex: number | null;
  correctOptionIndex: number;
  correct: boolean;
  explanation: string;
  source: StoredAssessmentQuestion["source"];
};
