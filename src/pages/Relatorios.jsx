import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Typography, Button, Dialog,
  DialogActions, DialogContent, DialogContentText,
  DialogTitle, Card, CardContent, CardMedia, CardActions,
  CircularProgress, Alert, Snackbar, TextField, FormControl,
  InputLabel, Select, MenuItem, TablePagination, Chip
} from "@mui/material";
import { Worker, Viewer } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll, getMetadata } from "firebase/storage";
import { storage } from '../FirebaseConfig';
import { getAuth } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { db } from '../FirebaseConfig';
import { Search, FilterList, Add as AddIcon, PictureAsPdf } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

const Relatorios = () => {
  const [pdfFiles, setPdfFiles] = useState([]);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState([]);
  const [searchFilters, setSearchFilters] = useState({
    person: '',
    year: '',
    month: ''
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(6);
  const navigate = useNavigate();
  const auth = getAuth();
  const firestore = getFirestore();
  const [showAdminSnackbar, setShowAdminSnackbar] = useState(false);
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const { t } = useTranslation();

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  const checkAdminRole = useCallback(async (user) => {
    try {
      console.log('Checking admin role for user:', user.uid);
      const userDoc = await getDoc(doc(firestore, 'users', user.uid));
      if (!userDoc.exists()) {
        console.log('User document does not exist');
        return false;
      }

      const userData = userDoc.data();
      return userData.isAdmin === true;
    } catch (error) {
      console.error('Error checking admin role:', error);
      return false;
    }
  }, [firestore]);

  const loadUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const fetchPdfFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('You must be logged in to view files');
      }

      console.log('Current user:', user.uid);
      console.log('Is admin:', isAdmin);

      const storageRef = ref(storage, 'pdfs');
      const result = await listAll(storageRef);
      console.log('Found files:', result.items.length);
      
      const filePromises = result.items.map(async (itemRef) => {
        try {
          const url = await getDownloadURL(itemRef);
          const metadata = await getMetadata(itemRef);
          const uploadedByUid = metadata.customMetadata?.uploadedBy || 'Unknown';
          let uploadedByName = uploadedByUid;

          // Get user name from Firestore
          if (uploadedByUid !== 'Unknown') {
            try {
              const userDoc = await getDoc(doc(firestore, 'users', uploadedByUid));
              if (userDoc.exists()) {
                uploadedByName = userDoc.data().name || uploadedByUid;
              }
            } catch (e) {
              // If error, keep UID
            }
          }

          const uploadDate = new Date(metadata.customMetadata?.uploadedAt || Date.now());
          
          return {
            name: itemRef.name,
            url: url,
            uploadedBy: uploadedByName,
            uploadedByUid: uploadedByUid,
            uploadedAt: metadata.customMetadata?.uploadedAt || 'Unknown date',
            uploadDate: uploadDate,
            year: uploadDate.getFullYear(),
            month: uploadDate.getMonth()
          };
        } catch (error) {
          console.error('Error fetching file metadata:', error);
          return null;
        }
      });

      const files = (await Promise.all(filePromises)).filter(file => file !== null);
      console.log('Processed files:', files.length);
      
      if (isAdmin) {
        console.log('Setting all files for admin');
        setPdfFiles(files);
        setFilteredFiles(files);
      } else {
        console.log('Filtering files for normal user');
        const userFiles = files.filter(file => file.uploadedByUid === user.uid);
        setPdfFiles(userFiles);
        setFilteredFiles(userFiles);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      setError(error.message || 'Error loading PDF files');
    } finally {
      setLoading(false);
    }
  }, [auth, isAdmin, firestore]);

  useEffect(() => {
    const initializeUser = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate('/login');
        return;
      }

      const adminStatus = await checkAdminRole(user);
      console.log('Setting admin status:', adminStatus);
      setIsAdmin(adminStatus);
      await loadUsers();
      await fetchPdfFiles();
    };

    const unsubscribe = auth.onAuthStateChanged(initializeUser);
    return () => unsubscribe();
  }, [auth, checkAdminRole, fetchPdfFiles, navigate]);

  // Check if the admin just logged in
  if (localStorage.getItem('adminJustLoggedIn') === 'true') {
    setShowAdminSnackbar(true);
    localStorage.removeItem('adminJustLoggedIn');
  }

  // Filter files based on search criteria
  useEffect(() => {
    let filtered = pdfFiles;

    if (searchFilters.person) {
      filtered = filtered.filter(file => 
        file.uploadedBy.toLowerCase().includes(searchFilters.person.toLowerCase())
      );
    }

    if (searchFilters.year) {
      filtered = filtered.filter(file => 
        file.year === parseInt(searchFilters.year)
      );
    }

    if (searchFilters.month !== '') {
      filtered = filtered.filter(file => 
        file.month === parseInt(searchFilters.month)
      );
    }

    setFilteredFiles(filtered);
    setPage(0);
  }, [searchFilters, pdfFiles]);

  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    setLoading(true);
    setError(null);

    try {
      // Check authentication
      const user = auth.currentUser;
      if (!user) {
        throw new Error('You must be logged in to upload files');
      }

      // Validate file sizes
      const invalidFiles = files.filter(file => file.size > MAX_FILE_SIZE);
      if (invalidFiles.length > 0) {
        throw new Error(`Some files exceed the maximum size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      }

      const uploadPromises = files.map(async (file) => {
        const storageRef = ref(storage, `pdfs/${file.name}`);
        const metadata = {
          contentType: 'application/pdf',
          customMetadata: {
            uploadedBy: user.uid,
            uploadedAt: new Date().toISOString()
          }
        };
        
        try {
          const snapshot = await uploadBytes(storageRef, file, metadata);
          const url = await getDownloadURL(snapshot.ref);
          
          // Get user name from Firestore
          let userName = 'Desconhecido';
          try {
            const userDoc = await getDoc(doc(firestore, 'users', user.uid));
            if (userDoc.exists()) {
              userName = userDoc.data().name || user.displayName || 'Desconhecido';
            }
          } catch (e) {
            console.error('Error getting user name:', e);
          }
          
          // Create document in Firestore for email notification
          await addDoc(collection(db, 'relatorios'), {
            nome: userName,
            userId: user.uid,
            fileName: file.name,
            fileUrl: url,
            uploadedAt: new Date().toISOString()
          });
          
          return { 
            name: file.name, 
            url: url,
            uploadedBy: user.uid,
            uploadedByUid: user.uid,
            uploadedAt: new Date().toISOString(),
            uploadDate: new Date(),
            year: new Date().getFullYear(),
            month: new Date().getMonth()
          };
        } catch (uploadError) {
          console.error('Error uploading file:', uploadError);
          throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
        }
      });
      
      const uploadedFiles = await Promise.all(uploadPromises);
      console.log(uploadedFiles);
      setPdfFiles((prevFiles) => [...prevFiles, ...uploadedFiles]);
      setSuccess('Files uploaded successfully!');
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message || 'Error uploading files');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async () => {
    const fileToDelete = pdfFiles[deleteIndex];
    const fileRef = ref(storage, `pdfs/${fileToDelete.name}`);
    setLoading(true);
    setError(null);

    try {
      const user = auth.currentUser;
      if (!isAdmin && fileToDelete.uploadedBy !== user.uid) {
        throw new Error('You can only delete your own files');
      }

      await deleteObject(fileRef);
      setPdfFiles((prevFiles) => prevFiles.filter((_, i) => i !== deleteIndex));
      setSuccess('File deleted successfully!');
    } catch (error) {
      setError(error.message || 'Error deleting file');
      console.error("Error deleting from Firebase:", error);
    } finally {
      setLoading(false);
      setDeleteIndex(null);
    }
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

  const handleOpenUploadDialog = () => setOpenUploadDialog(true);
  const handleCloseUploadDialog = () => { setOpenUploadDialog(false); setSelectedFiles([]); };
  const handleFileSelect = (event) => setSelectedFiles(Array.from(event.target.files));
  const handleUploadSelectedFiles = async () => {
    if (selectedFiles.length === 0) return;
    await handleFileUpload({ target: { files: selectedFiles } });
    handleCloseUploadDialog();
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', padding: 2, position: 'relative', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2, px: 2, mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main', fontFamily: 'Poppins, sans-serif', ml: 0 }}>
          {t('reports')}
        </Typography>
        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenUploadDialog}
            sx={{ fontWeight: 'bold' }}
          >
            {t('newPDF')}
          </Button>
        </motion.div>
      </Box>
      {/* Search Filters */}
      <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterList /> {t('searchFilters')}
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('person')}</InputLabel>
              <Select
                value={searchFilters.person}
                label={t('person')}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, person: e.target.value }))}
              >
                <MenuItem value="">{t('all')}</MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.name}>
                    {user.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('year')}</InputLabel>
              <Select
                value={searchFilters.year}
                label={t('year')}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, year: e.target.value }))}
              >
                <MenuItem value="">{t('all')}</MenuItem>
                {years.map((year) => (
                  <MenuItem key={year} value={year}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth size="small">
              <InputLabel>{t('month')}</InputLabel>
              <Select
                value={searchFilters.month}
                label={t('month')}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, month: e.target.value }))}
              >
                <MenuItem value="">{t('all')}</MenuItem>
                {months.map((month, index) => (
                  <MenuItem key={index} value={index}>
                    {t('month_' + month.toLowerCase())}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>
      
      {filteredFiles.length > 0 ? (
        <>
          <Grid container spacing={2}>
            {filteredFiles
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((fileObj, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Card sx={{ maxWidth: 345, borderRadius: 2, boxShadow: 2 }}>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary" noWrap>
                        {fileObj.name || `Document ${index + 1}`}
                      </Typography>
                      {isAdmin && (
                        <>
                          <Typography variant="caption" color="text.secondary">
                            {t('uploadedBy')}: {fileObj.uploadedBy}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {t('date')}: {new Date(fileObj.uploadedAt).toLocaleString()}
                          </Typography>
                        </>
                      )}
                    </CardContent>
                    <CardMedia sx={{ height: 200, overflow: 'hidden' }}>
                      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                        <Viewer
                          fileUrl={fileObj.url}
                          onError={(error) => {
                            console.error('PDF Viewer Error:', error);
                            setError('Error loading PDF preview');
                          }}
                        />
                      </Worker>
                    </CardMedia>
                    <CardActions>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={() => setDeleteIndex(index)}
                        sx={{ marginLeft: 'auto' }}
                        disabled={loading}
                      >
                        Delete
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
          </Grid>
          <TablePagination
            component="div"
            count={filteredFiles.length}
            page={page}
            onPageChange={handleChangePage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            rowsPerPageOptions={[6, 12, 24]}
            labelRowsPerPage={t('rowsPerPage')}
            sx={{
              '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': {
                lineHeight: '32px',
                verticalAlign: 'middle',
              },
              '& .MuiInputBase-root': {
                verticalAlign: 'middle',
                marginTop: '-6px',
                transform: 'translateY(-2px)',
              }
            }}
          />
        </>
      ) : (
        <Typography variant="body1" color="textSecondary" sx={{ textAlign: 'center', mt: 4 }}>
          {t('noPdfFilesFound')}
        </Typography>
      )}

      <Dialog 
        open={deleteIndex !== null} 
        onClose={() => setDeleteIndex(null)}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this file? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteIndex(null)} 
            color="primary" 
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteFile} 
            color="error" 
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success/Error Messages */}
      <Snackbar 
        open={!!success} 
        autoHideDuration={4000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="success">
          {success}
        </Alert>
      </Snackbar>

      <Snackbar 
        open={!!error} 
        autoHideDuration={4000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity="error">
          {error}
        </Alert>
      </Snackbar>

      <Snackbar open={showAdminSnackbar} autoHideDuration={4000} onClose={() => setShowAdminSnackbar(false)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
        <Alert onClose={() => setShowAdminSnackbar(false)} severity="info" sx={{ width: '100%' }}>
          You are logged in as admin.
        </Alert>
      </Snackbar>

      {/* Dialog para upload de PDF */}
      <Dialog open={openUploadDialog} onClose={handleCloseUploadDialog} maxWidth="xs" fullWidth>
        <DialogTitle>Upload PDF</DialogTitle>
        <DialogContent>
          <Button
            variant="outlined"
            component="label"
            fullWidth
            sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}
            startIcon={<PictureAsPdf sx={{ color: '#1a237e' }} />}
          >
            {t('attachReport')}
            <input
              type="file"
              accept="application/pdf"
              multiple
              hidden
              onChange={handleFileSelect}
            />
          </Button>
          {selectedFiles.length > 0 && (
            <Box sx={{ mt: 1 }}>
              {selectedFiles.map((file, idx) => (
                <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                  <PictureAsPdf sx={{ color: '#d32f2f' }} />
                  <Typography variant="body2">{file.name}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUploadDialog}>Cancel</Button>
          <Button onClick={handleUploadSelectedFiles} variant="contained" disabled={selectedFiles.length === 0 || loading}>
            {loading ? <CircularProgress size={20} /> : t('upload')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Relatorios;
