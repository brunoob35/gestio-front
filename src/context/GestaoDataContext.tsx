import {
  createContext,
  useContext,
  useMemo,
  useRef,
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

const CACHE_TTL_MS = 60_000;

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

  const classesLoadedAtRef = useRef(0);
  const professorsLoadedAtRef = useRef(0);
  const allProfessorsLoadedAtRef = useRef(0);
  const studentsLoadedAtRef = useRef(0);
  const customersLoadedAtRef = useRef(0);

  const classesPromiseRef = useRef<Promise<Class[]> | null>(null);
  const professorsPromiseRef = useRef<Promise<ProfessorRow[]> | null>(null);
  const allProfessorsPromiseRef = useRef<Promise<ProfessorRow[]> | null>(null);
  const studentsPromiseRef = useRef<Promise<StudentRow[]> | null>(null);
  const customersPromiseRef = useRef<Promise<CustomerRow[]> | null>(null);

  function isFresh(timestamp: number) {
    return Date.now() - timestamp < CACHE_TTL_MS;
  }

  async function loadClasses(options?: LoadOptions) {
    const force = options?.force ?? false;

    if (!force && hasLoadedClasses && isFresh(classesLoadedAtRef.current)) {
      return classes;
    }

    if (!force && classesPromiseRef.current) {
      return classesPromiseRef.current;
    }

    const promise = fetchClasses()
      .then((data) => {
        setClasses(data);
        setHasLoadedClasses(true);
        classesLoadedAtRef.current = Date.now();
        return data;
      })
      .finally(() => {
        classesPromiseRef.current = null;
      });

    classesPromiseRef.current = promise;
    return promise;
  }

  async function loadProfessors(options?: LoadOptions) {
    const force = options?.force ?? false;

    if (!force && hasLoadedProfessors && isFresh(professorsLoadedAtRef.current)) {
      return professors;
    }

    if (!force && professorsPromiseRef.current) {
      return professorsPromiseRef.current;
    }

    const promise = (async () => {
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
      professorsLoadedAtRef.current = Date.now();
      return merged;
    })().finally(() => {
      professorsPromiseRef.current = null;
    });

    professorsPromiseRef.current = promise;
    return promise;
  }

  async function loadAllProfessors(options?: LoadOptions) {
    const force = options?.force ?? false;

    if (!force && hasLoadedAllProfessors && isFresh(allProfessorsLoadedAtRef.current)) {
      return allProfessors;
    }

    if (!force && allProfessorsPromiseRef.current) {
      return allProfessorsPromiseRef.current;
    }

    const promise = fetchAllProfessors()
      .then((data) => {
        setAllProfessors(data);
        setHasLoadedAllProfessors(true);
        allProfessorsLoadedAtRef.current = Date.now();
        return data;
      })
      .finally(() => {
        allProfessorsPromiseRef.current = null;
      });

    allProfessorsPromiseRef.current = promise;
    return promise;
  }

  async function loadStudents(options?: LoadOptions) {
    const force = options?.force ?? false;

    if (!force && hasLoadedStudents && isFresh(studentsLoadedAtRef.current)) {
      return students;
    }

    if (!force && studentsPromiseRef.current) {
      return studentsPromiseRef.current;
    }

    const promise = fetchStudents()
      .then((data) => {
        setStudents(data);
        setHasLoadedStudents(true);
        studentsLoadedAtRef.current = Date.now();
        return data;
      })
      .finally(() => {
        studentsPromiseRef.current = null;
      });

    studentsPromiseRef.current = promise;
    return promise;
  }

  async function loadCustomers(options?: LoadOptions) {
    const force = options?.force ?? false;

    if (!force && hasLoadedCustomers && isFresh(customersLoadedAtRef.current)) {
      return customers;
    }

    if (!force && customersPromiseRef.current) {
      return customersPromiseRef.current;
    }

    const promise = fetchCustomers()
      .then((data) => {
        setCustomers(data);
        setHasLoadedCustomers(true);
        customersLoadedAtRef.current = Date.now();
        return data;
      })
      .finally(() => {
        customersPromiseRef.current = null;
      });

    customersPromiseRef.current = promise;
    return promise;
  }

  function upsertClass(classItem: Class) {
    setClasses((current) => {
      const exists = current.some((item) => item.id === classItem.id);
      const next = exists
        ? current.map((item) => (item.id === classItem.id ? { ...item, ...classItem } : item))
        : [...current, classItem];

      return next.sort((left, right) => left.name.localeCompare(right.name));
    });
    setHasLoadedClasses(true);
    classesLoadedAtRef.current = Date.now();
  }

  function removeClass(classID: number) {
    setClasses((current) => current.filter((item) => item.id !== classID));
    classesLoadedAtRef.current = Date.now();
  }

  function upsertProfessor(professor: ProfessorRow) {
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
    professorsLoadedAtRef.current = Date.now();
    allProfessorsLoadedAtRef.current = Date.now();
  }

  function removeProfessor(professorID: number) {
    const filterList = (current: ProfessorRow[]) =>
      current.filter((item) => item.id !== professorID);

    setProfessors(filterList);
    setAllProfessors(filterList);
    professorsLoadedAtRef.current = Date.now();
    allProfessorsLoadedAtRef.current = Date.now();
  }

  function upsertStudent(student: StudentRow) {
    setStudents((current) => {
      const exists = current.some((item) => item.id === student.id);
      const next = exists
        ? current.map((item) => (item.id === student.id ? { ...item, ...student } : item))
        : [...current, student];

      return next.sort((left, right) => left.nome.localeCompare(right.nome));
    });
    setHasLoadedStudents(true);
    studentsLoadedAtRef.current = Date.now();
  }

  function removeStudent(studentID: number) {
    setStudents((current) => current.filter((item) => item.id !== studentID));
    studentsLoadedAtRef.current = Date.now();
  }

  function upsertCustomer(customer: CustomerRow) {
    setCustomers((current) => {
      const exists = current.some((item) => item.id === customer.id);
      const next = exists
        ? current.map((item) => (item.id === customer.id ? { ...item, ...customer } : item))
        : [...current, customer];

      return next.sort((left, right) => left.nome.localeCompare(right.nome));
    });
    setHasLoadedCustomers(true);
    customersLoadedAtRef.current = Date.now();
  }

  function removeCustomer(customerID: number) {
    setCustomers((current) => current.filter((item) => item.id !== customerID));
    customersLoadedAtRef.current = Date.now();
  }

  function invalidateStudentClassLinks() {
    setStudentClassLinksVersion((current) => current + 1);
  }

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
