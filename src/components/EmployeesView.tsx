import { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Edit, 
  CreditCard, 
  Building2, 
  AlertTriangle, 
  CheckCircle2, 
  Printer, 
  X,
  FileSpreadsheet
} from 'lucide-react';
import { Employee, Branch, Department } from '../types';
import { getResidenceStatus } from '../mockData';

interface EmployeesViewProps {
  employees: Employee[];
  branches: Branch[];
  departments: Department[];
  onAddEmployee: (emp: Partial<Employee>) => void;
  onUpdateEmployee: (id: number, emp: Partial<Employee>) => void;
}

export function EmployeesView({
  employees,
  branches,
  departments,
  onAddEmployee,
  onUpdateEmployee,
}: EmployeesViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  
  // Modals state
  const [selectedEmployeeForCard, setSelectedEmployeeForCard] = useState<Employee | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);

  // Form State for Add / Edit
  const [formData, setFormData] = useState({
    fullName: '',
    civilId: '',
    branchId: 1,
    departmentId: 1,
    basicSalary: 400.000,
    dailyHours: 11,
    bankName: 'بنك الكويت الوطني (NBK)',
    iban: '',
    bankTransferAmount: 200.000,
    residenceExpiryDate: '2027-01-01',
    status: 'active' as 'active' | 'inactive',
  });

  const openAddModal = () => {
    setFormData({
      fullName: '',
      civilId: '290000000000',
      branchId: branches[0]?.id || 1,
      departmentId: departments[0]?.id || 1,
      basicSalary: 450.000,
      dailyHours: 11,
      bankName: 'بنك الكويت الوطني (NBK)',
      iban: 'KW00NBOK0000000000000000000000',
      bankTransferAmount: 200.000,
      residenceExpiryDate: '2027-06-30',
      status: 'active',
    });
    setIsAddModalOpen(true);
  };

  const openEditModal = (emp: Employee) => {
    setEditingEmployee(emp);
    setFormData({
      fullName: emp.fullName,
      civilId: emp.civilId,
      branchId: emp.branchId,
      departmentId: emp.departmentId,
      basicSalary: emp.basicSalary,
      dailyHours: emp.dailyHours,
      bankName: emp.bankName,
      iban: emp.iban,
      bankTransferAmount: emp.bankTransferAmount,
      residenceExpiryDate: emp.residenceExpiryDate,
      status: emp.status,
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || formData.civilId.length !== 12) {
      alert('يرجى التأكد من إدخال الاسم كاملاً، والرقم المدني الكويتي المكون من 12 رقماً.');
      return;
    }

    if (editingEmployee) {
      onUpdateEmployee(editingEmployee.id, formData);
      setEditingEmployee(null);
    } else {
      onAddEmployee(formData);
      setIsAddModalOpen(false);
    }
  };

  // Filtered employees
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.civilId.includes(searchTerm);
    const matchesBranch =
      selectedBranch === 'all' || emp.branchId.toString() === selectedBranch;
    const matchesStatus =
      selectedStatus === 'all' || emp.status === selectedStatus;
    return matchesSearch && matchesBranch && matchesStatus;
  });

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-6">
      
      {/* Title & Action Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900">سجل الموظفين والكوادر</h2>
            <span className="text-xs bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full">
              {employees.length} موظفاً
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            إدارة بيانات الموظفين، الأرقام المدنية (12 رقماً)، تفاصيل البنوك، وصلاحيات الإقامة
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة موظف جديد</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="بحث بالاسم أو الرقم المدني..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-3 pr-9 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Branch Filter */}
        <div>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">كافة الفروع</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id.toString()}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="all">كافة الحالات</option>
            <option value="active">نشط فقط</option>
            <option value="inactive">موقوف</option>
          </select>
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-end text-xs font-bold text-slate-500 px-2">
          عرض {filteredEmployees.length} من أصل {employees.length}
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3.5">الموظف والرقم المدني</th>
                <th className="p-3.5">الفرع والقسم</th>
                <th className="p-3.5 text-left">الراتب الأساسي</th>
                <th className="p-3.5">البنك وطريقة الصرف</th>
                <th className="p-3.5">صلاحية الإقامة</th>
                <th className="p-3.5 text-center">الحالة</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-400 bg-slate-50/50">
                    <Users className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    <p className="font-bold text-slate-700">لا يوجد موظفون مسجلون حالياً</p>
                    <p className="text-xs text-slate-400 mt-1">اضغط على زر "إضافة موظف جديد" بالأعلى لتسجيل موظفي المنشأة بعد التصفير.</p>
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                const branch = branches.find((b) => b.id === emp.branchId);
                const department = departments.find((d) => d.id === emp.departmentId);
                const resStatus = getResidenceStatus(emp.residenceExpiryDate);

                return (
                  <tr key={emp.id} className="hover:bg-slate-50/80 transition">
                    {/* Employee & Civil ID */}
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900">{emp.fullName}</div>
                      <div className="font-mono text-[11px] text-slate-500">
                        {emp.civilId}
                      </div>
                    </td>

                    {/* Branch & Dept */}
                    <td className="p-3.5 text-slate-600">
                      <div className="font-semibold text-slate-800">{branch?.name}</div>
                      <div className="text-[11px] text-slate-500">{department?.name}</div>
                    </td>

                    {/* Salary */}
                    <td className="p-3.5 text-left font-mono font-bold text-blue-700">
                      {emp.basicSalary.toFixed(3)} <span className="font-sans text-[11px] text-slate-500">د.ك</span>
                    </td>

                    {/* Bank & Cash Breakdown */}
                    <td className="p-3.5">
                      <div className="text-slate-800 font-medium">{emp.bankName}</div>
                      <div className="text-[11px] text-slate-500">
                        تحويل: <span className="font-mono font-bold text-slate-700">{emp.bankTransferAmount.toFixed(3)}</span> &bull; نقدي: <span className="font-mono font-bold text-slate-700">{(emp.basicSalary - emp.bankTransferAmount).toFixed(3)}</span>
                      </div>
                    </td>

                    {/* Residence Expiry Status */}
                    <td className="p-3.5">
                      <div className="font-mono text-xs text-slate-700 font-semibold mb-0.5">
                        {emp.residenceExpiryDate}
                      </div>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] ${resStatus.colorBadge}`}>
                        {resStatus.label}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="p-3.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          emp.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {emp.status === 'active' ? 'نشط' : 'موقوف'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setSelectedEmployeeForCard(emp)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded text-[11px] border border-blue-200 transition"
                          title="عرض بطاقة الموظف"
                        >
                          بطاقة الموظف
                        </button>
                        <button
                          onClick={() => openEditModal(emp)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded transition"
                          title="تعديل"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          </table>
        </div>
      </div>

      {/* Employee Detail Card Modal (بطاقة الموظف) */}
      {selectedEmployeeForCard && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-blue-900 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-sm">بطاقة بيانات الموظف الرسمية</h3>
              </div>
              <button
                onClick={() => setSelectedEmployeeForCard(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h4 className="text-base font-bold text-slate-900">
                    {selectedEmployeeForCard.fullName}
                  </h4>
                  <p className="text-slate-500 font-mono text-xs">
                    الرقم المدني: {selectedEmployeeForCard.civilId}
                  </p>
                </div>
                <span className="px-2.5 py-1 bg-blue-100 text-blue-800 font-bold rounded-lg text-xs">
                  {selectedEmployeeForCard.status === 'active' ? 'موظف نشط' : 'موقوف'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">الفرع التابع له:</span>
                  <strong className="text-slate-800 font-bold">
                    {branches.find((b) => b.id === selectedEmployeeForCard.branchId)?.name}
                  </strong>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">القسم:</span>
                  <strong className="text-slate-800 font-bold">
                    {departments.find((d) => d.id === selectedEmployeeForCard.departmentId)?.name}
                  </strong>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">الراتب الأساسي:</span>
                  <strong className="text-blue-700 font-mono font-bold text-sm">
                    {selectedEmployeeForCard.basicSalary.toFixed(3)} د.ك
                  </strong>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-500 block text-[10px]">ساعات العمل اليومية:</span>
                  <strong className="text-slate-800 font-bold">
                    {selectedEmployeeForCard.dailyHours} ساعات يومياً
                  </strong>
                </div>
              </div>

              {/* Bank Info */}
              <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100 space-y-1.5">
                <div className="font-bold text-blue-900 text-xs flex items-center justify-between">
                  <span>البيانات المصرفية وطريقة الصرف</span>
                  <span className="text-[11px] font-mono text-blue-700">{selectedEmployeeForCard.bankName}</span>
                </div>
                <div className="font-mono text-[11px] text-slate-700 break-all bg-white p-2 rounded border border-blue-200">
                  IBAN: {selectedEmployeeForCard.iban}
                </div>
                <div className="flex justify-between text-slate-700 pt-1 text-[11px]">
                  <span>المبلغ المحول بنكياً: <strong className="font-mono text-blue-800">{selectedEmployeeForCard.bankTransferAmount.toFixed(3)} د.ك</strong></span>
                  <span>المتبقي نقداً: <strong className="font-mono text-emerald-800">{(selectedEmployeeForCard.basicSalary - selectedEmployeeForCard.bankTransferAmount).toFixed(3)} د.ك</strong></span>
                </div>
              </div>

              {/* Residence Expiry Status */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">تاريخ انتهاء الإقامة:</span>
                  <strong className="font-mono text-slate-900 text-xs">
                    {selectedEmployeeForCard.residenceExpiryDate}
                  </strong>
                </div>
                <div className="pt-1">
                  {(() => {
                    const st = getResidenceStatus(selectedEmployeeForCard.residenceExpiryDate);
                    return (
                      <div className={`p-2 rounded-lg text-center font-bold text-xs ${st.colorBadge}`}>
                        {st.label}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between">
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg text-xs"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>طباعة البطاقة</span>
              </button>
              <button
                onClick={() => setSelectedEmployeeForCard(null)}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Employee Modal */}
      {(isAddModalOpen || editingEmployee) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl border border-slate-200">
            <form onSubmit={handleSave}>
              <div className="bg-slate-900 p-4 text-white flex items-center justify-between">
                <h3 className="font-bold text-sm">
                  {editingEmployee ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingEmployee(null);
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-3 text-xs max-h-[80vh] overflow-y-auto">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">الاسم الكامل (ثلاثي):</label>
                    <input
                      type="text"
                      required
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                      placeholder="مثال: بدر عادل المطيري"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">الرقم المدني (12 رقماً):</label>
                    <input
                      type="text"
                      required
                      maxLength={12}
                      value={formData.civilId}
                      onChange={(e) => setFormData({ ...formData, civilId: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                      placeholder="290010101234"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">الفرع:</label>
                    <select
                      value={formData.branchId}
                      onChange={(e) => setFormData({ ...formData, branchId: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                    >
                      {branches.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">القسم:</label>
                    <select
                      value={formData.departmentId}
                      onChange={(e) => setFormData({ ...formData, departmentId: Number(e.target.value) })}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                    >
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">الراتب الأساسي (د.ك):</label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      value={formData.basicSalary}
                      onChange={(e) => setFormData({ ...formData, basicSalary: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">ساعات العمل اليومية:</label>
                    <input
                      type="number"
                      step="1"
                      min="1"
                      max="12"
                      required
                      value={formData.dailyHours}
                      onChange={(e) => setFormData({ ...formData, dailyHours: parseInt(e.target.value) || 8 })}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">اسم البنك:</label>
                    <select
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                    >
                      <option value="بنك الكويت الوطني (NBK)">بنك الكويت الوطني (NBK)</option>
                      <option value="بيت التمويل الكويتي (KFH)">بيت التمويل الكويتي (KFH)</option>
                      <option value="بنك بوبيان (Boubyan)">بنك بوبيان (Boubyan)</option>
                      <option value="بنك الخليج (Gulf Bank)">بنك الخليج (Gulf Bank)</option>
                      <option value="بنك برقان (Burgan)">بنك برقان (Burgan)</option>
                      <option value="البنك التجاري الكويتي (CBK)">البنك التجاري الكويتي (CBK)</option>
                      <option value="بنك وربة (Warba)">بنك وربة (Warba)</option>
                      <option value="البنك الأهلي الكويتي (ABK)">البنك الأهلي الكويتي (ABK)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">المبلغ المحول للبنك (د.ك):</label>
                    <input
                      type="number"
                      step="0.001"
                      required
                      value={formData.bankTransferAmount}
                      onChange={(e) => setFormData({ ...formData, bankTransferAmount: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-bold mb-1">رقم الآيبان (IBAN):</label>
                    <input
                      type="text"
                      required
                      value={formData.iban}
                      onChange={(e) => setFormData({ ...formData, iban: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                      placeholder="KW00NBOK0000000000000000000000"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">تاريخ انتهاء الإقامة:</label>
                    <input
                      type="date"
                      required
                      value={formData.residenceExpiryDate}
                      onChange={(e) => setFormData({ ...formData, residenceExpiryDate: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">الحالة:</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                    >
                      <option value="active">نشط</option>
                      <option value="inactive">موقوف</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingEmployee(null);
                  }}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs shadow-md"
                >
                  حفظ البيانات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
