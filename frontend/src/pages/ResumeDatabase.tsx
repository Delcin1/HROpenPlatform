import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Container,
  Box,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Alert,
  Chip,
  Card,
  CardContent,
  Grid,
  Divider,
  IconButton,
  Collapse,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  CloudUpload as CloudUploadIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Person as PersonIcon,
  Description as DescriptionIcon,
  AccessTime as AccessTimeIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { CvService } from '../api/cv';
import type { ResumeRecord, UploadDatabaseResponse } from '../api/cv';

export const ResumeDatabase = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadDatabaseResponse | null>(null);

  const queryClient = useQueryClient();

  // Загрузка существующих резюме
  const { data: resumes, isLoading, error } = useQuery<ResumeRecord[]>({
    queryKey: ['resumeDatabase'],
    queryFn: () => CvService.getResumeDatabase(),
  });

  // Мутация для загрузки архива
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
       return CvService.uploadResumeDatabase({ archive: file });
    },
    onSuccess: (data) => {
      setUploadResult(data);
      setUploadDialogOpen(true);
      setSelectedFile(null);
      queryClient.invalidateQueries({ queryKey: ['resumeDatabase'] });
    },
  });

  const handleFileSelect = useCallback((file: File) => {
    if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
      setSelectedFile(file);
    } else {
      alert('Пожалуйста, выберите ZIP файл');
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };

  const toggleRowExpansion = (resumeId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(resumeId)) {
      newExpanded.delete(resumeId);
    } else {
      newExpanded.add(resumeId);
    }
    setExpandedRows(newExpanded);
  };

  const handleOpenResume = (fileUrl: string) => {
    window.open(fileUrl, '_blank');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Заголовок */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
          База резюме
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Загрузите архив с резюме кандидатов для автоматического анализа и подбора
        </Typography>
      </Box>

      {/* Область загрузки */}
      <Paper sx={{ p: 4, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Загрузить базу резюме
        </Typography>
        
        <Box
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          sx={{
            border: 2,
            borderStyle: 'dashed',
            borderColor: isDragOver ? 'primary.main' : 'grey.300',
            borderRadius: 2,
            p: 4,
            textAlign: 'center',
            backgroundColor: isDragOver ? 'action.hover' : 'background.paper',
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            mb: 2,
          }}
        >
          <input
            type="file"
            accept=".zip"
            onChange={handleFileChange}
            style={{ display: 'none' }}
            id="file-upload"
          />
          <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'block', width: '100%' }}>
            <CloudUploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {selectedFile ? selectedFile.name : 'Перетащите ZIP архив сюда или нажмите для выбора'}
            </Typography>
            <Typography color="text.secondary">
              Поддерживаются файлы: PDF, TXT, DOC, DOCX
            </Typography>
          </label>
        </Box>

        {selectedFile && (
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="contained"
              onClick={handleUpload}
              disabled={uploadMutation.isPending}
              startIcon={uploadMutation.isPending ? <CircularProgress size={20} /> : <CloudUploadIcon />}
            >
              {uploadMutation.isPending ? 'Загрузка...' : 'Загрузить и анализировать'}
            </Button>
            <Button variant="outlined" onClick={() => setSelectedFile(null)}>
              Отменить
            </Button>
          </Box>
        )}

        {uploadMutation.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Ошибка при загрузке: {uploadMutation.error?.message || 'Неизвестная ошибка'}
          </Alert>
        )}
      </Paper>

      {/* Статистика */}
      {resumes && resumes.length > 0 && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <PersonIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography variant="h4" component="div" color="primary">
                  {resumes.length}
                </Typography>
                <Typography color="text.secondary">
                  Всего резюме
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <DescriptionIcon sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                <Typography variant="h4" component="div" color="success.main">
                  {resumes.filter(r => r.analysis).length}
                </Typography>
                <Typography color="text.secondary">
                  Проанализировано
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center' }}>
                <AccessTimeIcon sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                <Typography variant="h4" component="div" color="info.main">
                  {resumes.length > 0 ? Math.round(resumes.reduce((sum, r) => {
                    const years = parseInt(r.experience_years.match(/\d+/)?.[0] || '0');
                    return sum + years;
                  }, 0) / resumes.length) : 0}
                </Typography>
                <Typography color="text.secondary">
                  Средний опыт (лет)
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Список резюме */}
      {error && (
        <Alert severity="error" sx={{ mb: 4 }}>
          Ошибка при загрузке резюме: {error.message}
        </Alert>
      )}

      {resumes && resumes.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <PersonIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            База резюме пуста
          </Typography>
          <Typography color="text.secondary">
            Загрузите архив с резюме для начала работы
          </Typography>
        </Paper>
      )}

      {resumes && resumes.length > 0 && (
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Кандидат</TableCell>
                  <TableCell>Возраст</TableCell>
                  <TableCell>Опыт</TableCell>
                  <TableCell>Дата добавления</TableCell>
                  <TableCell>Действия</TableCell>
                  <TableCell width={50}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resumes.map((resume) => (
                  <React.Fragment key={resume.id}>
                    <TableRow hover>
                      <TableCell>
                        <Typography variant="subtitle2" fontWeight="medium">
                          {resume.candidate_name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {resume.candidate_age ? (
                          <Chip label={`${resume.candidate_age} лет`} size="small" />
                        ) : (
                          <Typography color="text.secondary">Не указан</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip label={resume.experience_years} size="small" color="primary" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {formatDate(resume.created_at)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          onClick={() => handleOpenResume(resume.file_url)}
                          size="small"
                          title="Открыть резюме"
                        >
                          <OpenInNewIcon />
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          onClick={() => toggleRowExpansion(resume.id)}
                          size="small"
                        >
                          {expandedRows.has(resume.id) ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                        </IconButton>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell colSpan={6} sx={{ py: 0 }}>
                        <Collapse in={expandedRows.has(resume.id)} timeout="auto" unmountOnExit>
                          <Box sx={{ p: 2, backgroundColor: 'grey.50' }}>
                            <Typography variant="subtitle2" gutterBottom>
                              Анализ резюме:
                            </Typography>
                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                              {resume.analysis}
                            </Typography>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {/* Диалог результатов загрузки */}
      <Dialog open={uploadDialogOpen} onClose={() => setUploadDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Результаты загрузки</DialogTitle>
        <DialogContent>
          {uploadResult && (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="primary">
                        {uploadResult.processed_count}
                      </Typography>
                      <Typography color="text.secondary">
                        Обработано файлов
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="success.main">
                        {uploadResult.successful_count}
                      </Typography>
                      <Typography color="text.secondary">
                        Успешно
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={4}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" color="error.main">
                        {uploadResult.failed_count}
                      </Typography>
                      <Typography color="text.secondary">
                        Ошибок
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" gutterBottom>
                Добавленные резюме:
              </Typography>
              {uploadResult.resumes.map((resume) => (
                <Box key={resume.id} sx={{ mb: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="subtitle2" fontWeight="medium">
                    {resume.candidate_name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {resume.experience_years} • {resume.candidate_age ? `${resume.candidate_age} лет` : 'Возраст не указан'}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUploadDialogOpen(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}; 