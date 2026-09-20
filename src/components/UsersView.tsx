import { useState } from 'react';
import { ShieldCheck, Plus, Edit, UserPlus, Lock, CheckCircle2 } from 'lucide-react';
import { UserAccount, Branch } from '../types';

interface UsersViewProps {
  users: UserAccount[];
  branches: Branch[];
  onAddUser: (u: Partial<UserAccount>) => void;
}

export function UsersView({ users, branches, onAddUser }: UsersViewProps) {
  const [isAddModal, setIsAddModal] = useState(false);
  const [form, setForm] = useState({
    username: '',
    fullName: '',
    email: '',
    role: 'accountant' as 'admin' | 'accountant' | 'viewer',
    status: 'active' as 'active' | 'inactive',
    branchId: null as number | null,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.fullName) return;
    onAddUser({
      ...form,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    });
    setIsAddModal(false);
    setForm({
      username: '',
      fullName: '',
      email: '',
      role: 'accountant',
      status: 'active',
      branchId: null,
    });
  };

  return (
    <div className="max-w-7xl mx-auto py-6 space-y-6">
      
      {/* Title & Action Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900">إدارة مستخدمي النظام والصلاحيات</h2>
            <span className="text-xs bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
              {users.length} مستخدمين مسجلين
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            صلاحيات الأدمن، المحاسب المالي، ومراقبي التدقيق مع تشفير كلمات المرور بـ bcrypt
          </p>
        </div>

        <button
          onClick={() => setIsAddModal(true)}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>إضافة مستخدم جديد</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-100 font-bold text-slate-700">
              <tr>
                <th className="p-3.5">اسم المستخدم</th>
                <th className="p-3.5">الاسم الكامل</th>
                <th className="p-3.5">البريد الإلكتروني</th>
                <th className="p-3.5">الدور والصلاحية</th>
                <th className="p-3.5">الفرع المخصص</th>
                <th className="p-3.5 text-center">الحالة</th>
                <th className="p-3.5 text-center">الإجراء</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const branch = branches.find((b) => b.id === u.branchId);
                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 font-mono font-bold text-slate-900">{u.username}</td>
                    <td className="p-3.5 font-bold text-slate-800">{u.fullName}</td>
                    <td className="p-3.5 text-slate-500 font-mono">{u.email}</td>
                    <td className="p-3.5">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          u.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : u.role === 'accountant'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {u.role === 'admin'
                          ? 'مدير عام (Admin)'
                          : u.role === 'accountant'
                          ? 'محاسب مالي'
                          : 'مشاهد / مدقق'}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600">
                      {branch ? branch.name : 'كافة الفروع (مركزي)'}
                    </td>
                    <td className="p-3.5 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {u.status === 'active' ? 'نشط' : 'معطل'}
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => alert(`تعديل صلاحيات المستخدم: ${u.fullName}`)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded text-[11px]"
                      >
                        تعديل
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 p-5 space-y-4">
            <h3 className="font-bold text-base text-slate-900">إضافة مستخدم جديد للنظام</h3>
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم المستخدم (للدخول):</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: accountant_2"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">الاسم الكامل:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: عبد العزيز الفهد"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">البريد الإلكتروني:</label>
                <input
                  type="email"
                  required
                  placeholder="user@company.com.kw"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">الصلاحية / الدور:</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as any })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="accountant">محاسب مالي (إعداد الرواتب والقسائم)</option>
                  <option value="admin">مدير نظام كامل (كافة الصلاحيات)</option>
                  <option value="viewer">مشاهد فقط (عرض التقارير والتدقيق)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">الفرع المخصص (اختياري):</label>
                <select
                  value={form.branchId || ''}
                  onChange={(e) => setForm({ ...form, branchId: e.target.value ? Number(e.target.value) : null })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="">كافة الفروع (مركزي)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModal(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 font-bold rounded-lg text-xs"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-xs shadow-md"
                >
                  إنشاء الحساب
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
