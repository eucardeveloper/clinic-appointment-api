'use client';
import { useState, useEffect } from 'react';
import {
  Box, Typography, Button, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton,
  MenuItem, Alert, Snackbar, Chip, Card, CardContent, Avatar,
  Fade, Tooltip
} from '@mui/material';
import {
  Add, Edit, Delete, LocalHospital, People, CalendarMonth,
  MedicalServices, Schedule, TrendingUp
} from '@mui/icons-material';

interface Appointment {
  id?: number;
  patientName: string;
  doctorName: string;
  department: string;
  appointmentTime: string;
}

const DEPARTMENTS = [
  'Cardiology', 'Neurology', 'Orthopedics', 'Dermatology',
  'Pediatrics', 'Gynecology', 'Oncology', 'Psychiatry',
];

const DEPT_COLORS: Record<string, string> = {
  Cardiology: '#ef4444', Neurology: '#8b5cf6', Orthopedics: '#f97316',
  Dermatology: '#ec4899', Pediatrics: '#06b6d4', Gynecology: '#a855f7',
  Oncology: '#14b8a6', Psychiatry: '#6366f1',
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

const emptyForm: Appointment = { patientName: '', doctorName: '', department: '', appointmentTime: '' };

export default function HomePage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Appointment>(emptyForm);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  const fetchAppointments = async () => {
    try {
      const res = await fetch(`${API_URL}/api/appointments`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      setAppointments(Array.isArray(data) ? data : []);
    } catch {
      showSnackbar('Failed to load appointments', 'error');
    }
  };

  useEffect(() => { fetchAppointments(); }, []);

  const showSnackbar = (message: string, severity: 'success' | 'error') =>
    setSnackbar({ open: true, message, severity });

  const handleOpenAdd = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };

  const handleOpenEdit = (a: Appointment) => {
    setEditingId(a.id!);
    setForm({ patientName: a.patientName, doctorName: a.doctorName, department: a.department, appointmentTime: a.appointmentTime?.slice(0, 16) ?? '' });
    setDialogOpen(true);
  };

  const handleClose = () => { setDialogOpen(false); setForm(emptyForm); setEditingId(null); };

  const handleSave = async () => {
    if (!form.patientName || !form.doctorName || !form.department || !form.appointmentTime) {
      showSnackbar('Please fill in all fields', 'error'); return;
    }
    try {
      const body = { ...form, appointmentTime: new Date(form.appointmentTime).toISOString() };
      const url = editingId !== null ? `${API_URL}/api/appointments/${editingId}` : `${API_URL}/api/appointments`;
      const method = editingId !== null ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error();
      showSnackbar(editingId !== null ? 'Appointment updated!' : 'Appointment created!', 'success');
      handleClose(); fetchAppointments();
    } catch { showSnackbar('An error occurred', 'error'); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this appointment?')) return;
    try {
      const res = await fetch(`${API_URL}/api/appointments/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      showSnackbar('Appointment deleted', 'success'); fetchAppointments();
    } catch { showSnackbar('Failed to delete', 'error'); }
  };

  const formatDate = (iso: string) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const todayCount = appointments.filter(a => new Date(a.appointmentTime).toDateString() === new Date().toDateString()).length;
  const depts = [...new Set(appointments.map(a => a.department))].length;

  const stats = [
    { label: 'Total Appointments', value: appointments.length, icon: <CalendarMonth />, color: '#0ea5e9' },
    { label: 'Today', value: todayCount, icon: <Schedule />, color: '#22c55e' },
    { label: 'Departments', value: depts, icon: <MedicalServices />, color: '#a855f7' },
    { label: 'Active Doctors', value: [...new Set(appointments.map(a => a.doctorName))].length, icon: <People />, color: '#f97316' },
  ];

  return (
    <Box sx={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0d1117 0%, #0d1f3c 60%, #0a0f1e 100%)', color: '#fff' }}>

      {/* Header */}
      <Box sx={{ borderBottom: '1px solid rgba(255,255,255,0.07)', px: 4, py: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', backdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 100, background: 'rgba(13,17,23,0.8)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', borderRadius: 2, p: 1, display: 'flex' }}>
            <LocalHospital sx={{ fontSize: 22 }} />
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 700, fontSize: 18, lineHeight: 1.2 }}>Clinic Appointment System</Typography>
            <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1 }}>Patient Management Dashboard</Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleOpenAdd}
          sx={{ background: 'linear-gradient(90deg, #0ea5e9, #6366f1)', textTransform: 'none', borderRadius: 2, px: 2.5, fontWeight: 600, boxShadow: '0 4px 20px rgba(14,165,233,0.3)', '&:hover': { boxShadow: '0 4px 28px rgba(14,165,233,0.5)' } }}
        >
          New Appointment
        </Button>
      </Box>

      <Box sx={{ px: 4, py: 4, maxWidth: 1400, mx: 'auto' }}>

        {/* Stats */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 4 }}>
          {stats.map((s, i) => (
            <Fade in key={i} timeout={400 + i * 100}>
              <Card sx={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, backdropFilter: 'blur(20px)', transition: 'transform 0.2s, box-shadow 0.2s', '&:hover': { transform: 'translateY(-2px)', boxShadow: `0 8px 30px ${s.color}22` } }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2.5, '&:last-child': { pb: 2.5 } }}>
                  <Avatar sx={{ background: `${s.color}22`, color: s.color, width: 48, height: 48 }}>{s.icon}</Avatar>
                  <Box>
                    <Typography sx={{ fontSize: 28, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{s.value}</Typography>
                    <Typography sx={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', mt: 0.3 }}>{s.label}</Typography>
                  </Box>
                </CardContent>
              </Card>
            </Fade>
          ))}
        </Box>

        {/* Table */}
        <Card sx={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 3, backdropFilter: 'blur(20px)' }}>
          <Box sx={{ px: 3, py: 2.5, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 1 }}>
            <TrendingUp sx={{ color: '#0ea5e9', fontSize: 20 }} />
            <Typography sx={{ fontWeight: 600, fontSize: 16 }}>Appointments</Typography>
            <Chip label={appointments.length} size="small" sx={{ ml: 1, background: 'rgba(14,165,233,0.15)', color: '#38bdf8', border: '1px solid rgba(14,165,233,0.3)', height: 22, fontSize: 12 }} />
          </Box>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  {['#', 'Patient', 'Doctor', 'Department', 'Date & Time', 'Actions'].map(h => (
                    <TableCell key={h} sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', borderColor: 'rgba(255,255,255,0.06)', py: 1.5 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {appointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 8, borderColor: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.3)' }}>
                      <CalendarMonth sx={{ fontSize: 40, mb: 1, opacity: 0.3, display: 'block', mx: 'auto' }} />
                      No appointments yet. Click "New Appointment" to get started.
                    </TableCell>
                  </TableRow>
                ) : (
                  appointments.map((a, i) => (
                    <TableRow key={a.id} sx={{ '&:hover': { background: 'rgba(255,255,255,0.03)' }, transition: 'background 0.15s' }}>
                      <TableCell sx={{ borderColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.35)', fontSize: 13 }}>{i + 1}</TableCell>
                      <TableCell sx={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                          <Avatar sx={{ width: 32, height: 32, fontSize: 13, background: 'linear-gradient(135deg, #0ea5e9, #6366f1)', fontWeight: 700 }}>
                            {a.patientName.charAt(0).toUpperCase()}
                          </Avatar>
                          <Typography sx={{ color: '#fff', fontSize: 14, fontWeight: 500 }}>{a.patientName}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ borderColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.75)', fontSize: 14 }}>Dr. {a.doctorName}</TableCell>
                      <TableCell sx={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                        <Chip label={a.department} size="small" sx={{ background: `${DEPT_COLORS[a.department] ?? '#6366f1'}22`, color: DEPT_COLORS[a.department] ?? '#a5b4fc', border: `1px solid ${DEPT_COLORS[a.department] ?? '#6366f1'}44`, fontSize: 12, fontWeight: 600 }} />
                      </TableCell>
                      <TableCell sx={{ borderColor: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{formatDate(a.appointmentTime)}</TableCell>
                      <TableCell sx={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                        <Tooltip title="Edit">
                          <IconButton onClick={() => handleOpenEdit(a)} size="small" sx={{ color: '#0ea5e9', '&:hover': { background: 'rgba(14,165,233,0.1)' } }}>
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton onClick={() => handleDelete(a.id!)} size="small" sx={{ color: '#ef4444', '&:hover': { background: 'rgba(239,68,68,0.1)' }, ml: 0.5 }}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      </Box>

      {/* Dialog */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { background: '#0d1f3c', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 3, color: '#fff' } } }}>
        <DialogTitle sx={{ fontWeight: 700, fontSize: 18, pb: 1, borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {editingId !== null ? '✏️ Edit Appointment' : '➕ New Appointment'}
        </DialogTitle>
        <DialogContent sx={{ pt: 3, display: 'flex', flexDirection: 'column', gap: 2 }}>
          {[
            { label: 'Patient Name', key: 'patientName' },
            { label: 'Doctor Name', key: 'doctorName' },
          ].map(f => (
            <TextField
              key={f.key}
              label={f.label}
              value={form[f.key as keyof Appointment]}
              onChange={e => setForm({ ...form, [f.key]: e.target.value })}
              fullWidth required margin="dense"
              sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' }, '&.Mui-focused fieldset': { borderColor: '#0ea5e9' } }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' }, '& .MuiInputLabel-root.Mui-focused': { color: '#0ea5e9' } }}
            />
          ))}
          <TextField
            label="Department" value={form.department}
            onChange={e => setForm({ ...form, department: e.target.value })}
            select fullWidth required margin="dense"
            sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' }, '&.Mui-focused fieldset': { borderColor: '#0ea5e9' } }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' }, '& .MuiInputLabel-root.Mui-focused': { color: '#0ea5e9' }, '& .MuiSelect-icon': { color: 'rgba(255,255,255,0.5)' } }}
            slotProps={{ select: { MenuProps: { slotProps: { paper: { sx: { background: '#0d1f3c', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } } } } } }}
          >
            {DEPARTMENTS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
          </TextField>
          <TextField
            label="Date & Time" type="datetime-local" value={form.appointmentTime}
            onChange={e => setForm({ ...form, appointmentTime: e.target.value })}
            fullWidth required margin="dense"
            slotProps={{ inputLabel: { shrink: true } }}
            sx={{ '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: 'rgba(255,255,255,0.15)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' }, '&.Mui-focused fieldset': { borderColor: '#0ea5e9' } }, '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.5)' }, '& .MuiInputLabel-root.Mui-focused': { color: '#0ea5e9' }, colorScheme: 'dark' }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1, borderTop: '1px solid rgba(255,255,255,0.07)', mt: 1 }}>
          <Button onClick={handleClose} variant="outlined" sx={{ textTransform: 'none', borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.7)', '&:hover': { borderColor: 'rgba(255,255,255,0.4)', background: 'rgba(255,255,255,0.05)' } }}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" sx={{ background: 'linear-gradient(90deg, #0ea5e9, #6366f1)', textTransform: 'none', fontWeight: 600, px: 3, boxShadow: '0 4px 15px rgba(14,165,233,0.3)' }}>
            {editingId !== null ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} variant="filled">{snackbar.message}</Alert>
      </Snackbar>
    </Box>
  );
}