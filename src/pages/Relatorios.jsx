import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Grid, Typography, Button, Dialog,
  DialogActions, DialogContent, DialogContentText,
  DialogTitle, Card, CardContent, CardMedia, CardActions,
  CircularProgress, Alert, Snackbar, FormControl,
  InputLabel, Select, MenuItem, TablePagination, Skeleton, IconButton, Tooltip
} from "@mui/material";
import { Worker, Viewer } from '@react-pdf-viewer/core';
import '@react-pdf-viewer/core/lib/styles/index.css';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll, getMetadata } from "firebase/storage";
import { storage } from '../FirebaseConfig';
import { getAuth } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { db } from '../FirebaseConfig';
import { Add as AddIcon, PictureAsPdf, Download as DownloadIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const CARD_WIDTH = 360;
const CARD_HEIGHT = 360;
const REPORTS_YEAR = 2026;

const normalizeReportDate = (dateInput) => {
  const parsed = new Date(dateInput || Date.now());
  const safeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  safeDate.setFullYear(REPORTS_YEAR);
  return safeDate;
};

const Relatorios = () => {
  const [pdfFiles, setPdfFiles] = useState([]);
  const [filteredFiles, setFilteredFiles] = useState([]);
  const [fileToDelete, setFileToDelete] = useState(null);
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
      const userQuery = await getDocs(query(collection(db, 'users'), where('email', '==', user.email)));
      if (userQuery.empty) {
        return false;
      }
      const userData = userQuery.docs[0].data();
      return userData.isAdmin === true;
    } catch (error) {
      console.error('Error checking admin role:', error);
      return false;
    }
  }, []);

  const loadUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users'));
      const usersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
      return usersData;
    } catch (error) {
      console.error('Error loading users:', error);
      return [];
    }
  };

  const fetchPdfFiles = useCallback(async (adminStatus = isAdmin, usersData = []) => {
    setLoading(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error(t('mustBeLoggedInViewFiles'));
      }

      const storageRef = ref(storage, 'pdfs');
      const listAllFilesRecursively = async (folderRef) => {
        const result = await listAll(folderRef);
        const nestedFiles = await Promise.all(result.prefixes.map((prefixRef) => listAllFilesRecursively(prefixRef)));
        return [...result.items, ...nestedFiles.flat()];
      };
      const allItemRefs = await listAllFilesRecursively(storageRef);
      const usersByUid = new Map(usersData.map((userItem) => [userItem.uid, userItem.name]));
      const reportsSnapshot = await getDocs(collection(db, 'relatorios'));
      const reportsByUrl = new Map();
      const reportsByOriginalName = new Map();
      const reportsByUserId = new Map();

      reportsSnapshot.docs.forEach((reportDoc) => {
        const reportData = reportDoc.data();
        if (reportData.fileUrl && reportData.nome) {
          reportsByUrl.set(reportData.fileUrl, reportData.nome);
        }
        if (reportData.fileName && reportData.nome) {
          reportsByOriginalName.set(reportData.fileName, reportData.nome);
        }
        if (reportData.userId && reportData.nome) {
          reportsByUserId.set(reportData.userId, reportData.nome);
        }
      });
      
      const filePromises = allItemRefs.map(async (itemRef) => {
        try {
          const url = await getDownloadURL(itemRef);
          const metadata = await getMetadata(itemRef);
          const pathParts = itemRef.fullPath.split('/');
          const uploadedByUidFromPath = pathParts.length > 2 ? pathParts[1] : t('unknown');
          const uploadedByUid = metadata.customMetadata?.uploadedBy || uploadedByUidFromPath || t('unknown');
          const uploadedByNameFromMetadata = metadata.customMetadata?.uploadedByName;
          const inferredOriginalName = itemRef.name.includes('_') ? itemRef.name.substring(itemRef.name.indexOf('_') + 1) : itemRef.name;
          let uploadedByName = uploadedByNameFromMetadata
            || usersByUid.get(uploadedByUid)
            || reportsByUserId.get(uploadedByUid)
            || reportsByOriginalName.get(inferredOriginalName)
            || t('unknown');

          // Fallback lookup in Firestore only if local cache did not resolve
          if (uploadedByName === t('unknown') && uploadedByUid !== t('unknown')) {
            try {
              const userQuery = await getDocs(query(collection(db, 'users'), where('uid', '==', uploadedByUid)));
              if (!userQuery.empty) {
                uploadedByName = userQuery.docs[0].data().name || t('unknown');
              }
            } catch (e) {
              // Ignore and keep translated unknown
            }
          }

          const uploadDate = normalizeReportDate(metadata.customMetadata?.uploadedAt || Date.now());
          const uploadedAt = uploadDate.toISOString();

          if (uploadedByName === t('unknown')) {
            uploadedByName = reportsByUrl.get(url)
              || reportsByOriginalName.get(inferredOriginalName)
              || reportsByUserId.get(uploadedByUid)
              || t('unknown');
          }
          
          return {
            name: itemRef.name,
            fullPath: itemRef.fullPath,
            url: url,
            uploadedBy: uploadedByName,
            uploadedByUid: uploadedByUid,
            uploadedAt,
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
      
      if (adminStatus) {
        setPdfFiles(files);
        setFilteredFiles(files);
      } else {
        const userFiles = files.filter(file => file.uploadedByUid === user.uid);
        setPdfFiles(userFiles);
        setFilteredFiles(userFiles);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      setError(error.message || t('errorLoadingPdfFiles'));
    } finally {
      setLoading(false);
    }
  }, [auth, isAdmin, t]);

  useEffect(() => {
    const initializeUser = async () => {
      const user = auth.currentUser;
      if (!user) {
        navigate('/login');
        return;
      }

      const adminStatus = await checkAdminRole(user);
      setIsAdmin(adminStatus);
      const usersData = await loadUsers();
      await fetchPdfFiles(adminStatus, usersData);
    };

    const unsubscribe = auth.onAuthStateChanged(initializeUser);
    return () => unsubscribe();
  }, [auth, checkAdminRole, fetchPdfFiles, navigate]);

  useEffect(() => {
    if (localStorage.getItem('adminJustLoggedIn') === 'true') {
      setShowAdminSnackbar(true);
      localStorage.removeItem('adminJustLoggedIn');
    }
  }, []);

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

    filtered = [...filtered].sort((a, b) => b.uploadDate.getTime() - a.uploadDate.getTime());

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
        throw new Error(t('mustBeLoggedInUploadFiles'));
      }

      // Validate file sizes
      const invalidFiles = files.filter(file => file.size > MAX_FILE_SIZE);
      if (invalidFiles.length > 0) {
        throw new Error(t('filesExceedMaxSize', { size: MAX_FILE_SIZE / (1024 * 1024) }));
      }

      const uploadPromises = files.map(async (file) => {
        const uniqueName = `${Date.now()}_${file.name}`;
        const storageRef = ref(storage, `pdfs/${user.uid}/${uniqueName}`);

        // Get user name from Firestore
        let userName = user.displayName || user.email?.split('@')[0] || t('unknown');
        try {
          const userQuery = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)));
          if (!userQuery.empty) {
            userName = userQuery.docs[0].data().name || user.displayName || t('unknown');
          }
        } catch (e) {
          console.error('Error getting user name:', e);
        }

        const uploadDate = normalizeReportDate(new Date());
        const metadata = {
          contentType: 'application/pdf',
          customMetadata: {
            uploadedBy: user.uid,
            uploadedByName: userName,
            uploadedAt: uploadDate.toISOString()
          }
        };
        
        try {
          const snapshot = await uploadBytes(storageRef, file, metadata);
          const url = await getDownloadURL(snapshot.ref);

          // Create document in Firestore for email notification
          await addDoc(collection(db, 'relatorios'), {
            nome: userName,
            userId: user.uid,
            fileName: file.name,
            fileUrl: url,
            uploadedAt: uploadDate.toISOString()
          });
          
          return { 
            name: uniqueName,
            fullPath: snapshot.ref.fullPath,
            originalName: file.name,
            url: url,
            uploadedBy: userName,
            uploadedByUid: user.uid,
            uploadedAt: uploadDate.toISOString(),
            uploadDate: uploadDate,
            year: uploadDate.getFullYear(),
            month: uploadDate.getMonth()
          };
        } catch (uploadError) {
          console.error('Error uploading file:', uploadError);
          throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
        }
      });
      
      const uploadedFiles = await Promise.all(uploadPromises);
      setPdfFiles((prevFiles) => [...prevFiles, ...uploadedFiles]);
      setSuccess(t('filesUploadedSuccessfully'));
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message || t('errorUploadingFiles'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async () => {
    if (!fileToDelete) return;
    setLoading(true);
    setError(null);

    try {
      const user = auth.currentUser;
      if (!isAdmin && fileToDelete.uploadedByUid !== user.uid) {
        throw new Error(t('onlyDeleteOwnFiles'));
      }

      const fileRef = fileToDelete.fullPath
        ? ref(storage, fileToDelete.fullPath)
        : ref(storage, fileToDelete.url);
      await deleteObject(fileRef);
      setPdfFiles((prevFiles) => prevFiles.filter((file) => !(file.name === fileToDelete.name && file.uploadedByUid === fileToDelete.uploadedByUid)));
      setSuccess(t('fileDeletedSuccessfully'));
    } catch (error) {
      setError(error.message || t('errorDeletingFile'));
      console.error("Error deleting from Firebase:", error);
    } finally {
      setLoading(false);
      setFileToDelete(null);
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

  const handleDownloadFile = async (fileObj) => {
    try {
      const response = await fetch(fileObj.url);
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileObj.originalName || fileObj.name || 'report.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (downloadError) {
      setError(t('errorDownloadingFile'));
    }
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
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: 2, mb: 3 }}>
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
      <Box sx={{ mb: 3, p: 3, bgcolor: 'background.paper', borderRadius: 1, boxShadow: 1 }}>
        <Grid container spacing={2} justifyContent="center" alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="medium" sx={{ minWidth: 260 }}>
              <InputLabel>{t('person')}</InputLabel>
              <Select
                value={searchFilters.person}
                label={t('person')}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, person: e.target.value }))}
              >
                <MenuItem value="">{t('all')}</MenuItem>
                {users.map((user) => (
                  <MenuItem key={user.id} value={user.name} sx={{ whiteSpace: 'normal' }}>
                    {user.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="medium" sx={{ minWidth: 260 }}>
              <InputLabel>{t('year')}</InputLabel>
              <Select
                value={searchFilters.year}
                label={t('year')}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, year: e.target.value }))}
              >
                <MenuItem value="">{t('all')}</MenuItem>
                {years.map((year) => (
                  <MenuItem key={year} value={year} sx={{ whiteSpace: 'normal' }}>
                    {year}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="medium" sx={{ minWidth: 260 }}>
              <InputLabel>{t('month')}</InputLabel>
              <Select
                value={searchFilters.month}
                label={t('month')}
                onChange={(e) => setSearchFilters(prev => ({ ...prev, month: e.target.value }))}
              >
                <MenuItem value="">{t('all')}</MenuItem>
                {months.map((month, index) => (
                  <MenuItem key={index} value={index} sx={{ whiteSpace: 'normal' }}>
                    {t('month_' + month.toLowerCase())}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>
      
      {loading && filteredFiles.length === 0 ? (
        <Grid container spacing={2}>
          {Array.from({ length: 6 }).map((_, idx) => (
            <Grid item xs={12} sm={6} md={4} key={idx}>
              <Skeleton variant="rounded" height={300} />
            </Grid>
          ))}
        </Grid>
      ) : filteredFiles.length > 0 ? (
        <>
          <Grid container spacing={2} justifyContent="center">
            {filteredFiles
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((fileObj, index) => (
                <Grid item xs={12} sm={6} md={4} key={index} sx={{ display: 'flex', justifyContent: 'center' }}>
                  <Card sx={{ width: `${CARD_WIDTH}px`, minWidth: `${CARD_WIDTH}px`, maxWidth: `${CARD_WIDTH}px`, borderRadius: 2, boxShadow: 2, height: `${CARD_HEIGHT}px`, minHeight: `${CARD_HEIGHT}px`, maxHeight: `${CARD_HEIGHT}px`, display: 'flex', flexDirection: 'column' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" sx={{ color: 'primary.main', fontWeight: 'bold', mb: 0 }}>
                        {fileObj.originalName || fileObj.name || t('documentN', { index: index + 1 })}
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
                    <CardMedia sx={{ height: 150, overflow: 'hidden' }}>
                      <Worker workerUrl="https://unpkg.com/pdfjs-dist@3.4.120/build/pdf.worker.min.js">
                        <Viewer
                          fileUrl={fileObj.url}
                          onError={(error) => {
                            console.error('PDF Viewer Error:', error);
                            setError(t('errorLoadingPdfPreview'));
                          }}
                        />
                      </Worker>
                    </CardMedia>
                    <CardActions>
                      <Button
                        variant="outlined"
                        startIcon={<DownloadIcon />}
                        onClick={() => handleDownloadFile(fileObj)}
                        disabled={loading}
                      >
                        {t('download')}
                      </Button>
                      <Tooltip title={t('delete')}>
                        <span style={{ marginLeft: 'auto' }}>
                          <IconButton
                            size="small"
                            onClick={() => setFileToDelete(fileObj)}
                            disabled={loading}
                            sx={{
                              color: '#d32f2f',
                              '&:hover': {
                                backgroundColor: 'rgba(211, 47, 47, 0.04)',
                              },
                            }}
                          >
                            <DeleteIcon sx={{ fontSize: '1.2rem' }} />
                          </IconButton>
                        </span>
                      </Tooltip>
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
        </>
      ) : (
        <Typography variant="body1" color="textSecondary" sx={{ textAlign: 'center', mt: 4 }}>
          {t('noReportsFound')}
        </Typography>
      )}

      <Dialog 
        open={Boolean(fileToDelete)} 
        onClose={() => setFileToDelete(null)}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'primary.main' }}>{t('confirmDeletion')}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t('confirmDeleteFileText')}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setFileToDelete(null)} 
            color="primary" 
            disabled={loading}
          >
            {t('cancel')}
          </Button>
          <Button 
            onClick={handleDeleteFile} 
            color="error" 
            variant="contained"
            sx={{ fontWeight: 'bold' }}
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : t('delete')}
          </Button>
        </DialogActions>
      </Dialog>

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

      {/* Dialog para upload de PDF */}
      <Dialog open={openUploadDialog} onClose={handleCloseUploadDialog} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: 'primary.main' }}>{t('uploadPdf')}</DialogTitle>
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
                  <PictureAsPdf color="primary" />
                  <Typography variant="body2">{file.name}</Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseUploadDialog}>{t('cancel')}</Button>
          <Button onClick={handleUploadSelectedFiles} variant="contained" sx={{ fontWeight: 'bold' }} disabled={selectedFiles.length === 0 || loading}>
            {loading ? <CircularProgress size={20} /> : t('upload')}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default Relatorios;
