import * as React from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, TextField, Dialog, DialogTitle, DialogContent,
  DialogActions, Button, Switch, FormControlLabel, Snackbar, Alert,
  TablePagination, Box, Typography, Chip, Skeleton, TableSortLabel, Avatar, CircularProgress
} from '@mui/material';
import { Edit, Delete, Search, Add, CloudUpload } from '@mui/icons-material';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where } from 'firebase/firestore';
import { db, storage } from '../FirebaseConfig';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { Select, MenuItem, InputLabel, FormControl } from '@mui/material';
import { useTranslation } from 'react-i18next';


function Colaboradores() {
  const [rows, setRows] = React.useState([]);
  const [filteredRows, setFilteredRows] = React.useState([]);
  const [selectedEmployee, setSelectedEmployee] = React.useState(null);
  const [newEmployee, setNewEmployee] = React.useState(null);
  const [employeeToDelete, setEmployeeToDelete] = React.useState(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [success, setSuccess] = React.useState('');
  const [error, setError] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);
  const [isLoading, setIsLoading] = React.useState(true);
  const [sortBy, setSortBy] = React.useState('name');
  const [sortDirection, setSortDirection] = React.useState('asc');
  const navigate = useNavigate();
  const departamentos = ['HR', 'Finance', 'Technology'];
  const [showAdminSnackbar, setShowAdminSnackbar] = React.useState(false);
  const { t } = useTranslation();
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState('');
  const [uploadSuccess, setUploadSuccess] = React.useState('');
  const [uploadingMode, setUploadingMode] = React.useState(null); // 'new' or 'edit'


  // Load employees from the 'users' collection
  const fetchEmployees = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const allUsers = querySnapshot.docs.map(doc => ({ ...doc.data(), docId: doc.id }));
      setRows(allUsers);
      setFilteredRows(allUsers);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check if the user is an admin
  const checkAdminAccess = React.useCallback(async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      navigate('/login');
      return;
    }

    const userDoc = await getDocs(query(collection(db, 'users'), where('email', '==', user.email)));
    if (!userDoc.empty) {
      const userData = userDoc.docs[0].data();
      setIsAdmin(userData.isAdmin === true);
    } else {
      setError(t('accountNotRegisteredInDatabase'));
      navigate('/perfil');
    }
  }, [navigate, t]);

  React.useEffect(() => {
    checkAdminAccess();
    fetchEmployees();
    // Check if the admin just logged in
    if (localStorage.getItem('adminJustLoggedIn') === 'true') {
      setShowAdminSnackbar(true);
      localStorage.removeItem('adminJustLoggedIn');
    }
  }, [checkAdminAccess, fetchEmployees, navigate]);

  // Filter rows based on search term
  React.useEffect(() => {
    const filtered = rows.filter(row =>
      row.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.Department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.otherInfo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredRows(filtered);
    setPage(0);
  }, [searchTerm, rows]);

  const handlePhotoUpload = async (event, isNewEmployee = true) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tamanho (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError(t('fileTooLarge'));
      return;
    }

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      setUploadError(t('invalidFileType'));
      return;
    }

    setUploading(true);
    setUploadError('');
    setUploadSuccess('');
    setUploadingMode(isNewEmployee ? 'new' : 'edit');

    try {
      const timestamp = Date.now();
      const filename = `employee_${timestamp}_${file.name}`;
      const storageRef = ref(storage, `employee-photos/${filename}`);

      // Tentar upload para Firebase Storage
      try {
        await uploadBytes(storageRef, file);
        const downloadURL = await getDownloadURL(storageRef);
        if (isNewEmployee) {
          setNewEmployee(prev => ({ ...prev, photoURL: downloadURL, photoStorageType: 'firebase' }));
        } else {
          setSelectedEmployee(prev => ({ ...prev, photoURL: downloadURL, photoStorageType: 'firebase' }));
        }
        setUploadSuccess(t('photoUploadedSuccessfully'));
      } catch (firebaseError) {
        console.error('Firebase upload error:', firebaseError);
        
        // Fallback: armazenar foto em localStorage
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataURL = e.target.result;
          if (isNewEmployee) {
            setNewEmployee(prev => ({ ...prev, photoURL: dataURL, photoStorageType: 'localStorage' }));
          } else {
            setSelectedEmployee(prev => ({ ...prev, photoURL: dataURL, photoStorageType: 'localStorage' }));
          }
          setUploadSuccess(t('photoUploadedSuccessfully'));
        };
        reader.readAsDataURL(file);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError(t('photoUploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const getPhotoURL = (employeeData) => {
    if (!employeeData?.photoURL) return null;
    
    // Se for 'local' ou localStorage, buscar do localStorage
    if (employeeData.photoStorageType === 'localStorage' || employeeData.photoURL?.startsWith('data:')) {
      return employeeData.photoURL;
    }
    
    // Caso contrário, retornar a URL (Firebase ou outro)
    return employeeData.photoURL;
  };

  const handleAddEmployee = async () => {
    if (!newEmployee?.email || !newEmployee?.name) {
      setError(t('nameAndEmailRequired'));
      return;
    }
    
    const auth = getAuth();

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, newEmployee.email, newEmployee.password);
      const user = userCredential.user;

      await addDoc(collection(db, 'users'), {
        ...newEmployee,
        uid: user.uid, 
        isAdmin: false
      });

      setNewEmployee(null);
      await fetchEmployees();
      setSuccess(t('employeeAddedSuccessfully'));
    } catch (error) {
      console.error("Error creating employee:", error.code, error.message);
      setError(t('errorCreatingEmployee', { message: error.message }));
    }
  };

  const handleSave = async () => {
    try {
      const ref = doc(db, 'users', selectedEmployee.docId);
      const { emailLocked, ...employeeData } = selectedEmployee;
      await updateDoc(ref, { ...employeeData, email: emailLocked || selectedEmployee.email });
      setSelectedEmployee(null);
      await fetchEmployees();
      setSuccess(t('employeeUpdatedSuccessfully'));
    } catch (error) {
      setError(t('errorUpdatingEmployee'));
    }
  };

  const handleDelete = async () => {
    try {
      const ref = doc(db, 'users', employeeToDelete.docId);
      await deleteDoc(ref);
      setEmployeeToDelete(null);
      await fetchEmployees();
      setSuccess(t('employeeDeletedSuccessfully'));
    } catch (err) {
      console.error("Error deleting employee:", err);
      setError(t('errorDeletingEmployee'));
    }
  };

  const handleToggleAdmin = async (employee) => {
    try {
      const ref = doc(db, 'users', employee.docId);
      await updateDoc(ref, { isAdmin: !employee.isAdmin });
      await fetchEmployees();
      setSuccess(employee.isAdmin ? t('adminStatusRemovedSuccessfully') : t('adminStatusGrantedSuccessfully'));
    } catch (error) {
      setError(t('errorUpdatingAdminStatus'));
    }
  };

  const handleEditChange = (field, value) => {
    setSelectedEmployee(prev => ({ ...prev, [field]: value }));
  };

  const handleNewEmployeeChange = (field, value) => {
    setNewEmployee(prev => ({ ...prev, [field]: value }));
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleCloseSnackbar = () => {
    setSuccess('');
    setError('');
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortBy(field);
    setSortDirection('asc');
  };

  const sortedRows = React.useMemo(() => {
    const cloned = [...filteredRows];
    const direction = sortDirection === 'asc' ? 1 : -1;

    return cloned.sort((a, b) => {
      const valA = (a[sortBy] || '').toString().toLowerCase();
      const valB = (b[sortBy] || '').toString().toLowerCase();
      if (valA < valB) return -1 * direction;
      if (valA > valB) return 1 * direction;
      return 0;
    });
  }, [filteredRows, sortBy, sortDirection]);

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2, mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main', fontFamily: 'Poppins, sans-serif', ml: 0 }}>
          {t('employees')}
        </Typography>
        {isAdmin && (
          <Button 
            variant="contained" 
            startIcon={<Add />}
            onClick={() => setNewEmployee({ name: '', email: '', date: '', department: '', Department: '', role: '', profileNumber: '', scales: '', studies: '', trainings: '', password: '', otherInfo: '', photoURL: '' })}
            sx={{ fontWeight: 'bold', fontFamily: 'Poppins, sans-serif' }}
          >
            {t('addEmployee')}
          </Button>
        )}
      </Box>

      {/* Search Bar */}
      <Box mb={2}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder={t('searchByNameEmailOrDepartment')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
          size="small"
        />
      </Box>

      {newEmployee && (
        <Dialog open onClose={() => setNewEmployee(null)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800, color: 'primary.main' }}>{t('newEmployee')}</DialogTitle>
          <DialogContent>
            <TextField 
              label={t('name')} 
              fullWidth 
              margin="dense" 
              value={newEmployee.name} 
              onChange={(e) => handleNewEmployeeChange('name', e.target.value)} 
            />
            <TextField 
              label={t('email')} 
              fullWidth 
              margin="dense" 
              value={newEmployee.email} 
              onChange={(e) => handleNewEmployeeChange('email', e.target.value)} 
            />
            <TextField 
              label={t('admissionDate')} 
              fullWidth 
              margin="dense" 
              type="date" 
              value={newEmployee.date} 
              onChange={(e) => handleNewEmployeeChange('date', e.target.value)} 
              InputLabelProps={{ shrink: true }} 
            />
            <FormControl fullWidth margin="dense">
              <InputLabel id="departamento-label">{t('department')}</InputLabel>
              <Select 
                labelId="departamento-label" 
                value={newEmployee.department || newEmployee.Department || ''} 
                label={t('department')} 
                onChange={(e) => {
                  handleNewEmployeeChange('department', e.target.value);
                  handleNewEmployeeChange('Department', e.target.value);
                }}
              >
                {departamentos.map((dep) => (
                  <MenuItem key={dep} value={dep}>{dep}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField 
              label={t('position')} 
              fullWidth 
              margin="dense" 
              value={newEmployee.role || ''} 
              onChange={(e) => handleNewEmployeeChange('role', e.target.value)} 
            />
            <TextField 
              label={t('profileNumber')} 
              fullWidth 
              margin="dense" 
              value={newEmployee.profileNumber || ''} 
              onChange={(e) => handleNewEmployeeChange('profileNumber', e.target.value)} 
            />
            <TextField 
              label={t('scales')} 
              fullWidth 
              margin="dense" 
              value={newEmployee.scales || ''} 
              onChange={(e) => handleNewEmployeeChange('scales', e.target.value)} 
            />
            <TextField 
              label={t('studies')} 
              fullWidth 
              margin="dense" 
              value={newEmployee.studies || ''} 
              onChange={(e) => handleNewEmployeeChange('studies', e.target.value)} 
            />
            <TextField 
              label={t('trainings')} 
              fullWidth 
              margin="dense" 
              value={newEmployee.trainings || ''} 
              onChange={(e) => handleNewEmployeeChange('trainings', e.target.value)} 
            />
            {/* Photo Upload Section */}
            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 'bold' }}>
                {t('profilePhoto')}
              </Typography>
              {newEmployee.photoURL && (
                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'center' }}>
                  <Avatar
                    src={getPhotoURL(newEmployee)}
                    alt="Preview"
                    sx={{ width: 80, height: 80, border: '2px solid primary.main' }}
                  />
                </Box>
              )}
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUpload />}
                fullWidth
                disabled={uploading && uploadingMode === 'new'}
                sx={{ textTransform: 'none' }}
              >
                {uploading && uploadingMode === 'new' ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
                {uploading && uploadingMode === 'new' ? t('uploading') : t('uploadPhoto')}
                <input
                  hidden
                  accept="image/*"
                  type="file"
                  onChange={(e) => handlePhotoUpload(e, true)}
                />
              </Button>
              {uploadError && uploadingMode === 'new' && (
                <Alert severity="error" sx={{ mt: 1 }}>{uploadError}</Alert>
              )}
              {uploadSuccess && uploadingMode === 'new' && (
                <Alert severity="success" sx={{ mt: 1 }}>{uploadSuccess}</Alert>
              )}
            </Box>
            <TextField 
              label={t('password')} 
              fullWidth 
              margin="dense" 
              type="password" 
              value={newEmployee.password || ''} 
              onChange={(e) => handleNewEmployeeChange('password', e.target.value)} 
            />
            <TextField 
              label={t('other')} 
              fullWidth 
              margin="dense" 
              multiline
              minRows={2}
              value={newEmployee.otherInfo || ''} 
              onChange={(e) => handleNewEmployeeChange('otherInfo', e.target.value)} 
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setNewEmployee(null)}>{t('cancel')}</Button>
            <Button onClick={handleAddEmployee} variant="contained" sx={{ fontWeight: 'bold' }}>
              {t('add')}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      <TableContainer component={Paper} sx={{ mt: 2 }}>
        {isLoading && <Skeleton variant="rounded" height={220} sx={{ m: 2 }} />}
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel active={sortBy === 'name'} direction={sortBy === 'name' ? sortDirection : 'asc'} onClick={() => handleSort('name')}>
                  {t('name')}
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel active={sortBy === 'email'} direction={sortBy === 'email' ? sortDirection : 'asc'} onClick={() => handleSort('email')}>
                  {t('email')}
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel active={sortBy === 'date'} direction={sortBy === 'date' ? sortDirection : 'asc'} onClick={() => handleSort('date')}>
                  {t('admissionDate')}
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel active={sortBy === 'Department'} direction={sortBy === 'Department' ? sortDirection : 'asc'} onClick={() => handleSort('Department')}>
                  {t('department')}
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel active={sortBy === 'otherInfo'} direction={sortBy === 'otherInfo' ? sortDirection : 'asc'} onClick={() => handleSort('otherInfo')}>
                  {t('other')}
                </TableSortLabel>
              </TableCell>
              <TableCell>{t('admin')}</TableCell>
              {isAdmin && <TableCell align="right">{t('actions')}</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedRows
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row) => (
                <TableRow key={row.docId}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>{row.date}</TableCell>
                  <TableCell>
                    <Chip 
                      label={row.department || row.Department || t('notAssigned')} 
                      size="small" 
                      color={row.department || row.Department ? "primary" : "default"}
                    />
                  </TableCell>
                  <TableCell>{row.otherInfo || '-'}</TableCell>
                  <TableCell>
                    {isAdmin ? (
                      <FormControlLabel
                        control={
                          <Switch
                            checked={row.isAdmin || false}
                            onChange={() => handleToggleAdmin(row)}
                            color="primary"
                          />
                        }
                        label={row.isAdmin ? t('yes') : t('no')}
                      />
                    ) : (
                      <Chip 
                        label={row.isAdmin ? t('yes') : t('no')} 
                        size="small" 
                        color={row.isAdmin ? "success" : "default"}
                      />
                    )}
                  </TableCell>
                  {isAdmin && (
                    <TableCell align="right">
                      <IconButton onClick={() => setSelectedEmployee({ ...row, emailLocked: row.email })}>
                        <Edit />
                      </IconButton>
                      <IconButton 
                        sx={{ color: 'red' }} 
                        onClick={() => setEmployeeToDelete(row)}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={sortedRows.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage={t('rowsPerPage')}
          sx={{
            '& .MuiTablePagination-toolbar': {
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'nowrap',
              gap: 1,
            },
            '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
              whiteSpace: 'nowrap',
              margin: 0,
            },
          }}
        />
      </TableContainer>

      {/* Edit Dialog */}
      {selectedEmployee && (
        <Dialog open onClose={() => setSelectedEmployee(null)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 800, color: 'primary.main' }}>{t('editEmployee')}</DialogTitle>
          <DialogContent>
            <TextField 
              label={t('name')} 
              fullWidth 
              margin="dense" 
              value={selectedEmployee.name} 
              onChange={(e) => handleEditChange('name', e.target.value)} 
            />
            <TextField 
              label={t('email')} 
              fullWidth 
              margin="dense" 
              value={selectedEmployee.email} 
              disabled
            />
            <TextField 
              label={t('admissionDate')} 
              fullWidth 
              margin="dense" 
              type="date" 
              value={selectedEmployee.date} 
              onChange={(e) => handleEditChange('date', e.target.value)} 
              InputLabelProps={{ shrink: true }} 
            />
            <FormControl fullWidth margin="dense">
              <InputLabel id="edit-departamento-label">{t('department')}</InputLabel>
              <Select 
                labelId="edit-departamento-label" 
                value={selectedEmployee.department || selectedEmployee.Department || ''} 
                label={t('department')} 
                onChange={(e) => {
                  handleEditChange('department', e.target.value);
                  handleEditChange('Department', e.target.value);
                }}
              >
                {departamentos.map((dep) => (
                  <MenuItem key={dep} value={dep}>{dep}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField 
              label={t('position')} 
              fullWidth 
              margin="dense" 
              value={selectedEmployee.role || ''} 
              onChange={(e) => handleEditChange('role', e.target.value)} 
            />
            <TextField 
              label={t('profileNumber')} 
              fullWidth 
              margin="dense" 
              value={selectedEmployee.profileNumber || ''} 
              onChange={(e) => handleEditChange('profileNumber', e.target.value)} 
            />
            {/* Photo Upload Section */}
            <Box sx={{ mt: 2, mb: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>{t('photo')}</Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Button
                  variant="outlined"
                  component="label"
                  startIcon={uploading && uploadingMode === 'edit' ? <CircularProgress size={20} /> : <CloudUpload />}
                  disabled={uploading && uploadingMode === 'edit'}
                >
                  {uploading && uploadingMode === 'edit' ? t('uploading') : t('selectPhoto')}
                  <input
                    hidden
                    accept="image/*"
                    type="file"
                    onChange={(e) => handlePhotoUpload(e, false)}
                  />
                </Button>
                {selectedEmployee.photoURL && (
                  <Avatar
                    src={getPhotoURL(selectedEmployee)}
                    alt="Preview"
                    sx={{ width: 48, height: 48 }}
                  />
                )}
              </Box>
              {uploadError && uploadingMode === 'edit' && (
                <Alert severity="error" sx={{ mt: 1 }}>{uploadError}</Alert>
              )}
              {uploadSuccess && uploadingMode === 'edit' && (
                <Alert severity="success" sx={{ mt: 1 }}>{uploadSuccess}</Alert>
              )}
            </Box>
            <TextField 
              label={t('scales')} 
              fullWidth 
              margin="dense" 
              value={selectedEmployee.scales || ''} 
              onChange={(e) => handleEditChange('scales', e.target.value)} 
            />
            <TextField 
              label={t('studies')} 
              fullWidth 
              margin="dense" 
              value={selectedEmployee.studies || ''} 
              onChange={(e) => handleEditChange('studies', e.target.value)} 
            />
            <TextField 
              label={t('trainings')} 
              fullWidth 
              margin="dense" 
              value={selectedEmployee.trainings || ''} 
              onChange={(e) => handleEditChange('trainings', e.target.value)} 
            />
            <TextField 
              label={t('other')} 
              fullWidth 
              margin="dense" 
              value={selectedEmployee.otherInfo || ''} 
              onChange={(e) => handleEditChange('otherInfo', e.target.value)} 
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedEmployee(null)}>{t('cancel')}</Button>
            <Button onClick={handleSave} variant="contained" sx={{ fontWeight: 'bold' }}>
              {t('save')}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Delete Confirmation Dialog */}
      {employeeToDelete && (
        <Dialog open onClose={() => setEmployeeToDelete(null)}>
          <DialogTitle sx={{ fontWeight: 800, color: 'primary.main' }}>{t('deleteEmployee')}</DialogTitle>
          <DialogContent>
            {t('areYouSureYouWantToDeleteThisEmployee')}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEmployeeToDelete(null)} sx={{ fontWeight: 700 }}>{t('cancel')}</Button>
            <Button onClick={handleDelete} color="error" variant="contained" sx={{ fontWeight: 700 }}>
              {t('yesDelete')}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Success/Error Messages */}
      <Snackbar 
        open={!!success} 
        autoHideDuration={4000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success">
          {success}
        </Alert>
      </Snackbar>

      <Snackbar 
        open={!!error} 
        autoHideDuration={4000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="error">
          {error}
        </Alert>
      </Snackbar>

      <Snackbar open={showAdminSnackbar} autoHideDuration={4000} onClose={() => setShowAdminSnackbar(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert onClose={() => setShowAdminSnackbar(false)} severity="info" sx={{ width: '100%' }}>
          {t('youAreLoggedInAsAdmin')}
        </Alert>
      </Snackbar>
    </>
  );
}

export default Colaboradores;