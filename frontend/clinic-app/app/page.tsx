'use client';
import { useState, useEffect } from 'react';
import {
  Container, Typography, Button, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, IconButton,
  MenuItem, Alert, Snackbar, Box, AppBar, Toolbar, Chip
} from '@mui/material';
import { Add, Edit, Delete, LocalHospital } from '@mui/icons-material';

interface Appointment {
  id?: number;
  patientName: string;
  doctorName: string;
  department: string;
  appointmentTime: string;
}

const DEPARTMENTS = [
  'Cardiology',
  'Neurology',
  'Orthopedics',
  'Dermatology',
  'Pediatrics',
  'Gynecology',
  'Oncology',
  'Psychiatry',
];

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';

const emptyForm: Appointment = {
  patientName: '',
  doctorName: '',
  department: '',
  appointmentTime: '',
};

export default function HomePage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<Appointment>(emptyForm);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const fetchAppointments = async () => {
    try {
      const res = await fetch(`${API_URL}/api/appointments`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      showSnackbar('Failed to load appointments', 'error');
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const showSnackbar = (message: string, severity: 'success' | 'error') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const handleOpenEdit = (appointment: Appointment) => {
    setEditingId(appointment.id!);
    setForm({
      patientName: appointment.patientName,
      doctorName: appointment.doctorName,
      department: appointment.department,
      appointmentTime: appointment.appointmentTime
        ? appointment.appointmentTime.slice(0, 16)
        : '',
    });
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSave = async () => {
    if (!form.patientName || !form.doctorName || !form.department || !form.appointmentTime) {
      showSnackbar('Please fill in all fields', 'error');
      return;
    }

    try {
      const body = {
        ...form,
        appointmentTime: new Date(form.appointmentTime).toISOString(),
      };

      if (editingId !== null) {
        const res = await fetch(`${API_URL}/api/appointments/${editingId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Failed to update');
        showSnackbar('Appointment updated successfully', 'success');
      } else {
        const res = await fetch(`${API_URL}/api/appointments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('Failed to create');
        showSnackbar('Appointment created successfully', 'success');
      }

      handleClose();
      fetchAppointments();
    } catch (err) {
      showSnackbar('An error occurred. Please try again.', 'error');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this appointment?')) return;
    try {
      const res = await fetch(`${API_URL}/api/appointments/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete');
      showSnackbar('Appointment deleted successfully', 'success');
      fetchAppointments();
    } catch (err) {
      showSnackbar('Failed to delete appointment', 'error');
    }
  };

  const formatDateTime = (iso: string) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <AppBar position="static" sx={{ background: 'linear-gradient(90deg, #0ea5e9, #6366f1)' }}>
        <Toolbar>
          <LocalHospital sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700 }}>
            Clinic Appointment System
          </Typography>
          <Chip label={`${appointments.length} Appointments`} color="default" sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)', border: '1px solid' }} />
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 600 }}>
            Appointments
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleOpenAdd}
            sx={{ background: 'linear-gradient(90deg, #0ea5e9, #6366f1)', textTransform: 'none', borderRadius: 2 }}
          >
            New Appointment
          </Button>
        </Box>

        <TableContainer component={Paper} elevation={2} sx={{ borderRadius: 2 }}>
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, backgroundColor: '#f8fafc' } }}>
                <TableCell>#</TableCell>
                <TableCell>Patient Name</TableCell>
                <TableCell>Doctor</TableCell>
                <TableCell>Department</TableCell>
                <TableCell>Date & Time</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {appointments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No appointments found. Click "New Appointment" to add one.
                  </TableCell>
                </TableRow>
              ) : (
                appointments.map((appt, index) => (
                  <TableRow key={appt.id} hover>
                    <TableCell>{index + 1}</TableCell>
                    <TableCell>{appt.patientName}</TableCell>
                    <TableCell>{appt.doctorName}</TableCell>
                    <TableCell>
                      <Chip label={appt.department} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>{formatDateTime(appt.appointmentTime)}</TableCell>
                    <TableCell align="center">
                      <IconButton color="primary" onClick={() => handleOpenEdit(appt)} size="small">
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton color="error" onClick={() => handleDelete(appt.id!)} size="small">
                        <Delete fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>

      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          {editingId !== null ? 'Edit Appointment' : 'New Appointment'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Patient Name"
            value={form.patientName}
            onChange={e => setForm({ ...form, patientName: e.target.value })}
            fullWidth
            required
            margin="dense"
          />
          <TextField
            label="Doctor Name"
            value={form.doctorName}
            onChange={e => setForm({ ...form, doctorName: e.target.value })}
            fullWidth
            required
            margin="dense"
          />
          <TextField
            label="Department"
            value={form.department}
            onChange={e => setForm({ ...form, department: e.target.value })}
            select
            fullWidth
            required
            margin="dense"
          >
            {DEPARTMENTS.map(dept => (
              <MenuItem key={dept} value={dept}>{dept}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="Appointment Date & Time"
            type="datetime-local"
            value={form.appointmentTime}
            onChange={e => setForm({ ...form, appointmentTime: e.target.value })}
            fullWidth
            required
            margin="dense"
            slotProps={{ inputLabel: { shrink: true } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={handleClose} variant="outlined" sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            variant="contained"
            sx={{ background: 'linear-gradient(90deg, #0ea5e9, #6366f1)', textTransform: 'none' }}
          >
            {editingId !== null ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}