import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const API_BASE_URL = "http://localhost:4000";

export default function AttendanceReport() {
  const [filters, setFilters] = useState({
    degree: "Select Degree",
    batch: "Select Batch",
    department: "Select Department",
    semester: "Select Semester",
    fromDate: "2025-10-20",
    toDate: "2025-10-26",
  });
  const [batches, setBatches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [report, setReport] = useState([]);
  const [courses, setCourses] = useState([]);
  const [unmarkedReport, setUnmarkedReport] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const token = localStorage.getItem("token");
  const [minPercentage, setMinPercentage] = useState("");

  // Logic remains identical to your original code
  const fetchWithAuth = async (url) => {
    if (!token)
      throw new Error("No authentication token found. Please log in.");
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      credentials: "include",
    });
    if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
    return await res.json();
  };

  useEffect(() => {
    const loadBatches = async () => {
      try {
        setLoading(true);
        const data = await fetchWithAuth(
          `${API_BASE_URL}/api/admin/attendanceReports/batches`
        );
        if (data.success) setBatches(data.batches || []);
        else throw new Error(data.error || "Failed to fetch batches");
        setError(null);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadBatches();
  }, [token]);

  useEffect(() => {
    const loadDepartments = async () => {
      if (!filters.batch || filters.batch === "Select Batch") {
        setDepartments([]);
        return;
      }
      try {
        setLoading(true);
        const data = await fetchWithAuth(
          `${API_BASE_URL}/api/admin/attendanceReports/departments/${filters.batch}`
        );
        if (data.success) setDepartments(data.departments || []);
        else throw new Error(data.error || "Failed to fetch departments");
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadDepartments();
  }, [filters.batch]);

  useEffect(() => {
    const loadSemesters = async () => {
      if (
        !filters.batch ||
        !filters.department ||
        filters.department === "Select Department"
      ) {
        setSemesters([]);
        return;
      }
      try {
        setLoading(true);
        const data = await fetchWithAuth(
          `${API_BASE_URL}/api/admin/attendanceReports/semesters/${filters.batch}/${filters.department}`
        );
        if (data.success) setSemesters(data.semesters || []);
        else throw new Error(data.error || "Failed to fetch semesters");
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    loadSemesters();
  }, [filters.batch, filters.department]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFilters({ ...filters, [name]: value });
  };

  const handleDownloadExcel = () => {
    if (report.length === 0) {
      alert("No report data to export!");
      return;
    }
    const worksheet = XLSX.utils.json_to_sheet(report);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Report");
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const data = new Blob([excelBuffer], { type: "application/octet-stream" });
    saveAs(
      data,
      `Attendance_Report_${filters.fromDate}_to_${filters.toDate}.xlsx`
    );
  };

  const handleGenerateReport = async () => {
    try {
      setLoading(true);
      setError(null);
      const url = `${API_BASE_URL}/api/admin/attendanceReports/subject-wise/${filters.degree}/${filters.batch}/${filters.department}/${filters.semester}?fromDate=${filters.fromDate}&toDate=${filters.toDate}`;
      const data = await fetchWithAuth(url);
      if (data.success) {
        setReport(data.report || []);
        setCourses(data.courses || []);
        setUnmarkedReport([]); // Clear black box if generating main report
      } else throw new Error(data.error || "Failed to generate report");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBlackBoxReport = async () => {
    try {
      setLoading(true);
      setError(null);
      setReport([]);
      setCourses([]);
      const url = `${API_BASE_URL}/api/admin/attendanceReports/unmarked/${filters.batch}/${filters.semester}?fromDate=${filters.fromDate}&toDate=${filters.toDate}`;
      const data = await fetchWithAuth(url);
      if (data.success) setUnmarkedReport(data.report || []);
      else throw new Error(data.error || "Failed to generate black box report");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- UI STYLES ---
  const selectClass =
    "w-full border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-400 appearance-none bg-white disabled:bg-gray-50 disabled:text-gray-400";
  const labelClass =
    "text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5";
  const thClass =
    "p-4 text-center font-semibold border-l border-gray-200 first:border-l-0 text-slate-600";

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header & Filter Section */}
        <div className="p-6">
          <h1 className="text-3xl font-extrabold text-[#0f172a] mb-8">
            Attendance Reports
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            <div className="flex flex-col">
              <label className={labelClass}>Degree</label>
              <select
                name="degree"
                value={filters.degree}
                onChange={handleInputChange}
                className={selectClass}
              >
                <option value="Select Degree">Select Degree</option>
                <option value="BE">BE</option>
                <option value="B.Tech">B.Tech</option>
                <option value="ME">ME</option>
                <option value="M.Tech">M.Tech</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className={labelClass}>Batch</label>
              <select
                name="batch"
                value={filters.batch}
                onChange={handleInputChange}
                disabled={filters.degree === "Select Degree"}
                className={selectClass}
              >
                <option value="Select Batch">Select Batch</option>
                {batches.map((b) => (
                  <option key={b.batchId} value={b.batchId}>
                    {b.batch}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className={labelClass}>Department</label>
              <select
                name="department"
                value={filters.department}
                onChange={handleInputChange}
                disabled={filters.batch === "Select Batch"}
                className={selectClass}
              >
                <option value="Select Department">Select Department</option>
                {departments.map((d) => (
                  <option key={d.departmentId} value={d.departmentId}>
                    {d.departmentName} ({d.departmentCode})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col">
              <label className={labelClass}>Semester</label>
              <select
                name="semester"
                value={filters.semester}
                onChange={handleInputChange}
                disabled={filters.department === "Select Department"}
                className={selectClass}
              >
                <option value="Select Semester">Select Semester</option>
                {semesters.map((s) => (
                  <option key={s.semesterId} value={s.semesterId}>
                    Semester {s.semesterNumber}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-6 pb-8 border-b border-gray-100">
            <div className="flex flex-col">
              <label className={labelClass}>From Date</label>
              <input
                type="date"
                name="fromDate"
                value={filters.fromDate}
                onChange={handleInputChange}
                className={selectClass + " w-44"}
              />
            </div>
            <div className="flex flex-col">
              <label className={labelClass}>To Date</label>
              <input
                type="date"
                name="toDate"
                value={filters.toDate}
                min={filters.fromDate}
                onChange={handleInputChange}
                className={selectClass + " w-44"}
              />
            </div>
            <div className="flex flex-col">
              <label className={labelClass}>Filter By % (Below)</label>
              <input
                type="number"
                placeholder="e.g. 75"
                value={minPercentage}
                onChange={(e) => setMinPercentage(e.target.value)}
                className={selectClass + " w-32"}
              />
            </div>

            <div className="flex gap-3 ml-auto">
              <button
                onClick={handleGenerateReport}
                disabled={loading || filters.semester === "Select Semester"}
                className="bg-[#0f172a] hover:bg-slate-800 text-white px-6 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading ? "Generating..." : "Generate Report"}
              </button>
              <button
                onClick={handleBlackBoxReport}
                disabled={loading || filters.semester === "Select Semester"}
                className="bg-white border border-gray-300 text-slate-700 hover:bg-gray-50 px-6 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
              >
                Black Box
              </button>
              <button
                onClick={handleDownloadExcel}
                disabled={report.length === 0 || loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
              >
                Export Excel
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mx-6 mb-6 p-4 bg-red-50 border-l-4 border-red-400 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Main Report Table */}
        {report.length > 0 && (
          <div className="p-6 pt-0 overflow-x-auto">
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-y border-gray-200">
                  <th className="p-4 text-left font-semibold text-slate-600 sticky left-0 bg-slate-50 z-10">
                    Register No
                  </th>
                  <th className="p-4 text-left font-semibold text-slate-600 sticky left-24 bg-slate-50 z-10">
                    Student Name
                  </th>
                  {courses.map((courseCode) => (
                    <React.Fragment key={courseCode}>
                      <th className={thClass}>
                        {courseCode}
                        <br />
                        <span className="text-[10px] text-slate-400">
                          Cond.
                        </span>
                      </th>
                      <th className={thClass}>
                        {courseCode}
                        <br />
                        <span className="text-[10px] text-slate-400">
                          Attd.
                        </span>
                      </th>
                      <th className={thClass}>
                        {courseCode}
                        <br />
                        <span className="text-[10px] text-slate-400">%</span>
                      </th>
                    </React.Fragment>
                  ))}
                  <th className={`${thClass} bg-slate-100`}>Total Cond.</th>
                  <th className={`${thClass} bg-slate-100`}>Total Attd.</th>
                  <th className={`${thClass} bg-slate-100 text-slate-900`}>
                    Total %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {report
                  .filter(
                    (s) =>
                      !minPercentage ||
                      parseFloat(s["Total Percentage %"]) <
                        parseFloat(minPercentage)
                  )
                  .map((student, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-4 font-mono text-slate-500 sticky left-0 bg-white group-hover:bg-slate-50">
                        {student.RegisterNumber}
                      </td>
                      <td className="p-4 font-medium text-slate-900 sticky left-24 bg-white group-hover:bg-slate-50 whitespace-nowrap">
                        {student.StudentName}
                      </td>
                      {courses.map((courseCode) => [
                        <td
                          key={`c-${courseCode}`}
                          className="p-4 text-center border-l border-gray-50"
                        >
                          {student[`${courseCode} Conducted Periods`] || 0}
                        </td>,
                        <td
                          key={`a-${courseCode}`}
                          className="p-4 text-center border-l border-gray-50"
                        >
                          {student[`${courseCode} Attended Periods`] || 0}
                        </td>,
                        <td
                          key={`p-${courseCode}`}
                          className="p-4 text-center border-l border-gray-50 font-semibold"
                        >
                          {student[`${courseCode} Att%`] || "0.00"}
                        </td>,
                      ])}
                      <td className="p-4 text-center border-l border-gray-50 bg-slate-50/30">
                        {student["Total Conducted Periods"]}
                      </td>
                      <td className="p-4 text-center border-l border-gray-50 bg-slate-50/30">
                        {student["Total Attended Periods"]}
                      </td>
                      <td className="p-4 text-center border-l border-gray-50 bg-slate-50/50 font-bold text-slate-900">
                        {student["Total Percentage %"]}%
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Black Box Report Table */}
        {unmarkedReport.length > 0 && (
          <div className="p-6 pt-0">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <h2 className="text-lg font-bold text-slate-800">
                Unmarked Attendance (Black Box)
              </h2>
            </div>
            <div className="overflow-hidden border border-gray-200 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-gray-200">
                  <tr>
                    <th className="p-4 text-left font-semibold text-slate-600">
                      Register Number
                    </th>
                    <th className="p-4 text-left font-semibold text-slate-600">
                      Student Name
                    </th>
                    <th className="p-4 text-left font-semibold text-slate-600">
                      Date
                    </th>
                    <th className="p-4 text-center font-semibold text-slate-600">
                      Period
                    </th>
                    <th className="p-4 text-left font-semibold text-slate-600">
                      Course
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {unmarkedReport.map((entry, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-red-50/30 transition-colors"
                    >
                      <td className="p-4 font-mono text-slate-500">
                        {entry.RegisterNumber}
                      </td>
                      <td className="p-4 font-medium">{entry.StudentName}</td>
                      <td className="p-4 text-slate-600">{entry.Date}</td>
                      <td className="p-4 text-center font-semibold">
                        {entry.PeriodNumber}
                      </td>
                      <td className="p-4 text-slate-600 italic">
                        {entry.Course}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Empty State */}
        {report.length === 0 && unmarkedReport.length === 0 && !loading && (
          <div className="py-24 text-center">
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
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="text-slate-400 font-medium">
              Select criteria and generate a report to view data.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
