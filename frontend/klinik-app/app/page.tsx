'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box, AppBar, Toolbar, Typography, Container, Button, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, Chip,
  Avatar, ThemeProvider, createTheme, CssBaseline, Alert, Snackbar,
  CircularProgress, Tooltip, Divider, Stack, Fab, InputAdornment,
} from '@mui/material';
import MenuItem from '@mui/material/MenuItem';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PersonIcon from '@mui/icons-material/Person';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import RefreshIcon from '@mui/icons-material/Refresh';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import DomainIcon from '@mui/icons-material/Domain';
import FilterListIcon from '@mui/icons-material/FilterList';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL
  ? `https://${process.env.NEXT_PUBLIC_API_URL}`
  : 'https://klinik-terminverwaltung-api-production.up.railway.app';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#0284c7', dark: '#0369a1', light: '#38bdf8' },
    secondary: { main: '#10b981', dark: '#059669', light: '#34d399' },
    background: { default: '#f8fafc', paper: '#ffffff' },
    error: { main: '#ef4444' },
    text: { primary: '#0f172a', secondary: '#64748b' },
  },
  typography: { fontFamily: '"Inter", "Roboto", sans-serif', h6: { fontWeight: 700 } },
  shape: { borderRadius: 12 },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none', backgroundColor: '#ffffff',
          borderBottom: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', color: '#0f172a',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #e2e8f0', transition: 'all 0.2s ease',
          '&:hover': { boxShadow: '0 8px 24px rgba(2,132,199,0.1)', transform: 'translateY(-3px)', borderColor: '#bae6fd' },
        },
      },
    },
    MuiChip: { styleOverrides: { root: { fontWeight: 600 } } },
  },
});

interface Termin {
  id: number;
  patientName: string;
  arztName: string;
  terminZeit: string;
  abteilung: string;
}

const ABTEILUNGEN = [
  'Kardiologie', 'Neurologie', 'Orthopädie', 'Dermatologie',
  'Pädiatrie', 'Gynäkologie', 'Onkologie', 'Psychiatrie',
];

const DEPT_CONFIG: Record<string, { color: string; bg: string }> = {
  Kardiologie:  { color: '#dc2626', bg: '#fef2f2' },
  Neurologie:   { color: '#7c3aed', bg: '#f5f3ff' },
  Orthopädie:   { color: '#d97706', bg: '#fffbeb' },
  Dermatologie: { color: '#db2777', bg: '#fdf2f8' },
  Pädiatrie:    { color: '#059669', bg: '#f0fdf4' },
  Gynäkologie:  { color: '#0891b2', bg: '#ecfeff' },
  Onkologie:    { color: '#4f46e5', bg: '#eef2ff' },
  Psychiatrie:  { color: '#0d9488', bg: '#f0fdfa' },
};

const getDeptConfig = (dept: string) => DEPT_CONFIG[dept] || { color: '#0284c7', bg: '#eff6ff' };

export default function Home() {
  const [termine, setTermine] = useState<Termin[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({ patientName: '', arztName: '', terminZeit: '', abteilung: '' });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  const showSnackbar = (message: string, severity: 'success' | 'error') =>
    setSnackbar({ open: true, message, severity });

  const fetchTermine = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/termine`);
      setTermine(await res.json());
    } catch { showSnackbar('Randevular yüklenemedi', 'error'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTermine(); }, [fetchTermine]);

  const openAddDialog = () => {
    setIsEditing(false);
    setEditId(null);
    setForm({ patientName: '', arztName: '', terminZeit: '', abteilung: '' });
    setDialogOpen(true);
  };

  const openEditDialog = (t: Termin) => {
    setIsEditing(true);
    setEditId(t.id);
    setForm({ patientName: t.patientName, arztName: t.arztName, terminZeit: t.terminZeit.slice(0, 16), abteilung: t.abteilung });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.patientName || !form.arztName || !form.terminZeit || !form.abteilung) {
      showSnackbar('Tüm alanları doldurun', 'error'); return;
    }
    try {
      await fetch(
        isEditing ? `${BASE_URL}/api/termine/${editId}` : `${BASE_URL}/api/termine`,
        { method: isEditing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) }
      );
      showSnackbar(isEditing ? 'Randevu güncellendi ✓' : 'Randevu eklendi ✓', 'success');
      setDialogOpen(false);
      fetchTermine();
    } catch { showSnackbar('İşlem başarısız', 'error'); }
  };

  const handleDelete = async () => {
    try {
      await fetch(`${BASE_URL}/api/termine/${deleteId}`, { method: 'DELETE' });
      showSnackbar('Randevu silindi', 'success');
      setDeleteDialogOpen(false);
      fetchTermine();
    } catch { showSnackbar('Silme başarısız', 'error'); }
  };

  const today = new Date().toDateString();
  const todayCount = termine.filter(t => new Date(t.terminZeit).toDateString() === today).length;
  const deptCount = [...new Set(termine.map(t => t.abteilung))].length;
  const upcoming = termine.filter(t => new Date(t.terminZeit) > new Date()).length;

  const filtered = termine
    .filter(t => {
      const matchSearch = t.patientName.toLowerCase().includes(search.toLowerCase()) ||
        t.arztName.toLowerCase().includes(search.toLowerCase()) ||
        t.abteilung.toLowerCase().includes(search.toLowerCase());
      const matchDept = !filterDept || t.abteilung === filterDept;
      return matchSearch && matchDept;
    })
    .sort((a, b) => new Date(a.terminZeit).getTime() - new Date(b.terminZeit).getTime());

  const formatDate = (dt: string) => new Date(dt).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' });
  const formatTime = (dt: string) => new Date(dt).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  const activeDepts = [...new Set(termine.map(t => t.abteilung))];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>

        {/* AppBar */}
        <AppBar position="sticky">
          <Toolbar sx={{ gap: 2, minHeight: 64 }}>
            <Box sx={{ width: 38, height: 38, borderRadius: 2, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <LocalHospitalIcon sx={{ fontSize: 20, color: 'white' }} />
            </Box>
            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, color: 'primary.dark', lineHeight: 1.2 }}>
                Klinik Terminverwaltung
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                Spring Boot · PostgreSQL · Railway
              </Typography>
            </Box>
            <Box sx={{ flex: 1 }} />
            <TextField
              size="small"
              placeholder="Hasta, doktor veya bölüm ara..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 17, color: 'grey.400' }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ width: 300, '& .MuiOutlinedInput-root': { borderRadius: 3, fontSize: '0.875rem', bgcolor: '#f8fafc' } }}
            />
            <Tooltip title="Yenile">
              <IconButton onClick={fetchTermine} size="small" sx={{ color: 'primary.main', border: '1px solid #e2e8f0', borderRadius: 2 }}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              disableElevation
              onClick={openAddDialog}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2.5, px: 2.5, boxShadow: '0 2px 8px rgba(2,132,199,0.3)' }}
            >
              Yeni Randevu
            </Button>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ py: 4 }}>

          {/* Stats */}
          <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
            {[
              { label: 'Toplam Randevu', value: termine.length, icon: <CalendarMonthIcon sx={{ fontSize: 22 }} />, color: '#0284c7', bg: 'linear-gradient(135deg, #eff6ff, #dbeafe)', border: '#bfdbfe' },
              { label: 'Bugünkü',        value: todayCount,     icon: <EventAvailableIcon sx={{ fontSize: 22 }} />, color: '#059669', bg: 'linear-gradient(135deg, #f0fdf4, #dcfce7)', border: '#bbf7d0' },
              { label: 'Yaklaşan',       value: upcoming,       icon: <AccessTimeIcon sx={{ fontSize: 22 }} />,     color: '#d97706', bg: 'linear-gradient(135deg, #fffbeb, #fef3c7)', border: '#fde68a' },
              { label: 'Aktif Bölüm',    value: deptCount,      icon: <DomainIcon sx={{ fontSize: 22 }} />,         color: '#7c3aed', bg: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', border: '#ddd6fe' },
            ].map(stat => (
              <Grid size={{ xs: 6, sm: 3 }} key={stat.label}>
                <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, background: stat.bg, border: `1px solid ${stat.border}`, height: '100%' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption" sx={{ color: stat.color, fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {stat.label}
                    </Typography>
                    <Box sx={{ color: stat.color, opacity: 0.7 }}>{stat.icon}</Box>
                  </Box>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: stat.color, lineHeight: 1 }}>
                    {loading ? '–' : stat.value}
                  </Typography>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Dept Filter Chips */}
          {activeDepts.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
              <FilterListIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
              <Chip
                label="Tümü"
                size="small"
                onClick={() => setFilterDept('')}
                variant={filterDept === '' ? 'filled' : 'outlined'}
                color={filterDept === '' ? 'primary' : 'default'}
                sx={{ borderRadius: 2 }}
              />
              {activeDepts.map(dept => {
                const cfg = getDeptConfig(dept);
                const count = termine.filter(t => t.abteilung === dept).length;
                return (
                  <Chip
                    key={dept}
                    label={`${dept} (${count})`}
                    size="small"
                    onClick={() => setFilterDept(filterDept === dept ? '' : dept)}
                    sx={{
                      borderRadius: 2, fontWeight: 600, fontSize: '0.72rem',
                      bgcolor: filterDept === dept ? cfg.color : cfg.bg,
                      color: filterDept === dept ? '#fff' : cfg.color,
                      border: `1px solid ${cfg.color}30`,
                      '&:hover': { bgcolor: cfg.color, color: '#fff' },
                    }}
                  />
                );
              })}
            </Box>
          )}

          {/* Cards */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
              <CircularProgress color="primary" />
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 12 }}>
              <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2 }}>
                <CalendarMonthIcon sx={{ fontSize: 40, color: '#bae6fd' }} />
              </Box>
              <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5 }}>Randevu bulunamadı</Typography>
              <Typography variant="body2" color="text.disabled" sx={{ mb: 3 }}>
                {search || filterDept ? 'Arama kriterlerinize uygun randevu yok.' : 'Henüz randevu eklenmemiş.'}
              </Typography>
              {!search && !filterDept && (
                <Button variant="contained" startIcon={<AddIcon />} disableElevation onClick={openAddDialog}
                  sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2.5 }}>
                  İlk Randevuyu Ekle
                </Button>
              )}
            </Box>
          ) : (
            <Grid container spacing={2.5}>
              {filtered.map(t => {
                const cfg = getDeptConfig(t.abteilung);
                const isPast = new Date(t.terminZeit) < new Date();
                return (
                  <Grid size={{ xs: 12, sm: 6, md: 4, lg: 3 }} key={t.id}>
                    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', opacity: isPast ? 0.75 : 1 }}>
                      <Box sx={{ height: 4, bgcolor: cfg.color, borderRadius: '12px 12px 0 0' }} />
                      <CardContent sx={{ flex: 1, p: 2.5, pb: 1.5 }}>
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 2 }}>
                          <Avatar sx={{ bgcolor: cfg.bg, color: cfg.color, width: 42, height: 42, fontWeight: 700, fontSize: '1rem', border: `2px solid ${cfg.color}20` }}>
                            {t.patientName.charAt(0).toUpperCase()}
                          </Avatar>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary', lineHeight: 1.3 }} noWrap>
                              {t.patientName}
                            </Typography>
                            <Chip label={t.abteilung} size="small" sx={{ mt: 0.5, height: 20, fontSize: '0.65rem', fontWeight: 700, bgcolor: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}25`, borderRadius: 1.5 }} />
                          </Box>
                          {isPast && <Chip label="Geçmiş" size="small" sx={{ height: 18, fontSize: '0.6rem', bgcolor: '#f1f5f9', color: '#94a3b8', borderRadius: 1 }} />}
                        </Box>
                        <Divider sx={{ mb: 1.5, borderColor: '#f1f5f9' }} />
                        <Stack spacing={1}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <MedicalServicesIcon sx={{ fontSize: 14, color: 'primary.main' }} />
                            </Box>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>{t.arztName}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <CalendarMonthIcon sx={{ fontSize: 14, color: 'secondary.main' }} />
                            </Box>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 500 }}>{formatDate(t.terminZeit)}</Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box sx={{ width: 28, height: 28, borderRadius: 1.5, bgcolor: '#fefce8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <AccessTimeIcon sx={{ fontSize: 14, color: '#d97706' }} />
                            </Box>
                            <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>{formatTime(t.terminZeit)}</Typography>
                          </Box>
                        </Stack>
                      </CardContent>
                      <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 0.5, px: 2, pb: 1.5 }}>
                        <Tooltip title="Düzenle">
                          <IconButton size="small" sx={{ color: 'primary.main', '&:hover': { bgcolor: '#eff6ff' } }} onClick={() => openEditDialog(t)}>
                            <EditIcon sx={{ fontSize: 17 }} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Sil">
                          <IconButton size="small" sx={{ color: 'error.main', '&:hover': { bgcolor: '#fef2f2' } }}
                            onClick={() => { setDeleteId(t.id); setDeleteDialogOpen(true); }}>
                            <DeleteIcon sx={{ fontSize: 17 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Container>

        {/* FAB */}
        <Fab color="primary" sx={{ position: 'fixed', bottom: 32, right: 32, boxShadow: '0 4px 16px rgba(2,132,199,0.35)' }} onClick={openAddDialog}>
          <AddIcon />
        </Fab>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth
          slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}>
          <Box sx={{ height: 4, bgcolor: 'primary.main' }} />
          <DialogTitle sx={{ fontWeight: 700, color: 'primary.dark', pb: 1, pt: 2.5 }}>
            {isEditing ? '✏️ Randevu Düzenle' : '📅 Yeni Randevu Ekle'}
          </DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 3 }}>
            <Stack spacing={2.5}>
              <TextField
                label="Hasta Adı"
                fullWidth
                size="small"
                value={form.patientName}
                onChange={e => setForm({ ...form, patientName: e.target.value })}
                placeholder="Ad Soyad"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonIcon sx={{ fontSize: 17, color: 'grey.400' }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextField
                label="Doktor Adı"
                fullWidth
                size="small"
                value={form.arztName}
                onChange={e => setForm({ ...form, arztName: e.target.value })}
                placeholder="Dr. Ad Soyad"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <MedicalServicesIcon sx={{ fontSize: 17, color: 'grey.400' }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextField
                label="Tarih & Saat"
                type="datetime-local"
                fullWidth
                size="small"
                value={form.terminZeit}
                onChange={e => setForm({ ...form, terminZeit: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Bölüm"
                select
                fullWidth
                size="small"
                value={form.abteilung}
                onChange={e => setForm({ ...form, abteilung: e.target.value })}
              >
                <MenuItem value="" disabled>Bölüm seçin</MenuItem>
                {ABTEILUNGEN.map(a => {
                  const cfg = getDeptConfig(a);
                  return (
                    <MenuItem key={a} value={a}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: cfg.color, flexShrink: 0 }} />
                        {a}
                      </Box>
                    </MenuItem>
                  );
                })}
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
            <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none', color: 'text.secondary', borderRadius: 2 }}>
              İptal
            </Button>
            <Button variant="contained" onClick={handleSave} disableElevation
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2, px: 3, boxShadow: '0 2px 8px rgba(2,132,199,0.3)' }}>
              {isEditing ? 'Güncelle' : 'Randevu Ekle'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth
          slotProps={{ paper: { sx: { borderRadius: 3, overflow: 'hidden' } } }}>
          <Box sx={{ height: 4, bgcolor: 'error.main' }} />
          <DialogTitle sx={{ fontWeight: 700, pt: 2.5 }}>🗑️ Randevu Sil</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              Bu randevuyu silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
            <Button onClick={() => setDeleteDialogOpen(false)} sx={{ textTransform: 'none', color: 'text.secondary', borderRadius: 2 }}>
              İptal
            </Button>
            <Button variant="contained" color="error" onClick={handleDelete} disableElevation
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}>
              Sil
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
          <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}