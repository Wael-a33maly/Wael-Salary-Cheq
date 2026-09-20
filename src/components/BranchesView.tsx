import { useState } from 'react';
import { Building2, Plus, Edit, FolderPlus, Layers, CheckCircle2 } from 'lucide-react';
import { Branch, Department, Employee } from '../types';

interface BranchesViewProps {
  branches: Branch[];
  departments: Department[];
  employees: Employee[];
  onAddBranch: (b: Partial<Branch>) => void;
  onUpdateBranch: (id: number, b: Partial<Branch>) => void;
  onAddDepartment: (d: Partial<Department>) => void;
}

export function BranchesView({
  branches,
  departments,
  employees,
  onAddBranch,
  onUpdateBranch,
  onAddDepartment,
}: BranchesViewProps) {
  const [selectedBranchId, setSelectedBranchId] = useState<number>(branches[0]?.id || 1);
  const [isAddBranchModal, setIsAddBranchModal] = useState(false);
  const [isAddDeptModal, setIsAddDeptModal] = useState(false);

  // Form states
  const [branchForm, setBranchForm] = useState({ code: '', name: '', status: 'active' as 'active' | 'inactive' });
  const [deptForm, setDeptForm] = useState({ name: '', branchId: 1, status: 'active' as 'active' | 'inactive' });

  const handleAddBranchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchForm.code || !branchForm.name) return;
    onAddBranch(branchForm);
    setIsAddBranchModal(false);
    setBranchForm({ code: '', name: '', status: 'active' });
  };

  const handleAddDeptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deptForm.name) return;
    onAddDepartment({ ...deptForm, branchId: selectedBranchId });
    setIsAddDeptModal(false);
    setDeptForm({ name: '', branchId: 1, status: 'active' });
  };

  const selectedBranch = branches.find((b) => b.id === selectedBranchId) || branches[0];
  const branchDepartments = departments.filter((d) => d.branchId === selectedBranchId);
  const branchEmployees = employees.filter((e) => e.branchId === selectedBranchId);
  const branchTotalSalary = branchEmployees.reduce((sum, e) => sum + e.basicSalary, 0);

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-6">
      
      {/* Title & Actions Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900">هيكل الفروع والأقسام الإدارية</h2>
            <span className="text-xs bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
              {branches.length} فروع &bull; {departments.length} أقسام
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إدارة فروع الشركة في محافظات الكويت وربط الأقسام وتوزيع الكوادر
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddBranchModal(true)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة فرع جديد</span>
          </button>
        </div>
      </div>

      {/* Branches Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {branches.map((b) => {
          const isSelected = b.id === selectedBranchId;
          const count = employees.filter((e) => e.branchId === b.id).length;
          const sum = employees
            .filter((e) => e.branchId === b.id)
            .reduce((acc, curr) => acc + curr.basicSalary, 0);

          return (
            <div
              key={b.id}
              onClick={() => setSelectedBranchId(b.id)}
              className={`p-4 rounded-xl border transition cursor-pointer relative ${
                isSelected
                  ? 'bg-blue-50/70 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                  : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                  {b.code}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    b.status === 'active'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {b.status === 'active' ? 'نشط' : 'موقوف'}
                </span>
              </div>

              <h4 className="text-sm font-bold text-slate-900 mb-1">{b.name}</h4>

              <div className="flex justify-between items-center text-xs text-slate-500 mt-3 pt-2 border-t border-slate-100">
                <span>{count} موظفين</span>
                <span className="font-mono font-bold text-blue-700">{sum.toFixed(3)} د.ك</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Branch Details & Departments */}
      {selectedBranch && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left / Main: Departments List */}
          <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  أقسام {selectedBranch.name} ({branchDepartments.length} أقسام)
                </h3>
                <p className="text-[11px] text-slate-500">
                  الأقسام التنظيمية المعتمدة التابعة لهذا الفرع
                </p>
              </div>

              <button
                onClick={() => setIsAddDeptModal(true)}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3 py-1.5 rounded-lg border border-slate-200 transition"
              >
                <FolderPlus className="w-3.5 h-3.5 text-blue-600" />
                <span>إضافة قسم للفرع</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {branchDepartments.map((dept) => {
                const deptEmps = branchEmployees.filter((e) => e.departmentId === dept.id);
                return (
                  <div
                    key={dept.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900">{dept.name}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {deptEmps.length} موظفين معينين في هذا القسم
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      نشط
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Branch Employees Preview */}
            <div className="pt-4 border-t border-slate-100">
              <h4 className="font-bold text-xs text-slate-800 mb-2">
                موظفو هذا الفرع ({branchEmployees.length})
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold">
                    <tr>
                      <th className="p-2">الموظف</th>
                      <th className="p-2">الرقم المدني</th>
                      <th className="p-2">القسم</th>
                      <th className="p-2 text-left">الراتب الأساسي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {branchEmployees.map((e) => (
                      <tr key={e.id}>
                        <td className="p-2 font-bold text-slate-800">{e.fullName}</td>
                        <td className="p-2 font-mono text-slate-500">{e.civilId}</td>
                        <td className="p-2 text-slate-600">
                          {departments.find((d) => d.id === e.departmentId)?.name}
                        </td>
                        <td className="p-2 text-left font-mono font-bold text-blue-700">
                          {e.basicSalary.toFixed(3)} د.ك
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right: Branch Info Summary */}
          <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm pb-2 border-b border-slate-100">
              ملخص المؤشرات المالية للفرع
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="text-slate-500 text-[11px]">كود الفرع الرسمي:</div>
                <div className="text-sm font-mono font-bold text-slate-900 mt-0.5">
                  {selectedBranch.code}
                </div>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                <div className="text-blue-700 text-[11px]">إجمالي الرواتب الأساسية للفرع:</div>
                <div className="text-lg font-mono font-bold text-blue-900 mt-0.5">
                  {branchTotalSalary.toFixed(3)} د.ك
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl">
                <div className="text-slate-500 text-[11px]">عدد الكوادر العاملة:</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">
                  {branchEmployees.length} موظفاً نشطاً
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Add Branch Modal */}
      {isAddBranchModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="font-bold text-base text-slate-900">إضافة فرع جديد</h3>
            <form onSubmit={handleAddBranchSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">كود الفرع (فريد):</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: JHR-05"
                  value={branchForm.code}
                  onChange={(e) => setBranchForm({ ...branchForm, code: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم الفرع:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: فرع الجهراء - مجمع أوتاد"
                  value={branchForm.name}
                  onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddBranchModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 font-bold rounded-lg text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs"
                >
                  حفظ الفرع
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Department Modal */}
      {isAddDeptModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="font-bold text-base text-slate-900">
              إضافة قسم جديد لـ {selectedBranch.name}
            </h3>
            <form onSubmit={handleAddDeptSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم القسم:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: إدارة المخزون، خدمة العملاء"
                  value={deptForm.name}
                  onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddDeptModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 font-bold rounded-lg text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs"
                >
                  حفظ القسم
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
