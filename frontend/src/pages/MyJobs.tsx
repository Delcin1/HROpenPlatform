import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  Pagination,
  Container,
  Stack,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Add as AddIcon,
  LocationOn as LocationIcon,
  Business as BusinessIcon,
  Payment as PaymentIcon,
  People as PeopleIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Pause as PauseIcon,
  PlayArrow as PlayArrowIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { JobService } from '../api/job/services/JobService';
import type { JobWithApplications } from '../api/job/models/JobWithApplications';

export const MyJobs = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobWithApplications[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobWithApplications | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const limit = 20;

  const loadMyJobs = async (pageNum = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const offset = (pageNum - 1) * limit;
      const response = await JobService.getMyJobs(limit, offset);
      
      setJobs(response);
      setTotalPages(Math.ceil(response.length / limit) || 1);
    } catch (err) {
      console.error('Error loading my jobs:', err);
      setError('Ошибка загрузки ваших вакансий');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMyJobs(page);
  }, [page]);

  const handleCreateJob = () => {
    navigate('/jobs/new');
  };

  const handleViewJob = (jobId: string) => {
    navigate(`/jobs/${jobId}`);
  };

  const handleEditJob = (jobId: string) => {
    navigate(`/jobs/edit/${jobId}`);
  };

  const handleDeleteJob = async () => {
    if (!selectedJob) return;

    try {
      await JobService.deleteJob(selectedJob.job.id);
      setDeleteDialogOpen(false);
      setSelectedJob(null);
      await loadMyJobs(page);
    } catch (err) {
      console.error('Error deleting job:', err);
      setError('Ошибка удаления вакансии');
    }
  };

  const handleToggleJobStatus = async (job: JobWithApplications, newStatus: 'active' | 'paused') => {
    try {
      await JobService.updateJob(job.job.id, {
        ...job.job,
        status: newStatus as any,
      });
      await loadMyJobs(page);
    } catch (err) {
      console.error('Error updating job status:', err);
      setError('Ошибка изменения статуса вакансии');
    }
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, job: JobWithApplications) => {
    setAnchorEl(event.currentTarget);
    setSelectedJob(job);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedJob(null);
  };

  const formatSalary = (salaryFrom?: number, salaryTo?: number) => {
    if (!salaryFrom && !salaryTo) return 'З/п не указана';
    if (salaryFrom && salaryTo) return `${salaryFrom.toLocaleString()} - ${salaryTo.toLocaleString()} ₽`;
    if (salaryFrom) return `от ${salaryFrom.toLocaleString()} ₽`;
    if (salaryTo) return `до ${salaryTo.toLocaleString()} ₽`;
    return 'З/п не указана';
  };

  const getEmploymentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'full-time': 'Полная занятость',
      'part-time': 'Частичная занятость',
      'contract': 'Контракт',
      'internship': 'Стажировка',
      'remote': 'Удаленная работа',
    };
    return labels[type] || type;
  };

  const getEmploymentTypeColor = (type: string) => {
    const colors: Record<string, 'primary' | 'secondary' | 'success' | 'info' | 'warning'> = {
      'full-time': 'primary',
      'part-time': 'secondary',
      'contract': 'info',
      'internship': 'warning',
      'remote': 'success',
    };
    return colors[type] || 'primary';
  };

  const getStatusChip = (status: string) => {
    const statusConfig = {
      active: { label: 'Активна', color: 'success' as const },
      paused: { label: 'На паузе', color: 'warning' as const },
      closed: { label: 'Закрыта', color: 'default' as const },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    return <Chip label={config.label} color={config.color} size="small" />;
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Typography variant="h4" component="h1">
          Мои вакансии
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateJob}
        >
          Создать вакансию
        </Button>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading */}
      {loading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}

      {/* Jobs List */}
      {!loading && (
        <Grid container spacing={3}>
          {jobs.map((jobWithApplications) => {
            const { job, applications_count } = jobWithApplications;
            return (
              <Grid item xs={12} key={job.id}>
                <Card>
                  <CardContent>
                    <Stack spacing={2}>
                      {/* Header */}
                      <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                        <Box flex={1}>
                          <Box display="flex" alignItems="center" gap={2} mb={1}>
                            <Typography variant="h6" component="h2">
                              {job.title}
                            </Typography>
                            {getStatusChip(job.status)}
                          </Box>
                          <Box display="flex" alignItems="center" gap={1} mb={1}>
                            <BusinessIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              {job.company_name}
                            </Typography>
                          </Box>
                          <Box display="flex" alignItems="center" gap={1}>
                            <LocationIcon fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              {job.location}
                            </Typography>
                          </Box>
                        </Box>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Box textAlign="center">
                            <Badge badgeContent={applications_count} color="primary">
                              <PeopleIcon color="action" />
                            </Badge>
                            <Typography variant="caption" display="block" color="text.secondary">
                              Откликов
                            </Typography>
                          </Box>
                          <IconButton
                            onClick={(e) => handleMenuClick(e, jobWithApplications)}
                          >
                            <MoreVertIcon />
                          </IconButton>
                        </Box>
                      </Box>

                      {/* Details */}
                      <Box display="flex" gap={2} flexWrap="wrap">
                        <Chip
                          label={getEmploymentTypeLabel(job.employment_type)}
                          color={getEmploymentTypeColor(job.employment_type)}
                          size="small"
                        />
                        <Box display="flex" alignItems="center" gap={1}>
                          <PaymentIcon fontSize="small" color="action" />
                          <Typography variant="body2" color="text.secondary">
                            {formatSalary(job.salary_from || undefined, job.salary_to || undefined)}
                          </Typography>
                        </Box>
                      </Box>

                      {/* Description Preview */}
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                        }}
                      >
                        {job.description}
                      </Typography>

                      {/* Date */}
                      <Typography variant="caption" color="text.secondary">
                        Создано: {new Date(job.created_at).toLocaleDateString('ru-RU')}
                        {job.updated_at !== job.created_at && (
                          <> • Обновлено: {new Date(job.updated_at).toLocaleDateString('ru-RU')}</>
                        )}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Empty State */}
      {!loading && jobs.length === 0 && (
        <Box textAlign="center" py={8}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            У вас пока нет опубликованных вакансий
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Создайте первую вакансию чтобы начать поиск сотрудников
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateJob}
          >
            Создать вакансию
          </Button>
        </Box>
      )}

      {/* Pagination */}
      {!loading && jobs.length > 0 && totalPages > 1 && (
        <Box display="flex" justifyContent="center" mt={4}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          if (selectedJob) handleViewJob(selectedJob.job.id);
          handleMenuClose();
        }}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Просмотреть</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          if (selectedJob) handleEditJob(selectedJob.job.id);
          handleMenuClose();
        }}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Редактировать</ListItemText>
        </MenuItem>
        {selectedJob?.job.status === 'active' && (
          <MenuItem onClick={() => {
            if (selectedJob) handleToggleJobStatus(selectedJob, 'paused');
            handleMenuClose();
          }}>
            <ListItemIcon>
              <PauseIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Поставить на паузу</ListItemText>
          </MenuItem>
        )}
        {selectedJob?.job.status === 'paused' && (
          <MenuItem onClick={() => {
            if (selectedJob) handleToggleJobStatus(selectedJob, 'active');
            handleMenuClose();
          }}>
            <ListItemIcon>
              <PlayArrowIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Активировать</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => {
          setDeleteDialogOpen(true);
          handleMenuClose();
        }}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Удалить</ListItemText>
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Удалить вакансию</DialogTitle>
        <DialogContent>
          <Typography>
            Вы уверены, что хотите удалить вакансию "{selectedJob?.job.title}"?
            Это действие нельзя отменить.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Отмена</Button>
          <Button onClick={handleDeleteJob} color="error" variant="contained">
            Удалить
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}; 