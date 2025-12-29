import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const API_BASE_URL = "http://localhost:4000";

export default function AdminAttendanceGenerator() {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [timetable, setTimetable] = useState({});
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [degrees, setDegrees] = useState([]);
  const [batches, setBatches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [selectedDegree, setSelectedDegree] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");

  // Logic remains exactly the same as your original file
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setError("Please log in to continue.");
      return;
    }
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      setUserProfile(userData);
      if (userData.role !== "admin") {
        setError("Access Denied: Admins only.");
      }
    } catch (err) {
      setError("Failed to load user profile");
    }

    if (!fromDate) {
      const today = new Date();
      setFromDate(today.toISOString().split("T")[0]);
      const nextWeek = new Date(today);
      nextWeek.setDate(today.getDate() + 6);
      setToDate(nextWeek.toISOString().split("T")[0]);
    }
  }, [fromDate]);

  useEffect(() => {
    const fetchDegreesAndBatches = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/admin/timetable/batches`
        );
        if (res.data?.status === "success" && Array.isArray(res.data.data)) {
          const uniqueDegrees = [
            ...new Set(res.data.data.map((b) => b.degree)),
          ];
          setDegrees(uniqueDegrees);
          setBatches(res.data.data);
        }
      } catch (err) {
        setError("Failed to load degrees/batches");
      }
    };
    fetchDegreesAndBatches();
  }, []);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await axios.get(
          `${API_BASE_URL}/api/admin/timetable/departments`
        );
        if (res.data?.status === "success" && Array.isArray(res.data.data)) {
          setDepartments(
            res.data.data.map((d) => ({
              departmentId: d.Deptid,
              departmentCode: d.deptCode,
              departmentName: d.Deptname,
            }))
          );
        }
      } catch (err) {
        setError("Failed to load departments");
      }
    };
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (selectedDegree && selectedBatch && selectedDepartment) {
      const fetchSemesters = async () => {
        const batchData = batches.find(
          (b) => b.batchId === parseInt(selectedBatch)
        );
        if (!batchData) return;
        try {
          const res = await axios.get(
            `${API_BASE_URL}/api/admin/semesters/by-batch-branch`,
            {
              params: {
                degree: selectedDegree,
                batch: batchData.batch,
                branch: batchData.branch,
              },
            }
          );
          if (res.data?.status === "success") setSemesters(res.data.data);
        } catch (err) {
          setError("Failed to load semesters");
        }
      };
      fetchSemesters();
    } else {
      setSemesters([]);
    }
  }, [selectedDegree, selectedBatch, selectedDepartment, batches]);

  const generateDates = () => {
    if (!fromDate || !toDate) return [];
    const dates = [];
    let current = new Date(fromDate);
    const end = new Date(toDate);
    end.setDate(end.getDate() + 1);
    while (current < end) {
      dates.push(current.toISOString().split("T")[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const timeSlots = [
    { periodNumber: 1, time: "9:00–10:00" },
    { periodNumber: 2, time: "10:00–11:00" },
    { periodNumber: 3, time: "11:00–12:00" },
    { periodNumber: 4, time: "12:00–1:00" },
    { periodNumber: 5, time: "1:30–2:30" },
    { periodNumber: 6, time: "2:30–3:30" },
    { periodNumber: 7, time: "3:30–4:30" },
    { periodNumber: 8, time: "4:30–5:30" },
  ];

  const dates = generateDates();

  const handleGenerate = async () => {
    setError(null);
    setTimetable({});
    setSelectedCourse(null);
    if (
      !selectedDegree ||
      !selectedBatch ||
      !selectedDepartment ||
      !selectedSemester
    ) {
      toast.error("Please select all filters");
      return;
    }
    setLoading(true);
    try {
      const batchData = batches.find(
        (b) => b.batchId === parseInt(selectedBatch)
      );
      const res = await axios.get(
        `${API_BASE_URL}/api/admin/attendance/timetable`,
        {
          params: {
            startDate: fromDate,
            endDate: toDate,
            degree: selectedDegree,
            batch: batchData.batch,
            branch: batchData.branch,
            Deptid: selectedDepartment,
            semesterId: selectedSemester,
          },
        }
      );
      if (res.data.data?.timetable) {
        setTimetable(res.data.data.timetable);
        toast.success("Timetable loaded successfully!");
      } else {
        setError("No timetable found");
      }
    } catch (err) {
      toast.error("Failed to load timetable");
    } finally {
      setLoading(false);
    }
  };

  const handleCourseClick = async (
    courseId,
    sectionId,
    date,
    periodNumber,
    courseTitle
  ) => {
    setError(null);
    setStudents([]);
    setSelectedCourse(null);
    try {
      const dayOfWeek = new Date(date)
        .toLocaleDateString("en-US", { weekday: "short" })
        .toUpperCase();
      const res = await axios.get(
        `${API_BASE_URL}/api/admin/attendance/students/${courseId}/all/${dayOfWeek}/${periodNumber}`,
        { params: { date } }
      );
      if (res.data.data) {
        setStudents(
          res.data.data.map((s) => ({
            ...s,
            status: s.status === "OD" ? "OD" : "",
          }))
        );
        setSelectedCourse({
          courseId,
          courseTitle,
          sectionId: "all",
          date,
          periodNumber,
          dayOfWeek,
        });
      }
    } catch (err) {
      toast.error("Failed to load students");
    }
  };

  const toggleOD = (rollnumber) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.rollnumber === rollnumber
          ? { ...s, status: s.status === "OD" ? "" : "OD" }
          : s
      )
    );
  };

  const markAllOD = () => {
    setStudents((prev) => prev.map((s) => ({ ...s, status: "OD" })));
  };

  const handleSave = async () => {
    if (!selectedCourse) return;
    const odStudents = students
      .filter((s) => s.status === "OD")
      .map((s) => ({
        rollnumber: s.rollnumber,
        name: s.name,
        sectionName: s.sectionName || "N/A",
        status: "OD",
      }));
    if (odStudents.length === 0) {
      toast.info("No students marked as On Duty");
      return;
    }
    setSaving(true);
    try {
      await axios.post(
        `${API_BASE_URL}/api/admin/attendance/mark/${selectedCourse.courseId}/${selectedCourse.sectionId}/${selectedCourse.dayOfWeek}/${selectedCourse.periodNumber}`,
        { date: selectedCourse.date, attendances: odStudents }
      );
      toast.success(`On Duty saved for ${odStudents.length} student(s)!`);
    } catch (err) {
      toast.error("Failed to save On Duty status");
    } finally {
      setSaving(false);
    }
  };

  const odCount = students.filter((s) => s.status === "OD").length;

  if (userProfile && userProfile.role !== "admin") {
    return (
      <div className="p-10 text-center text-3xl font-bold text-red-600">
        Unauthorized – Admin Access Only
      </div>
    );
  }

  // --- UI START ---
  const selectClass =
    "w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 appearance-none bg-white";

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header Section from your Screenshot */}
        <div className="p-6 pb-0">
          <h1 className="text-3xl font-extrabold text-[#0f172a] mb-6">
            Timetable Management
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Degree
              </label>
              <select
                value={selectedDegree}
                onChange={(e) => {
                  setSelectedDegree(e.target.value);
                  setSelectedBatch("");
                  setSelectedDepartment("");
                  setSelectedSemester("");
                }}
                className={selectClass}
              >
                <option value="">Select Degree</option>
                {degrees.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Batch
              </label>
              <select
                value={selectedBatch}
                onChange={(e) => {
                  setSelectedBatch(e.target.value);
                  setSelectedDepartment("");
                  setSelectedSemester("");
                }}
                disabled={!selectedDegree}
                className={selectClass}
              >
                <option value="">Select Batch</option>
                {batches
                  .filter((b) => b.degree === selectedDegree)
                  .map((b) => (
                    <option key={b.batchId} value={b.batchId}>
                      {b.batch}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Department
              </label>
              <select
                value={selectedDepartment}
                onChange={(e) => {
                  setSelectedDepartment(e.target.value);
                  setSelectedSemester("");
                }}
                disabled={!selectedBatch}
                className={selectClass}
              >
                <option value="">Select Department</option>
                {departments
                  .filter((d) =>
                    batches.some(
                      (b) =>
                        b.batchId === parseInt(selectedBatch) &&
                        b.branch.toUpperCase() ===
                          d.departmentCode.toUpperCase()
                    )
                  )
                  .map((d) => (
                    <option key={d.departmentId} value={d.departmentId}>
                      {d.departmentName}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Semester
              </label>
              <select
                value={selectedSemester}
                onChange={(e) => setSelectedSemester(e.target.value)}
                disabled={!selectedDepartment}
                className={selectClass}
              >
                <option value="">Select Semester</option>
                {semesters.map((s) => (
                  <option key={s.semesterId} value={s.semesterId}>
                    Semester {s.semesterNumber}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Range and Action */}
          <div className="flex flex-wrap items-end gap-4 pb-8 border-b border-gray-100">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                From Date
              </label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className={selectClass + " w-48"}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                To Date
              </label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                min={fromDate}
                className={selectClass + " w-48"}
              />
            </div>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="bg-[#0f172a] hover:bg-slate-800 text-white px-6 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
            >
              {loading ? "Processing..." : "View Timetable"}
            </button>
          </div>
        </div>

        {/* Timetable Table Styling */}
        <div className="p-6 overflow-x-auto">
          {dates.length > 0 && Object.keys(timetable).length > 0 ? (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600 border-y border-gray-200">
                  <th className="p-4 text-left font-semibold">Date / Day</th>
                  {timeSlots.map((slot) => (
                    <th
                      key={slot.periodNumber}
                      className="p-4 text-center font-semibold border-l border-gray-100"
                    >
                      P{slot.periodNumber} <br />
                      <span className="text-[10px] font-normal text-slate-400">
                        {slot.time}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dates.map((date) => {
                  const dayName = new Date(date).toLocaleDateString("en-US", {
                    weekday: "short",
                  });
                  const periods = (timetable[date] || []).reduce(
                    (acc, p) => ({ ...acc, [p.periodNumber]: p }),
                    {}
                  );
                  return (
                    <tr
                      key={date}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-4 font-medium whitespace-nowrap">
                        {date}{" "}
                        <span className="text-slate-400 ml-2">({dayName})</span>
                      </td>
                      {timeSlots.map((slot) => {
                        const p = periods[slot.periodNumber];
                        return (
                          <td
                            key={slot.periodNumber}
                            className="p-2 border-l border-gray-50 text-center align-middle"
                          >
                            {p ? (
                              <button
                                onClick={() =>
                                  handleCourseClick(
                                    p.courseId,
                                    p.sectionId,
                                    date,
                                    p.periodNumber,
                                    p.courseTitle
                                  )
                                }
                                className={`w-full h-full min-h-[50px] p-2 rounded text-xs font-medium border transition-all ${
                                  selectedCourse?.date === date &&
                                  selectedCourse?.periodNumber ===
                                    p.periodNumber
                                    ? "bg-slate-800 text-white border-slate-800"
                                    : "bg-white text-slate-700 border-gray-200 hover:border-slate-400"
                                }`}
                              >
                                {p.courseTitle}
                              </button>
                            ) : (
                              <span className="text-slate-200">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="py-20 text-center">
              <div className="flex justify-center mb-4 text-slate-200">
                <svg
                  className="w-16 h-16"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="text-slate-400 font-medium">
                Select filters and click View Timetable to begin.
              </p>
            </div>
          )}
        </div>

        {/* Attendance/OD List - Clean Modern Style */}
        {selectedCourse && (
          <div className="p-6 border-t border-gray-100 bg-slate-50/50">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  Mark On Duty (OD)
                </h2>
                <p className="text-sm text-slate-500">
                  {selectedCourse.courseTitle} • Period{" "}
                  {selectedCourse.periodNumber} • {selectedCourse.date}
                </p>
              </div>
              <button
                onClick={markAllOD}
                className="text-sm font-semibold text-slate-600 hover:text-slate-900 bg-white border border-gray-300 px-4 py-2 rounded-md shadow-sm"
              >
                Select All
              </button>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-gray-200">
                  <tr>
                    <th className="p-4 text-left font-semibold text-slate-600">
                      Roll Number
                    </th>
                    <th className="p-4 text-left font-semibold text-slate-600">
                      Name
                    </th>
                    <th className="p-4 text-center font-semibold text-slate-600 w-24">
                      On Duty
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {students.map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="p-4 font-mono text-slate-500">
                        {s.rollnumber}
                      </td>
                      <td className="p-4 font-medium">{s.name}</td>
                      <td className="p-4 text-center">
                        <input
                          type="checkbox"
                          checked={s.status === "OD"}
                          onChange={() => toggleOD(s.rollnumber)}
                          className="w-4 h-4 rounded border-gray-300 text-slate-800 focus:ring-slate-500"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex justify-end items-center gap-4">
              <span className="text-sm text-slate-500 font-medium">
                {odCount} students selected
              </span>
              <button
                onClick={handleSave}
                disabled={saving || odCount === 0}
                className="bg-slate-900 hover:bg-black text-white px-8 py-2.5 rounded-md font-semibold transition-all disabled:opacity-30"
              >
                {saving ? "Saving..." : `Save Attendance`}
              </button>
            </div>
          </div>
        )}
      </div>
      <ToastContainer position="bottom-right" theme="dark" />
    </div>
  );
}
