import { useState } from 'react';
import { 
  ShieldCheck, 
  Plus, 
  Edit, 
  UserPlus, 
  Lock, 
  CheckCircle2, 
  Key, 
  Eye, 
  EyeOff, 
  Trash2, 
  AlertCircle, 
  X,
  Mail,
  User,
  Building,
  Check
} from 'lucide-react';
import { UserAccount, Branch } from '../types';

interface UsersViewProps {
  users: UserAccount[];
  branches: Branch[];
  currentUserId?: number;
  onAddUser: (u: Partial<UserAccount>) => void;
  onUpdateUser: (u: UserAccount) => void;
  onDeleteUser?: (id: number) => void;
}

export function UsersView({ 
  users, 
  branches, 
  currentUserId,
  onAddUser, 
  onUpdateUser, 
  onDeleteUser 
}: UsersViewProps) {
  const [isAddModal, setIsAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [passwordModalUser, setPasswordModalUser] = useState<UserAccount | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Add User Form State
  const [addForm, setAddForm] = useState({
    username: '',
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'accountant' as 'admin' | 'accountant' | 'viewer',
    status: 'active' as 'active' | 'inactive',
    branchId: null as number | null,
  });
  const [showAddPass, setShowAddPass] = useState(false);

  // Edit User Form State
  const [editForm, setEditForm] = useState({
    id: 0,
    username: '',
    fullName: '',
    email: '',
    newPassword: '',
    confirmNewPassword: '',
    role: 'accountant' as 'admin' | 'accountant' | 'viewer',
    status: 'active' as 'active' | 'inactive',
    branchId: null as number | null,
  });
  const [showEditPass, setShowEditPass] = useState(false);

  // Quick Password Change Modal State
  const [quickPass, setQuickPass] = useState({
    password: '',
    confirmPassword: '',
  });
  const [showQuickPass, setShowQuickPass] = useState(false);

  const showNotification = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  // Open Edit Modal
  const handleOpenEdit = (u: UserAccount) => {
    setEditingUser(u);
    setFormError(null);
    setShowEditPass(false);
    setEditForm({
      id: u.id,
      username: u.username,
      fullName: u.fullName,
      email: u.email,
      newPassword: '',
      confirmNewPassword: '',
      role: u.role,
      status: u.status,
      branchId: u.branchId,
    });
  };

  // Open Quick Password Modal
  const handleOpenPasswordModal = (u: UserAccount) => {
    setPasswordModalUser(u);
    setFormError(null);
    setShowQuickPass(false);
    setQuickPass({ password: '', confirmPassword: '' });
  };

  // Submit Add User
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedUsername = addForm.username.trim().toLowerCase();
    const trimmedEmail = addForm.email.trim();

    if (!trimmedUsername || !addForm.fullName.trim()) {
      setFormError('يرجى ملء اسم المستخدم والاسم الكامل.');
      return;
    }

    if (users.some((u) => u.username.toLowerCase() === trimmedUsername)) {
      setFormError('اسم المستخدم هذا مسجل مسبقاً، يرجى اختيار اسم مستخدم آخر.');
      return;
    }

    if (addForm.password && addForm.password.length < 6) {
      setFormError('كلمة المرور يجب أن لا تقل عن 6 أحرف أو أرقام.');
      return;
    }

    if (addForm.password && addForm.password !== addForm.confirmPassword) {
      setFormError('كلمة المرور وتأكيدها غير متطابقين.');
      return;
    }

    onAddUser({
      username: trimmedUsername,
      fullName: addForm.fullName.trim(),
      email: trimmedEmail,
      password: addForm.password || '159357',
      role: addForm.role,
      status: addForm.status,
      branchId: addForm.branchId,
      createdAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
    });

    setIsAddModal(false);
    setAddForm({
      username: '',
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'accountant',
      status: 'active',
      branchId: null,
    });
    showNotification(`تم إنشاء حساب المستخدم "${trimmedUsername}" بنجاح!`);
  };

  // Submit Edit User
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setFormError(null);

    const trimmedUsername = editForm.username.trim().toLowerCase();
    const trimmedEmail = editForm.email.trim();

    if (!trimmedUsername || !editForm.fullName.trim()) {
      setFormError('يرجى التأكد من إدخال اسم المستخدم والاسم الكامل.');
      return;
    }

    // Check duplicate username if changed
    if (
      trimmedUsername !== editingUser.username.toLowerCase() &&
      users.some((u) => u.id !== editingUser.id && u.username.toLowerCase() === trimmedUsername)
    ) {
      setFormError('اسم المستخدم هذا مستخدم بالفعل بحساب آخر.');
      return;
    }

    if (editForm.newPassword) {
      if (editForm.newPassword.length < 6) {
        setFormError('كلمة المرور الجديدة يجب أن لا تقل عن 6 خانات.');
        return;
      }
      if (editForm.newPassword !== editForm.confirmNewPassword) {
        setFormError('كلمة المرور الجديدة وتأكيدها غير متطابقين.');
        return;
      }
    }

    const updatedUser: UserAccount = {
      ...editingUser,
      username: trimmedUsername,
      fullName: editForm.fullName.trim(),
      email: trimmedEmail,
      role: editForm.role,
      status: editForm.status,
      branchId: editForm.branchId,
      password: editForm.newPassword ? editForm.newPassword : editingUser.password,
    };

    onUpdateUser(updatedUser);
    setEditingUser(null);
    showNotification(`تم تحديث بيانات المستخدم "${updatedUser.fullName}" والبريد الإلكتروني/كلمة المرور بنجاح!`);
  };

  // Submit Quick Password
  const handleQuickPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordModalUser) return;
    setFormError(null);

    if (!quickPass.password || quickPass.password.length < 6) {
      setFormError('كلمة المرور يجب أن لا تقل عن 6 أحرف أو أرقام.');
      return;
    }

    if (quickPass.password !== quickPass.confirmPassword) {
      setFormError('كلمة المرور وتأكيدها غير متطابقين.');
      return;
    }

    const updatedUser: UserAccount = {
      ...passwordModalUser,
      password: quickPass.password,
    };

    onUpdateUser(updatedUser);
    setPasswordModalUser(null);
    showNotification(`تم تغيير كلمة المرور للمستخدم "${passwordModalUser.fullName}" بنجاح!`);
  };

  // Toggle user active status
  const handleToggleStatus = (u: UserAccount) => {
    const newStatus = u.status === 'active' ? 'inactive' : 'active';
    onUpdateUser({ ...u, status: newStatus });
    showNotification(`تم ${newStatus === 'active' ? 'تفعيل' : 'تعطيل'} حساب المستخدم "${u.fullName}".`);
  };

  // Delete user
  const handleDelete = (u: UserAccount) => {
    if (u.id === currentUserId) {
      alert('لا يمكنك حذف حسابك الحالي المسجل به الدخول.');
      return;
    }
    const adminCount = users.filter((x) => x.role === 'admin' && x.status === 'active').length;
    if (u.role === 'admin' && adminCount <= 1) {
      alert('لا يمكن حذف المسؤول الوحيد للنظام.');
      return;
    }
    if (window.confirm(`هل أنت متأكد من حذف حساب المستخدم "${u.fullName}" (${u.username}) نهائياً؟`)) {
      if (onDeleteUser) onDeleteUser(u.id);
      showNotification(`تم حذف المستخدم "${u.fullName}" بنجاح.`);
    }
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
            إدارة حسابات المسؤولين والمحاسبين والمدققين، تعديل البريد الإلكتروني، وتعيين وتشفير كلمات المرور
          </p>
        </div>

        <button
          onClick={() => {
            setIsAddModal(true);
            setFormError(null);
          }}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-md transition active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>إضافة مستخدم جديد</span>
        </button>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2 shadow-xs animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-bold">{successMessage}</span>
        </div>
      )}

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
                <th className="p-3.5 text-center">كلمة المرور</th>
                <th className="p-3.5 text-center">الحالة</th>
                <th className="p-3.5 text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => {
                const branch = branches.find((b) => b.id === u.branchId);
                const isCurrent = u.id === currentUserId;
                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition">
                    <td className="p-3.5 font-mono font-bold text-slate-900">
                      <div className="flex items-center gap-1.5">
                        <span>{u.username}</span>
                        {isCurrent && (
                          <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.2 rounded">
                            أنت
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 font-bold text-slate-800">{u.fullName}</td>
                    <td className="p-3.5 text-slate-600 font-mono">
                      <div className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{u.email || '-'}</span>
                      </div>
                    </td>
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
                      <button
                        onClick={() => handleOpenPasswordModal(u)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-[11px] font-bold transition active:scale-95"
                        title="تغيير كلمة المرور مباشرة"
                      >
                        <Key className="w-3 h-3 text-amber-600" />
                        <span>تغيير</span>
                      </button>
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition ${
                          u.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                        }`}
                        title="تبديل الحالة (نشط / معطل)"
                      >
                        {u.status === 'active' ? 'نشط' : 'معطل'}
                      </button>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg text-[11px] border border-blue-200 flex items-center gap-1 transition"
                          title="تعديل كافة بيانات المستخدم (الاسم، الإيميل، الباسوورد، الصلاحية)"
                        >
                          <Edit className="w-3 h-3" />
                          <span>تعديل</span>
                        </button>
                        {onDeleteUser && (
                          <button
                            onClick={() => handleDelete(u)}
                            disabled={isCurrent}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed"
                            title="حذف المستخدم"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* Edit User Modal (تعديل بيانات المستخدم: الإيميل، الباسوورد، إلخ) */}
      {/* ========================================================= */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-sm">تعديل بيانات المستخدم: {editingUser.fullName}</h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-3.5 text-xs">
              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">اسم المستخدم (للدخول):</label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={editForm.username}
                      onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                      className="w-full pr-8 pl-2.5 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">الاسم الكامل:</label>
                  <input
                    type="text"
                    required
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">البريد الإلكتروني:</label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute right-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full pr-8 pl-2.5 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                    placeholder="user@company.com.kw"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5">يُستخدم لاستعادة الحساب والإشعارات الرسمية</p>
              </div>

              {/* Password change section */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-slate-800 font-bold flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-600" />
                    <span>تغيير كلمة المرور (اختياري):</span>
                  </label>
                  <span className="text-[10px] text-slate-500">اتركها فارغة إذا كنت لا تريد تغييرها</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="relative">
                    <input
                      type={showEditPass ? 'text' : 'password'}
                      placeholder="كلمة مرور جديدة (6 خانات+)"
                      value={editForm.newPassword}
                      onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
                      className="w-full pl-8 pr-2.5 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPass(!showEditPass)}
                      className="absolute left-2 top-2 text-slate-400 hover:text-slate-600"
                    >
                      {showEditPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div>
                    <input
                      type={showEditPass ? 'text' : 'password'}
                      placeholder="تأكيد كلمة المرور الجديدة"
                      value={editForm.confirmNewPassword}
                      onChange={(e) => setEditForm({ ...editForm, confirmNewPassword: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">الصلاحية / الدور:</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white font-bold"
                  >
                    <option value="accountant">محاسب مالي (إعداد الرواتب والشيكات)</option>
                    <option value="admin">مدير نظام كامل (كافة الصلاحيات)</option>
                    <option value="viewer">مشاهد فقط (عرض التقارير والتدقيق)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">حالة الحساب:</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white font-bold"
                  >
                    <option value="active">نشط (مسموح بالدخول)</option>
                    <option value="inactive">معطل (حظر الدخول)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">الفرع المخصص:</label>
                <select
                  value={editForm.branchId || ''}
                  onChange={(e) => setEditForm({ ...editForm, branchId: e.target.value ? Number(e.target.value) : null })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white"
                >
                  <option value="">كافة الفروع (مركزي)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md transition active:scale-95"
                >
                  حفظ التعديلات
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Quick Change Password Modal (تغيير كلمة المرور المباشر) */}
      {/* ========================================================= */}
      {passwordModalUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="bg-amber-600 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-200" />
                <h3 className="font-bold text-sm">تغيير كلمة المرور: {passwordModalUser.username}</h3>
              </div>
              <button
                onClick={() => setPasswordModalUser(null)}
                className="text-amber-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickPasswordSubmit} className="p-5 space-y-3.5 text-xs">
              <p className="text-slate-600 text-xs">
                أدخل كلمة المرور الجديدة للمستخدم <strong className="text-slate-900">{passwordModalUser.fullName}</strong>
              </p>

              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">كلمة المرور الجديدة:</label>
                <div className="relative">
                  <input
                    type={showQuickPass ? 'text' : 'password'}
                    required
                    placeholder="6 خانات على الأقل"
                    value={quickPass.password}
                    onChange={(e) => setQuickPass({ ...quickPass, password: e.target.value })}
                    className="w-full pl-8 pr-2.5 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowQuickPass(!showQuickPass)}
                    className="absolute left-2 top-2 text-slate-400 hover:text-slate-600"
                  >
                    {showQuickPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">تأكيد كلمة المرور:</label>
                <input
                  type={showQuickPass ? 'text' : 'password'}
                  required
                  placeholder="أعد إدخال كلمة المرور"
                  value={quickPass.confirmPassword}
                  onChange={(e) => setQuickPass({ ...quickPass, confirmPassword: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPasswordModalUser(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl text-xs shadow-md transition active:scale-95"
                >
                  تعيين كلمة المرور
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* Add User Modal */}
      {/* ========================================================= */}
      {isAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="bg-slate-900 p-4 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-sm">إضافة مستخدم جديد للنظام</h3>
              </div>
              <button
                onClick={() => setIsAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-3 text-xs">
              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-bold mb-1">اسم المستخدم (للدخول):</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: accountant_2"
                  value={addForm.username}
                  onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">الاسم الكامل:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: عبد العزيز الفهد"
                  value={addForm.fullName}
                  onChange={(e) => setAddForm({ ...addForm, fullName: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">البريد الإلكتروني:</label>
                <input
                  type="email"
                  required
                  placeholder="user@company.com.kw"
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">كلمة المرور:</label>
                  <div className="relative">
                    <input
                      type={showAddPass ? 'text' : 'password'}
                      required
                      placeholder="159357"
                      value={addForm.password}
                      onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                      className="w-full pl-7 pr-2 py-2 border border-slate-300 rounded-lg text-xs font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowAddPass(!showAddPass)}
                      className="absolute left-2 top-2 text-slate-400 hover:text-slate-600"
                    >
                      {showAddPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">تأكيد كلمة المرور:</label>
                  <input
                    type={showAddPass ? 'text' : 'password'}
                    required
                    placeholder="تأكيد كلمة المرور"
                    value={addForm.confirmPassword}
                    onChange={(e) => setAddForm({ ...addForm, confirmPassword: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">الصلاحية / الدور:</label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm({ ...addForm, role: e.target.value as any })}
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
                  value={addForm.branchId || ''}
                  onChange={(e) => setAddForm({ ...addForm, branchId: e.target.value ? Number(e.target.value) : null })}
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

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md transition active:scale-95"
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
