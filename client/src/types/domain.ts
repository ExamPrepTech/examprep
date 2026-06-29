export interface BaseEntity {
  _id: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Space extends BaseEntity {
  name: string;
  description?: string;
  slug: string;
  icon?: string;
  subjectCount?: number;
  questionCount?: number;
  isOwner?: boolean;
  ownerName?: string;
}

export interface Subject extends BaseEntity {
  title: string;
  spaceId: string;
  position: number;
  slug: string;
  topicCount?: number;
  questionCount?: number;
  icon?: string;
}

export interface Topic extends BaseEntity {
  title: string;
  subjectId: string;
  position: number;
  slug: string;
  icon?: string;
  questionCount?: number;
  dueCount?: number;
  newCount?: number;
  learningCount?: number;
  reviewCount?: number;
}

export type ContentBlockType = 'note' | 'single_select_mcq' | 'multi_select_mcq' | 'fill_in_the_blank';

export interface BaseContentBlock extends BaseEntity {
  topicId: string;
  position: number;
  kind: ContentBlockType;
  explanation?: string;
  notes?: string;
  tags?: string[];
  group?: string;
  hints?: string[];
  imageUrl?: string;
}

export interface NoteBlock extends BaseContentBlock {
  kind: 'note';
  content: string;
}

export interface McqOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface SingleSelectMcqBlock extends BaseContentBlock {
  kind: 'single_select_mcq';
  question: string;
  options: McqOption[];
}

export interface MultiSelectMcqBlock extends BaseContentBlock {
  kind: 'multi_select_mcq';
  question: string;
  options: McqOption[];
}

export interface FillInTheBlankBlock extends BaseContentBlock {
  kind: 'fill_in_the_blank';
  question: string;
  blankAnswers: string[];
}


export type ContentBlock = NoteBlock | SingleSelectMcqBlock | MultiSelectMcqBlock | FillInTheBlankBlock;

export interface TestQuestion {
  blockId: string;
  blockSnapshot: ContentBlock;
  userAnswer?: unknown;
  isCorrect?: boolean;
  marksObtained?: number;
  timeSpent?: number;
}

export interface Test extends BaseEntity {
  status: 'CREATED' | 'IN_PROGRESS' | 'COMPLETED';
  startTime?: string;
  endTime?: string;
  questions: TestQuestion[];
  score: number;
  totalMarks: number;
  config: {
    questionCount: number;
    duration: number; // in minutes
  };
  warnings?: Array<{ timestamp: Date; reason: string }>;
}
