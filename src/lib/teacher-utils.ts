
import { Subject } from '@/lib/db';

interface Assignment {
  id: string;
  subjectId?: string;
  subjectName?: string;
  subjectCode?: string | null;
  classId?: string;
  className?: string;
  academicYear?: string;
}

/**
 * Calculates the total weekly teaching load for a teacher
 * based on their assigned subjects and the subjects' weekly hours.
 * @param assignedSubjects A list of subjects assigned to the teacher.
 * @param allSubjects A list of all subjects available in the school (to get weeklyHours).
 * @returns The total weekly teaching hours.
 */
export function calculateWeeklyTeachingLoad(
  assignedSubjects: Assignment[],
  allSubjects: Subject[]
): number {
  let totalLoad = 0;

  const subjectMap = new Map<string, Subject>();
  allSubjects.forEach(subject => subjectMap.set(subject.id, subject));

  const uniqueSubjectAssignments = new Set<string>(); // To count each subject only once

  assignedSubjects.forEach(assignment => {
    if (assignment.subjectId && !uniqueSubjectAssignments.has(assignment.subjectId)) {
      const subject = subjectMap.get(assignment.subjectId);
      if (subject) {
        totalLoad += subject.weeklyHours || 0;
        uniqueSubjectAssignments.add(assignment.subjectId);
      }
    }
  });

  return totalLoad;
}
