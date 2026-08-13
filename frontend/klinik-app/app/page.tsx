'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  AppBar,
  Toolbar,
  Typography,
  Container,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  Avatar,
  ThemeProvider,
  createTheme,
  CssBaseline,
  Alert,
  Snackbar,
  CircularProgress,
  Tooltip,
  Divider,
  Stack,
  Paper,
  Fab,
  InputAdornment,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import LocalHospitalIcon from '@mui/icons-material/LocalHospital';
import PersonIcon from '@mui/icons-material/Person';
import MedicalServicesIcon from '@mui/icons-material/MedicalServices';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CategoryIcon from '@mui/icons-material/Category';
import RefreshIcon from '@mui/icons-material/Refresh';

const BASE_URL = 'https://klinik-terminverwaltung-api-production.up.railway.app';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#0284c7', dark: '#0369a1', light: '#38bdf8' },
    secondary: { main: '#10b981', dark: '#059669', light: '#34d399' },
    background: { default: '#f0f9ff', paper: '#ffffff' },
    error: { main: '#ef4444' },
  },
  typography: { fontFamily: '"Inter", "Roboto", sans-serif' },
  shape: { borderRadius: 12 },
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #e0f2fe',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          color: '#0f172a',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
          border: '1px solid #e0f2fe',
          transition: 'box-shadow 0.2s ease, transform 0.2s ease',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(2,132,199,0.12)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
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
  'Kardiologie',
  'Neurologie',
  'Orthopädie',
  'Dermatologie',
  'Pädiatrie',
  'Gynäkologie',
  'Onkologie',
  'Psychiatrie',
];

const ABTEILUNG_COLORS: Record<string, string> = {
  Kardiologie: '#ef4444',
  Neurologie: '#8b5cf6',
  Orthopädie: '#f59e0b',
  Dermatologie: '#ec4899',
  Pädiatrie: '#10b981',
  Gynäkologie: '#06b6d4',
  Onkologie: '#6366f1',
  Psychiatrie: '#14b8a6',
};

const getAbteilungColor = (abteilung: string) =>
  ABTEILUNG_COLORS[abteilung] || '#0284c7';

export default function Home() {
  const [termine, setTermine] = useState<Termin[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({
    patientName: '',
    arztName: '',
    terminZeit: '',
    abteilung: '',
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error',
  });

  const showSnackbar = (message: string, severity: 'success' | 'error') =>
    setSnackbar({ open: true, message, severity });

  const fetchTermine = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/termine`);
      setTermine(await res.json());
    } catch {
      showSnackbar('Randevular yüklenemedi', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTermine();
  }, [fetchTermine]);

  const handleSave = async () => {
    if (!form.patientName || !form.arztName || !form.terminZeit || !form.abteilung) {
      showSnackbar('Tüm alanları doldurun', 'error');
      return;
    }
    try {
      const url = isEditing
        ? `${BASE_URL}/api/termine/${deleteId}`
        : `${BASE_URL}/api/termine`;
      await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      showSnackbar(isEditing ? 'Randevu güncellendi' : 'Randevu eklendi', 'success');
      setDialogOpen(false);
      setForm({ patientName: '', arztName: '', terminZeit: '', abteilung: '' });
      fetchTermine();
    } catch {
      showSnackbar('İşlem başarısız', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await fetch(`${BASE_URL}/api/termine/${deleteId}`, { method: 'DELETE' });
      showSnackbar('Randevu silindi', 'success');
      setDeleteDialogOpen(false);
      fetchTermine();
    } catch {
      showSnackbar('Silme başarısız', 'error');
    }
  };

  const filtered = termine.filter(
    (t) =>
      t.patientName.toLowerCase().includes(search.toLowerCase()) ||
      t.arztName.toLowerCase().includes(search.toLowerCase()) ||
      t.abteilung.toLowerCase().includes(search.toLowerCase())
  );

  const today = new Date().toDateString();
  const todayCount = termine.filter(
    (t) => new Date(t.terminZeit).toDateString() === today
  ).length;
  const depts = [...new Set(termine.map((t) => t.abteilung))].length;

  const formatDate = (dt: string) => {
    const d = new Date(dt);
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTime = (dt: string) => {
    const d = new Date(dt);
    return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>

        {/* AppBar */}
        <AppBar position="sticky">
          <Toolbar sx={{ gap: 2 }}>
            <Box sx={{
              width: 36, height: 36, borderRadius: 2,
              bgcolor: 'primary.main',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <LocalHospitalIcon sx={{ fontSize: 20, color: 'white' }} />
            </Box>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', color: 'primary.dark' }}>
                Klinik Terminverwaltung
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Spring Boot · PostgreSQL · Railway
              </Typography>
            </Box>
            <TextField
              size="small"
              placeholder="Hasta, doktor veya bölüm ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{ width: 280, '& .MuiOutlinedInput-root': { borderRadius: 3, bgcolor: '#f0f9ff' } }}
            />
            <Tooltip title="Yenile">
              <IconButton onClick={fetchTermine} size="small" sx={{ color: 'primary.main' }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Container maxWidth="xl" sx={{ py: 4 }}>

          {/* Stats */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {[
              { label: 'Toplam Randevu', value: termine.length, icon: <CalendarMonthIcon />, color: '#0284c7', bg: '#e0f2fe' },
              { label: 'Bugünkü Randevular', value: todayCount, icon: <AccessTimeIcon />, color: '#10b981', bg: '#d1fae5' },
              { label: 'Aktif Bölümler', value: depts, icon: <CategoryIcon />, color: '#8b5cf6', bg: '#ede9fe' },
            ].map((stat) => (
              <Grid item xs={12} sm={4} key={stat.label}>
                <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, border: '1px solid #e0f2fe', display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Box sx={{ width: 48, height: 48, borderRadius: 2, bgcolor: stat.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: stat.color }}>
                    {stat.icon}
                  </Box>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: stat.color, lineHeight: 1 }}>{stat.value}</Typography>
                    <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                  </Box>
                </Paper>
              </Grid>
            ))}
          </Grid>

          {/* Cards */}
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
              <CircularProgress color="primary" />
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 10 }}>
              <CalendarMonthIcon sx={{ fontSize: 64, color: '#bae6fd', mb: 2 }} />
              <Typography color="text.secondary">Randevu bulunamadı</Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {filtered.map((t) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={t.id}>
                  <Card>
                    <CardContent sx={{ pb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                        <Avatar sx={{ bgcolor: getAbteilungColor(t.abteilung), width: 38, height: 38, fontSize: '0.85rem' }}>
                          {t.patientName[0]}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }} noWrap>
                            {t.patientName}
                          </Typography>
                          <Chip
                            label={t.abteilung}
                            size="small"
                            sx={{
                              height: 18,
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              bgcolor: `${getAbteilungColor(t.abteilung)}18`,
                              color: getAbteilungColor(t.abteilung),
                              border: `1px solid ${getAbteilungColor(t.abteilung)}30`,
                            }}
                          />
                        </Box>
                      </Box>

                      <Divider sx={{ mb: 1.5 }} />

                      <Stack spacing={0.8}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <MedicalServicesIcon sx={{ fontSize: 15, color: 'primary.main' }} />
                          <Typography variant="caption" color="text.secondary">
                            {t.arztName}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CalendarMonthIcon sx={{ fontSize: 15, color: 'secondary.main' }} />
                          <Typography variant="caption" color="text.secondary">
                            {formatDate(t.terminZeit)}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <AccessTimeIcon sx={{ fontSize: 15, color: 'text.disabled' }} />
                          <Typography variant="caption" color="text.secondary">
                            {formatTime(t.terminZeit)}
                          </Typography>
                        </Box>
                      </Stack>
                    </CardContent>

                    <CardActions sx={{ justifyContent: 'flex-end', pt: 0, px: 1.5, pb: 1 }}>
                      <Tooltip title="Düzenle">
                        <IconButton size="small" sx={{ color: 'primary.main' }} onClick={() => {
                          setIsEditing(true);
                          setDeleteId(t.id);
                          setForm({
                            patientName: t.patientName,
                            arztName: t.arztName,
                            terminZeit: t.terminZeit.slice(0, 16),
                            abteilung: t.abteilung,
                          });
                          setDialogOpen(true);
                        }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Sil">
                        <IconButton size="small" sx={{ color: 'error.main' }} onClick={() => {
                          setDeleteId(t.id);
                          setDeleteDialogOpen(true);
                        }}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Container>

        {/* FAB */}
        <Fab
          color="primary"
          sx={{ position: 'fixed', bottom: 32, right: 32, boxShadow: '0 4px 14px rgba(2,132,199,0.4)' }}
          onClick={() => { setIsEditing(false); setForm({ patientName: '', arztName: '', terminZeit: '', abteilung: '' }); setDialogOpen(true); }}
        >
          <AddIcon />
        </Fab>

        {/* Randevu Dialog */}
        <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 700, color: 'primary.dark' }}>
            {isEditing ? 'Randevu Düzenle' : 'Yeni Randevu'}
          </DialogTitle>
          <Divider />
          <DialogContent sx={{ pt: 2 }}>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Hasta Adı"
                fullWidth
                size="small"
                value={form.patientName}
                onChange={(e) => setForm({ ...form, patientName: e.target.value })}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment> } }}
              />
              <TextField
                label="Doktor Adı"
                fullWidth
                size="small"
                value={form.arztName}
                onChange={(e) => setForm({ ...form, arztName: e.target.value })}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><MedicalServicesIcon sx={{ fontSize: 16, color: 'text.secondary' }} /></InputAdornment> } }}
              />
              <TextField
                label="Tarih & Saat"
                type="datetime-local"
                fullWidth
                size="small"
                value={form.terminZeit}
                onChange={(e) => setForm({ ...form, terminZeit: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                label="Bölüm"
                select
                fullWidth
                size="small"
                value={form.abteilung}
                onChange={(e) => setForm({ ...form, abteilung: e.target.value })}
                SelectProps={{ native: true }}
                slotProps={{ inputLabel: { shrink: true } }}
              >
                <option value="">Bölüm seçin</option>
                {ABTEILUNGEN.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </TextField>
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none' }}>İptal</Button>
            <Button variant="contained" onClick={handleSave} disableElevation sx={{ textTransform: 'none', fontWeight: 600 }}>
              {isEditing ? 'Güncelle' : 'Ekle'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ fontWeight: 700 }}>Randevu Sil</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">Bu randevuyu silmek istediğinizden emin misiniz?</Typography>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setDeleteDialogOpen(false)} sx={{ textTransform: 'none' }}>İptal</Button>
            <Button variant="contained" color="error" onClick={handleDelete} disableElevation sx={{ textTransform: 'none', fontWeight: 600 }}>Sil</Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}>
          <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: 2 }}>{snackbar.message}</Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}