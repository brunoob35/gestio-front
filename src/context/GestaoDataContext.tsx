import {
  useCallback,
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  fetchAllProfessors,
  fetchProfessorClassesCount,
  fetchProfessors,
  type ProfessorRow,
} from "../services/professors";
import {
  fetchClasses,
  type Class,
} from "../services/classes";
import {
  fetchStudents,
  type StudentRow,
} from "../services/students";
import {
  fetchCustomers,
  type CustomerRow,
} from "../services/customers";

type LoadOptions = {
  force?: boolean;
};

type GestaoDataContextValue = {
  classes: Class[];
  professors: ProfessorRow[];
  allProfessors: ProfessorRow[];
  students: StudentRow[];
  customers: CustomerRow[];
  studentClassLinksVersion: number;
  hasLoadedClasses: boolean;
  hasLoadedProfessors: boolean;
  hasLoadedAllProfessors: boolean;
  hasLoadedStudents: boolean;
  hasLoadedCustomers: boolean;
  loadClasses: (options?: LoadOptions) => Promise<Class[]>;
  loadProfessors: (options?: LoadOptions) => Promise<ProfessorRow[]>;
  loadAllProfessors: (options?: LoadOptions) => Promise<ProfessorRow[]>;
  loadStudents: (options?: LoadOptions) => Promise<StudentRow[]>;
  loadCustomers: (options?: LoadOptions) => Promise<CustomerRow[]>;
  upsertClass: (classItem: Class) => void;
  removeClass: (classID: number) => void;
  upsertProfessor: (professor: ProfessorRow) => void;
  removeProfessor: (professorID: number) => void;
  upsertStudent: (student: StudentRow) => void;
  removeStudent: (studentID: number) => void;
  upsertCustomer: (customer: CustomerRow) => void;
  removeCustomer: (customerID: number) => void;
  invalidateStudentClassLinks: () => void;
};

const GestaoDataContext = createContext<GestaoDataContextValue | null>(null);

export function GestaoDataProvider({ children }: { children: ReactNode }) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [professors, setProfessors] = useState<ProfessorRow[]>([]);
  const [allProfessors, setAllProfessors] = useState<ProfessorRow[]>([]);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [studentClassLinksVersion, setStudentClassLinksVersion] = useState(0);

  const [hasLoadedClasses, setHasLoadedClasses] = useState(false);
  const [hasLoadedProfessors, setHasLoadedProfessors] = useState(false);
  const [hasLoadedAllProfessors, setHasLoadedAllProfessors] = useState(false);
  const [hasLoadedStudents, setHasLoadedStudents] = useState(false);
  const [hasLoadedCustomers, setHasLoadedCustomers] = useState(false);

  const loadClasses = useCallback(async (_options?: LoadOptions) => {
    const data = await fetchClasses();
    setClasses(data);
    setHasLoadedClasses(true);
    return data;
  }, []);

  const loadProfessors = useCallback(async (_options?: LoadOptions) => {
    const baseProfessors = await fetchProfessors();
    const ids = baseProfessors.map((item) => item.id);

    let counts: Record<number, number> = {};

    if (ids.length) {
      try {
        counts = await fetchProfessorClassesCount(ids);
      } catch (error) {
        console.error("Erro ao carregar contagem de turmas:", error);
      }
    }

    const merged = baseProfessors.map((item) => ({
      ...item,
      turmasAtivas: counts[item.id] ?? item.turmasAtivas ?? 0,
    }));

    setProfessors(merged);
    setHasLoadedProfessors(true);
    return merged;
  }, []);

  const loadAllProfessors = useCallback(async (_options?: LoadOptions) => {
    const data = await fetchAllProfessors();
    setAllProfessors(data);
    setHasLoadedAllProfessors(true);
    return data;
  }, []);

  const loadStudents = useCallback(async (_options?: LoadOptions) => {
    const data = await fetchStudents();
    setStudents(data);
    setHasLoadedStudents(true);
    return data;
  }, []);

  const loadCustomers = useCallback(async (_options?: LoadOptions) => {
    const data = await fetchCustomers();
    setCustomers(data);
    setHasLoadedCustomers(true);
    return data;
  }, []);

  const upsertClass = useCallback((classItem: Class) => {
    setClasses((current) => {
      const exists = current.some((item) => item.id === classItem.id);
      const next = exists
        ? current.map((item) => (item.id === classItem.id ? { ...item, ...classItem } : item))
        : [...current, classItem];

      return next.sort((left, right) => left.name.localeCompare(right.name));
    });
    setHasLoadedClasses(true);
  }, []);

  const removeClass = useCallback((classID: number) => {
    setClasses((current) => current.filter((item) => item.id !== classID));
  }, []);

  const upsertProfessor = useCallback((professor: ProfessorRow) => {
    const updateList = (current: ProfessorRow[]) => {
      const exists = current.some((item) => item.id === professor.id);
      const next = exists
        ? current.map((item) => (item.id === professor.id ? { ...item, ...professor } : item))
        : [...current, professor];

      return next.sort((left, right) => left.nome.localeCompare(right.nome));
    };

    setProfessors(updateList);
    setAllProfessors(updateList);
    setHasLoadedProfessors(true);
    setHasLoadedAllProfessors(true);
  }, []);

  const removeProfessor = useCallback((professorID: number) => {
    const filterList = (current: ProfessorRow[]) =>
      current.filter((item) => item.id !== professorID);

    setProfessors(filterList);
    setAllProfessors(filterList);
  }, []);

  const upsertStudent = useCallback((student: StudentRow) => {
    setStudents((current) => {
      const exists = current.some((item) => item.id === student.id);
      const next = exists
        ? current.map((item) => (item.id === student.id ? { ...item, ...student } : item))
        : [...current, student];

      return next.sort((left, right) => left.nome.localeCompare(right.nome));
    });
    setHasLoadedStudents(true);
  }, []);

  const removeStudent = useCallback((studentID: number) => {
    setStudents((current) => current.filter((item) => item.id !== studentID));
  }, []);

  const upsertCustomer = useCallback((customer: CustomerRow) => {
    setCustomers((current) => {
      const exists = current.some((item) => item.id === customer.id);
      const next = exists
        ? current.map((item) => (item.id === customer.id ? { ...item, ...customer } : item))
        : [...current, customer];

      return next.sort((left, right) => left.nome.localeCompare(right.nome));
    });
    setHasLoadedCustomers(true);
  }, []);

  const removeCustomer = useCallback((customerID: number) => {
    setCustomers((current) => current.filter((item) => item.id !== customerID));
  }, []);

  const invalidateStudentClassLinks = useCallback(() => {
    setStudentClassLinksVersion((current) => current + 1);
  }, []);

  const value = useMemo<GestaoDataContextValue>(
    () => ({
      classes,
      professors,
      allProfessors,
      students,
      customers,
      studentClassLinksVersion,
      hasLoadedClasses,
      hasLoadedProfessors,
      hasLoadedAllProfessors,
      hasLoadedStudents,
      hasLoadedCustomers,
      loadClasses,
      loadProfessors,
      loadAllProfessors,
      loadStudents,
      loadCustomers,
      upsertClass,
      removeClass,
      upsertProfessor,
      removeProfessor,
      upsertStudent,
      removeStudent,
      upsertCustomer,
      removeCustomer,
      invalidateStudentClassLinks,
    }),
    [
      allProfessors,
      classes,
      customers,
      hasLoadedAllProfessors,
      hasLoadedClasses,
      hasLoadedCustomers,
      hasLoadedProfessors,
      hasLoadedStudents,
      professors,
      studentClassLinksVersion,
      students,
    ]
  );

  return (
    <GestaoDataContext.Provider value={value}>
      {children}
    </GestaoDataContext.Provider>
  );
}

export function useGestaoData() {
  const context = useContext(GestaoDataContext);

  if (!context) {
    throw new Error("useGestaoData must be used within GestaoDataProvider");
  }

  return context;
}
